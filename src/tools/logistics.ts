import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { NaverCommerceClient } from "../client.js";
import { callApi, jsonObject, querySchema, readAnnotations } from "../tool-helpers.js";
import type { JsonValue, QueryParams } from "../types.js";

export function registerLogisticsTools(server: McpServer, client: NaverCommerceClient): void {
  server.registerTool("naver_commerce_list_skus", {
    title: "List N-delivery SKUs",
    description: "POST /v1/logistics/products/sellers/me/skus/query-paged-list.",
    inputSchema: { request: jsonObject.default({}) },
    annotations: readAnnotations(),
  }, async ({ request }) => callApi(client, {
    method: "POST", path: "/v1/logistics/products/sellers/me/skus/query-paged-list",
    body: request as JsonValue, safeToRetry: true,
  }));

  server.registerTool("naver_commerce_get_sku", {
    title: "Get N-delivery SKU or linked products",
    description: "Gets an SKU detail or its product mappings.",
    inputSchema: { nsId: z.string().min(1), linkedProducts: z.boolean().default(false), query: querySchema },
    annotations: readAnnotations(),
  }, async ({ nsId, linkedProducts, query }) => callApi(client, {
    method: "GET",
    path: `/v1/logistics/products/sellers/me/skus/${encodeURIComponent(nsId)}${linkedProducts ? "/product-mappings" : ""}`,
    query: query as QueryParams | undefined,
  }));

  server.registerTool("naver_commerce_get_logistics_companies", {
    title: "List linked logistics companies",
    description: "GET /v1/logistics/logistics-companies for connected N-delivery logistics partners.",
    inputSchema: { query: querySchema },
    annotations: readAnnotations(),
  }, async ({ query }) => callApi(client, {
    method: "GET", path: "/v1/logistics/logistics-companies", query: query as QueryParams | undefined,
  }));

  server.registerTool("naver_commerce_get_outbound_locations", {
    title: "List N-delivery outbound (warehouse) locations",
    description: "GET /v1/logistics/outbound-locations for the seller's N-delivery warehouses (id, name, carrier, delivery attributes).",
    inputSchema: { query: querySchema },
    annotations: readAnnotations(),
  }, async ({ query }) => callApi(client, {
    method: "GET", path: "/v1/logistics/outbound-locations", query: query as QueryParams | undefined,
  }));

  server.registerTool("naver_commerce_get_return_delivery_companies", {
    title: "List product/return delivery company codes",
    description: "GET /v2/product-delivery-info/return-delivery-companies for the product/return carrier code list.",
    inputSchema: { query: querySchema },
    annotations: readAnnotations(),
  }, async ({ query }) => callApi(client, {
    method: "GET", path: "/v2/product-delivery-info/return-delivery-companies", query: query as QueryParams | undefined,
  }));
}
