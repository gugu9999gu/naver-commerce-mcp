import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { NaverCommerceClient } from "../client.js";
import {
  callApi,
  executeConfirmation,
  guardedMutation,
  identifier,
  mutationAnnotations,
  readAnnotations,
} from "../tool-helpers.js";
import type { NaverCommerceConfig } from "../types.js";

export function registerSellerTools(
  server: McpServer,
  config: NaverCommerceConfig,
  client: NaverCommerceClient,
): void {
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
    description: "Lists seller addresses (RELEASE / REFUND_OR_EXCHANGE) or gets one address by addressBookNo.",
    inputSchema: { addressBookNo: identifier.optional(), page: z.number().int().min(1).optional() },
    annotations: readAnnotations(),
  }, async ({ addressBookNo, page }) => callApi(client, {
    method: "GET",
    path: addressBookNo === undefined
      ? "/v1/seller/addressbooks-for-page"
      : `/v1/seller/addressbooks/${encodeURIComponent(String(addressBookNo))}`,
    query: addressBookNo === undefined && page ? { page } : undefined,
  }));

  server.registerTool("naver_commerce_get_this_day_dispatch", {
    title: "Get today-dispatch (오늘출발) settings",
    description: "GET /v1/seller/this-day-dispatch: cutoff hour/minute, weekly holiday, and holiday list.",
    inputSchema: {},
    annotations: readAnnotations(),
  }, async () => callApi(client, { method: "GET", path: "/v1/seller/this-day-dispatch" }));

  server.registerTool("naver_commerce_set_this_day_dispatch", {
    title: "Update today-dispatch (오늘출발) settings",
    description: "POST /v1/seller/this-day-dispatch to update the cutoff time, weekly holiday, and holidays.",
    inputSchema: {
      basisHour: z.number().int().min(0).max(23),
      basisMinute: z.number().int().min(0).max(59),
      reason: z.string().min(1),
      holidayOfTheWeek: z.string().optional(),
      sellerHolidays: z.array(z.string().min(1)).optional(),
      confirm: executeConfirmation,
    },
    annotations: mutationAnnotations(true),
  }, async ({ basisHour, basisMinute, reason, holidayOfTheWeek, sellerHolidays, confirm }) => guardedMutation(
    config, confirm, client, "POST", "/v1/seller/this-day-dispatch",
    {
      basisHour, basisMinute, reason,
      ...(holidayOfTheWeek === undefined ? {} : { holidayOfTheWeek }),
      ...(sellerHolidays === undefined ? {} : { sellerHolidays }),
    },
  ));
}
