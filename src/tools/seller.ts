import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { NaverCommerceClient } from "../client.js";
import { callApi, identifier, readAnnotations } from "../tool-helpers.js";

export function registerSellerTools(server: McpServer, client: NaverCommerceClient): void {
  server.registerTool("naver_commerce_get_account", {
    title: "Get seller account",
    description: "GET /v1/seller/account",
    inputSchema: {},
    annotations: readAnnotations(),
  }, async () => callApi(client, { method: "GET", path: "/v1/seller/account" }));

  server.registerTool("naver_commerce_get_channels", {
    title: "Get seller channels",
    description: "GET /v1/seller/channels",
    inputSchema: {},
    annotations: readAnnotations(),
  }, async () => callApi(client, { method: "GET", path: "/v1/seller/channels" }));

  server.registerTool("naver_commerce_get_addressbooks", {
    title: "Get seller address books",
    description: "Lists seller addresses or gets one address by addressBookNo.",
    inputSchema: { addressBookNo: identifier.optional(), page: z.number().int().min(1).optional() },
    annotations: readAnnotations(),
  }, async ({ addressBookNo, page }) => callApi(client, {
    method: "GET",
    path: addressBookNo === undefined
      ? "/v1/seller/addressbooks-for-page"
      : `/v1/seller/addressbooks/${encodeURIComponent(String(addressBookNo))}`,
    query: addressBookNo === undefined && page ? { page } : undefined,
  }));
}
