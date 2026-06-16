import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { catalogByCategory } from "../catalog.js";
import { NaverCommerceClient, isReadOnlyRequest } from "../client.js";
import { publicConfig } from "../config.js";
import {
  VERSION,
  callApi,
  executeConfirmation,
  fail,
  jsonObject,
  mutationAnnotations,
  mutationDenied,
  ok,
  optionalJsonObject,
  querySchema,
  readAnnotations,
} from "../tool-helpers.js";
import type { HttpMethod, JsonValue, NaverCommerceConfig, QueryParams } from "../types.js";

export function registerCoreTools(
  server: McpServer,
  config: NaverCommerceConfig,
  client: NaverCommerceClient,
): void {
  server.registerTool(
    "naver_commerce_health",
    {
      title: "NAVER Commerce MCP health",
      description: "Shows configuration readiness without exposing credentials. This does not call NAVER.",
      inputSchema: {},
      annotations: readAnnotations(),
    },
    async () => ok({
      server: "naver-commerce-mcp",
      version: VERSION,
      config: publicConfig(config),
      tokenCache: client.tokens.getCachedMetadata(),
    }),
  );

  server.registerTool(
    "naver_commerce_verify_connection",
    {
      title: "Verify NAVER Commerce credentials and seller access",
      description: "Issues/uses a real OAuth token and calls GET /v1/seller/account.",
      inputSchema: {},
      annotations: readAnnotations(),
    },
    async () => callApi(client, { method: "GET", path: "/v1/seller/account" }),
  );

  server.registerTool(
    "naver_commerce_endpoint_catalog",
    {
      title: "NAVER Commerce endpoint catalog",
      description: "Returns the curated endpoint catalog used by this MCP.",
      inputSchema: {
        category: z.enum([
          "auth", "seller", "products", "categories", "orders", "logistics", "inquiries", "settlement",
        ]).optional(),
      },
      annotations: readAnnotations(),
    },
    async ({ category }) => ok(catalogByCategory(category)),
  );

  server.registerTool(
    "naver_commerce_request",
    {
      title: "Call a read-only NAVER Commerce JSON endpoint",
      description: "Escape hatch for GET endpoints and the documented read-only POST allow-list.",
      inputSchema: {
        method: z.enum(["GET", "POST"]).default("GET"),
        path: z.string().min(4),
        query: querySchema,
        body: optionalJsonObject,
      },
      annotations: readAnnotations(),
    },
    async ({ method, path, query, body }) => {
      const normalized = method as HttpMethod;
      if (!isReadOnlyRequest(normalized, path)) return fail("The requested POST path is not classified as read-only.");
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
    "naver_commerce_execute_mutation",
    {
      title: "Call an advanced NAVER Commerce mutation",
      description: "Escape hatch for a current official JSON mutation. Never automatically retried.",
      inputSchema: {
        method: z.enum(["POST", "PUT", "PATCH", "DELETE"]),
        path: z.string().min(4),
        query: querySchema,
        body: optionalJsonObject,
        confirm: executeConfirmation,
      },
      annotations: mutationAnnotations(true),
    },
    async ({ method, path, query, body, confirm }) => {
      const denied = mutationDenied(config, confirm);
      if (denied) return denied;
      return callApi(client, {
        method: method as HttpMethod,
        path,
        query: query as QueryParams | undefined,
        body: body as JsonValue | undefined,
        safeToRetry: false,
      });
    },
  );
}
