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
}
