import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { API_ANALYSIS } from "./analysis-resource.js";
import { catalogByCategory, ENDPOINT_CATALOG } from "./catalog.js";
import { NaverCommerceApiError, NaverCommerceClient, isReadOnlyRequest } from "./client.js";
import { publicConfig } from "./config.js";
import type {
  HttpMethod,
  JsonValue,
  NaverCommerceConfig,
  QueryParams,
} from "./types.js";

const jsonRecordSchema = z.record(z.unknown()).optional();
const querySchema = z.record(
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  ]),
).optional();

export function createServer(
  config: NaverCommerceConfig,
  client = new NaverCommerceClient(config),
): McpServer {
  const server = new McpServer(
    { name: "naver-commerce-mcp", version: "1.0.0" },
    {
      instructions:
        "Use read-only tools first. Before any mutation, retrieve the current resource state, explain the intended change, and require the user to confirm. Mutations are disabled unless the server operator explicitly enables them.",
    },
  );

  server.registerTool(
    "naver_commerce_health",
    {
      title: "NAVER Commerce configuration health",
      description:
        "Shows whether credentials are configured and whether mutation mode is enabled. Secret values are never returned.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => ok({
      server: "naver-commerce-mcp",
      version: "1.0.0",
      config: publicConfig(config),
      tokenCache: client.tokens.getCachedMetadata(),
    }),
  );

  server.registerTool(
    "naver_commerce_endpoint_catalog",
    {
      title: "NAVER Commerce endpoint catalog",
      description:
        "Returns a curated catalog of important official endpoints. Omit category to list every catalog entry.",
      inputSchema: {
        category: z
          .enum(["auth", "seller", "products", "categories", "orders", "logistics"])
          .optional(),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ category }) => ok(catalogByCategory(category)),
  );

  server.registerTool(
    "naver_commerce_request",
    {
      title: "Call a read-only NAVER Commerce endpoint",
      description:
        "Calls GET endpoints and a small allow-list of documented read-only POST endpoints. Paths must start with /v1/ or /v2/.",
      inputSchema: {
        method: z.enum(["GET", "POST"]).default("GET"),
        path: z.string().min(4).describe("Relative path such as /v1/seller/account"),
        query: querySchema,
        body: jsonRecordSchema,
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ method, path, query, body }) => {
      const normalized = method as HttpMethod;
      if (!isReadOnlyRequest(normalized, path)) {
        return fail(
          "This POST path is not in the read-only allow-list. Use naver_commerce_execute_mutation only after explicit authorization.",
        );
      }
      return callApi(client, {
        method: normalized,
        path,
        query: query as QueryParams | undefined,
        body: body as JsonValue | undefined,
        safeToRetry: true,
      });
    },
  );

  server.registerTool(
    "naver_commerce_get_account",
    {
      title: "Get seller account",
      description: "GET /v1/seller/account",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => callApi(client, { method: "GET", path: "/v1/seller/account" }),
  );

  server.registerTool(
    "naver_commerce_get_channels",
    {
      title: "Get seller channels",
      description: "GET /v1/seller/channels",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => callApi(client, { method: "GET", path: "/v1/seller/channels" }),
  );

  server.registerTool(
    "naver_commerce_search_products",
    {
      title: "Search products",
      description:
        "POST /v1/products/search. Pass the request object exactly as defined by the current official API documentation.",
      inputSchema: { request: z.record(z.unknown()) },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ request }) =>
      callApi(client, {
        method: "POST",
        path: "/v1/products/search",
        body: request as JsonValue,
        safeToRetry: true,
      }),
  );

  server.registerTool(
    "naver_commerce_get_origin_product",
    {
      title: "Get origin product",
      description: "GET /v2/products/origin-products/{originProductNo}",
      inputSchema: { originProductNo: z.union([z.string(), z.number()]) },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ originProductNo }) =>
      callApi(client, {
        method: "GET",
        path: `/v2/products/origin-products/${encodeURIComponent(String(originProductNo))}`,
      }),
  );

  server.registerTool(
    "naver_commerce_get_channel_product",
    {
      title: "Get channel product",
      description: "GET /v2/products/channel-products/{channelProductNo}",
      inputSchema: { channelProductNo: z.union([z.string(), z.number()]) },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ channelProductNo }) =>
      callApi(client, {
        method: "GET",
        path: `/v2/products/channel-products/${encodeURIComponent(String(channelProductNo))}`,
      }),
  );

  server.registerTool(
    "naver_commerce_get_categories",
    {
      title: "Get product categories",
      description:
        "Gets all categories, one category, or direct subcategories depending on the supplied arguments.",
      inputSchema: {
        categoryId: z.string().optional(),
        subCategories: z.boolean().default(false),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ categoryId, subCategories }) => {
      const suffix = categoryId
        ? `/${encodeURIComponent(categoryId)}${subCategories ? "/sub-categories" : ""}`
        : "";
      return callApi(client, { method: "GET", path: `/v1/categories${suffix}` });
    },
  );

  server.registerTool(
    "naver_commerce_get_changed_product_orders",
    {
      title: "Get changed product orders",
      description:
        "GET /v1/pay-order/seller/product-orders/last-changed-statuses. Continue with moreFrom/moreSequence when a more object is returned.",
      inputSchema: {
        lastChangedFrom: z.string().describe("ISO 8601 date-time with +09:00 offset"),
        lastChangedTo: z.string().optional(),
        lastChangedType: z.string().optional(),
        moreSequence: z.string().optional(),
        limitCount: z.number().int().min(1).max(300).optional(),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) =>
      callApi(client, {
        method: "GET",
        path: "/v1/pay-order/seller/product-orders/last-changed-statuses",
        query: args as QueryParams,
      }),
  );

  server.registerTool(
    "naver_commerce_get_product_order_details",
    {
      title: "Get product-order details",
      description:
        "POST /v1/pay-order/seller/product-orders/query. The official limit is 300 productOrderIds per call.",
      inputSchema: {
        productOrderIds: z.array(z.string()).min(1).max(300),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ productOrderIds }) =>
      callApi(client, {
        method: "POST",
        path: "/v1/pay-order/seller/product-orders/query",
        body: { productOrderIds },
        safeToRetry: true,
      }),
  );

  server.registerTool(
    "naver_commerce_get_order_product_ids",
    {
      title: "Get product-order IDs for an order",
      description: "GET /v1/pay-order/seller/orders/{orderId}/product-order-ids",
      inputSchema: { orderId: z.string().min(1) },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ orderId }) =>
      callApi(client, {
        method: "GET",
        path: `/v1/pay-order/seller/orders/${encodeURIComponent(orderId)}/product-order-ids`,
      }),
  );

  server.registerTool(
    "naver_commerce_list_skus",
    {
      title: "List N-delivery SKUs",
      description:
        "POST /v1/logistics/products/sellers/me/skus/query-paged-list. Pass the request body defined in the current docs.",
      inputSchema: { request: z.record(z.unknown()).default({}) },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ request }) =>
      callApi(client, {
        method: "POST",
        path: "/v1/logistics/products/sellers/me/skus/query-paged-list",
        body: request as JsonValue,
        safeToRetry: true,
      }),
  );

  server.registerTool(
    "naver_commerce_get_sku",
    {
      title: "Get N-delivery SKU",
      description: "Gets a SKU and optionally its linked products.",
      inputSchema: {
        nsId: z.string().min(1),
        linkedProducts: z.boolean().default(false),
        query: querySchema,
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ nsId, linkedProducts, query }) =>
      callApi(client, {
        method: "GET",
        path: `/v1/logistics/products/sellers/me/skus/${encodeURIComponent(nsId)}${linkedProducts ? "/product-mappings" : ""}`,
        query: query as QueryParams | undefined,
      }),
  );

  server.registerTool(
    "naver_commerce_execute_mutation",
    {
      title: "Execute an authorized NAVER Commerce mutation",
      description:
        "Executes POST, PUT, PATCH, or DELETE. Disabled by default. Requires NAVER_COMMERCE_ALLOW_MUTATIONS=true and confirm='EXECUTE'. Review current state and the official endpoint schema first.",
      inputSchema: {
        method: z.enum(["POST", "PUT", "PATCH", "DELETE"]),
        path: z.string().min(4),
        query: querySchema,
        body: jsonRecordSchema,
        confirm: z.literal("EXECUTE"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async ({ method, path, query, body }) => {
      if (!config.allowMutations) {
        return fail(
          "Mutation mode is disabled. The server operator must set NAVER_COMMERCE_ALLOW_MUTATIONS=true and restart the MCP server.",
        );
      }
      return callApi(client, {
        method: method as HttpMethod,
        path,
        query: query as QueryParams | undefined,
        body: body as JsonValue | undefined,
        safeToRetry: false,
      });
    },
  );

  server.registerResource(
    "naver-commerce-api-analysis",
    "naver-commerce://analysis",
    {
      title: "NAVER Commerce API analysis",
      description: "Architecture, authentication, synchronization, retry, and security guidance.",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, text: API_ANALYSIS }] }),
  );

  server.registerResource(
    "naver-commerce-endpoint-catalog",
    "naver-commerce://endpoint-catalog",
    {
      title: "NAVER Commerce endpoint catalog",
      description: "Curated current endpoints with operation risk classification.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [{ uri: uri.href, text: JSON.stringify(ENDPOINT_CATALOG, null, 2) }],
    }),
  );

  server.registerPrompt(
    "naver_commerce_safe_workflow",
    {
      title: "Plan a safe NAVER Commerce workflow",
      description:
        "Creates an execution plan that prioritizes read-before-write, pagination safety, and auditability.",
      argsSchema: {
        goal: z.string(),
        involvesMutation: z.enum(["yes", "no", "unknown"]).default("unknown"),
      },
    },
    ({ goal, involvesMutation }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: `Design a safe NAVER Commerce API workflow for this goal: ${goal}\nMutation involved: ${involvesMutation}.\nFirst inspect naver-commerce://analysis and the endpoint catalog. Use read-only calls to verify identifiers and current state. For changed-order sync, handle the more cursor without gaps. For any mutation, explain the exact path/body and wait for explicit user approval; mutation mode may be disabled.`,
          },
        },
      ],
    }),
  );

  return server;
}

async function callApi(
  client: NaverCommerceClient,
  options: Parameters<NaverCommerceClient["request"]>[0],
) {
  try {
    return ok(await client.request(options));
  } catch (error) {
    if (error instanceof NaverCommerceApiError) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify(error.response, null, 2) }],
        isError: true,
      };
    }
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function ok(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: { result: value },
  };
}

function fail(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}
