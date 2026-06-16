import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { NaverCommerceClient } from "../client.js";
import { callApi, querySchema, readAnnotations } from "../tool-helpers.js";
import type { QueryParams } from "../types.js";

export function registerSettlementTools(server: McpServer, client: NaverCommerceClient): void {
  server.registerTool("naver_commerce_get_settlement_data", {
    title: "Get VAT, settlement, or commission data",
    description: "Calls an official read-only settlement endpoint with supplied date/paging query.",
    inputSchema: {
      kind: z.enum(["vat_case", "vat_daily", "settlement_case", "commission_details", "settlement_daily"]),
      query: querySchema,
    },
    annotations: readAnnotations(),
  }, async ({ kind, query }) => {
    const paths: Record<typeof kind, string> = {
      vat_case: "/v1/pay-settle/vat/case",
      vat_daily: "/v1/pay-settle/vat/daily",
      settlement_case: "/v1/pay-settle/settle/case",
      commission_details: "/v1/pay-settle/settle/commission-details",
      settlement_daily: "/v1/pay-settle/settle/daily",
    };
    return callApi(client, { method: "GET", path: paths[kind], query: query as QueryParams | undefined });
  });
}
