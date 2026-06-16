import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { NaverCommerceClient } from "../client.js";
import {
  callApi,
  executeConfirmation,
  guardedMutation,
  jsonObject,
  mutationAnnotations,
  readAnnotations,
} from "../tool-helpers.js";
import type { NaverCommerceConfig, QueryParams } from "../types.js";

export function registerOrderWorkflowTools(
  server: McpServer,
  config: NaverCommerceConfig,
  client: NaverCommerceClient,
): void {
  server.registerTool("naver_commerce_get_changed_product_orders", {
    title: "Poll changed product orders",
    description: "Continue with more.moreFrom and more.moreSequence when present.",
    inputSchema: {
      lastChangedFrom: z.string().min(1),
      lastChangedTo: z.string().optional(),
      lastChangedType: z.string().optional(),
      moreSequence: z.string().optional(),
      limitCount: z.number().int().min(1).max(300).optional(),
    },
    annotations: readAnnotations(),
  }, async (args) => callApi(client, {
    method: "GET",
    path: "/v1/pay-order/seller/product-orders/last-changed-statuses",
    query: args as QueryParams,
  }));

  server.registerTool("naver_commerce_get_orders", {
    title: "Get product-order details by period",
    description: "GET /v1/pay-order/seller/product-orders.",
    inputSchema: {
      from: z.string().min(1),
      to: z.string().min(1),
      productOrderIds: z.array(z.string().min(1)).max(300).optional(),
    },
    annotations: readAnnotations(),
  }, async ({ from, to, productOrderIds }) => callApi(client, {
    method: "GET",
    path: "/v1/pay-order/seller/product-orders",
    query: { from, to, ...(productOrderIds ? { productOrderIds: productOrderIds.join(",") } : {}) },
  }));

  server.registerTool("naver_commerce_get_product_order_details", {
    title: "Get product-order details by IDs",
    description: "POST query for 1-300 productOrderIds.",
    inputSchema: { productOrderIds: z.array(z.string().min(1)).min(1).max(300) },
    annotations: readAnnotations(),
  }, async ({ productOrderIds }) => callApi(client, {
    method: "POST",
    path: "/v1/pay-order/seller/product-orders/query",
    body: { productOrderIds },
    safeToRetry: true,
  }));

  server.registerTool("naver_commerce_get_order_product_ids", {
    title: "Get product-order IDs from an order ID",
    description: "GET /v1/pay-order/seller/orders/{orderId}/product-order-ids.",
    inputSchema: { orderId: z.string().min(1) },
    annotations: readAnnotations(),
  }, async ({ orderId }) => callApi(client, {
    method: "GET",
    path: `/v1/pay-order/seller/orders/${encodeURIComponent(orderId)}/product-order-ids`,
  }));

  server.registerTool("naver_commerce_confirm_orders", {
    title: "Confirm paid product orders",
    description: "Changes live order state; maximum 30 productOrderIds.",
    inputSchema: {
      productOrderIds: z.array(z.string().min(1)).min(1).max(30),
      confirm: executeConfirmation,
    },
    annotations: mutationAnnotations(true),
  }, async ({ productOrderIds, confirm }) => guardedMutation(
    config,
    confirm,
    client,
    "POST",
    "/v1/pay-order/seller/product-orders/confirm",
    { productOrderIds },
  ));

  server.registerTool("naver_commerce_dispatch_orders", {
    title: "Dispatch product orders",
    description: "Requires real carrier/tracking data; maximum 30 dispatch rows.",
    inputSchema: {
      dispatchProductOrders: z.array(jsonObject).min(1).max(30),
      confirm: executeConfirmation,
    },
    annotations: mutationAnnotations(true),
  }, async ({ dispatchProductOrders, confirm }) => guardedMutation(
    config,
    confirm,
    client,
    "POST",
    "/v1/pay-order/seller/product-orders/dispatch",
    { dispatchProductOrders },
  ));

  server.registerTool("naver_commerce_delay_dispatch", {
    title: "Delay product-order dispatch",
    description: "Sets dispatchDueDate and delayedDispatchReason for a live product order.",
    inputSchema: {
      productOrderId: z.string().min(1),
      dispatchDueDate: z.string().min(1),
      delayedDispatchReason: z.string().min(1),
      confirm: executeConfirmation,
    },
    annotations: mutationAnnotations(true),
  }, async ({ productOrderId, dispatchDueDate, delayedDispatchReason, confirm }) => guardedMutation(
    config,
    confirm,
    client,
    "POST",
    `/v1/pay-order/seller/product-orders/${encodeURIComponent(productOrderId)}/delay`,
    { dispatchDueDate, delayedDispatchReason },
  ));
}
