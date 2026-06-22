import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { NaverCommerceClient } from "../client.js";
import {
  apiFailure,
  callApi,
  executeConfirmation,
  mutationAnnotations,
  mutationDenied,
} from "../tool-helpers.js";
import type { JsonValue, NaverCommerceConfig } from "../types.js";

export function registerClaimTools(
  server: McpServer,
  config: NaverCommerceConfig,
  client: NaverCommerceClient,
): void {
  server.registerTool("naver_commerce_manage_claim", {
    title: "Manage cancel, return, or exchange claims",
    description: "Executes a named claim transition after reading current product-order state.",
    inputSchema: {
      action: z.enum([
        "cancel_request",
        "cancel_approve",
        "return_request",
        "return_approve",
        "return_hold",
        "return_release",
        "return_reject",
        "exchange_collect_approve",
        "exchange_dispatch",
        "exchange_hold",
        "exchange_release",
        "exchange_reject"
      ]),
      productOrderId: z.string().min(1),
      reason: z.string().optional(),
      collectDeliveryMethod: z.string().optional(),
      holdbackClassType: z.string().optional(),
      deliveryMethod: z.string().optional(),
      deliveryCompanyCode: z.string().optional(),
      trackingNumber: z.string().optional(),
      confirm: executeConfirmation
    },
    annotations: mutationAnnotations(true)
  }, async (args) => {
    const denied = mutationDenied(config, args.confirm);
    if (denied) return denied;
    try {
      const operation = buildClaimOperation(args);
      return callApi(client, {
        method: "POST",
        path: operation.path,
        body: operation.body,
        safeToRetry: false
      });
    } catch (error) {
      return apiFailure(error);
    }
  });
}

type ClaimArgs = {
  action:
    | "cancel_request"
    | "cancel_approve"
    | "return_request"
    | "return_approve"
    | "return_hold"
    | "return_release"
    | "return_reject"
    | "exchange_collect_approve"
    | "exchange_dispatch"
    | "exchange_hold"
    | "exchange_release"
    | "exchange_reject";
  productOrderId: string;
  reason?: string | undefined;
  collectDeliveryMethod?: string | undefined;
  holdbackClassType?: string | undefined;
  deliveryMethod?: string | undefined;
  deliveryCompanyCode?: string | undefined;
  trackingNumber?: string | undefined;
};

function buildClaimOperation(args: ClaimArgs): { path: string; body?: JsonValue } {
  const base = `/v1/pay-order/seller/product-orders/${encodeURIComponent(args.productOrderId)}/claim`;
  const holdbackClassType = args.holdbackClassType ?? "ETC";

  switch (args.action) {
    case "cancel_request":
      return { path: `${base}/cancel/request`, body: { cancelReason: required("reason", args.reason) } };
    case "cancel_approve":
      // Official spec: POST .../claim/cancel/approve takes no request body.
      return { path: `${base}/cancel/approve` };
    case "return_request":
      return {
        path: `${base}/return/request`,
        body: {
          returnReason: required("reason", args.reason),
          collectDeliveryMethod: args.collectDeliveryMethod ?? "RETURN_INDIVIDUAL"
        }
      };
    case "return_approve":
      return { path: `${base}/return/approve` };
    case "return_hold":
      return {
        path: `${base}/return/holdback`,
        body: {
          holdbackClassType,
          holdbackReturnDetailReason: required("reason", args.reason)
        }
      };
    case "return_release":
      return { path: `${base}/return/holdback/release` };
    case "return_reject":
      return { path: `${base}/return/reject`, body: { rejectReturnReason: required("reason", args.reason) } };
    case "exchange_collect_approve":
      return { path: `${base}/exchange/collect/approve` };
    case "exchange_dispatch":
      return {
        path: `${base}/exchange/dispatch`,
        body: {
          reDeliveryMethod: required("deliveryMethod", args.deliveryMethod),
          reDeliveryCompany: required("deliveryCompanyCode", args.deliveryCompanyCode),
          reDeliveryTrackingNumber: required("trackingNumber", args.trackingNumber)
        }
      };
    case "exchange_hold":
      return {
        path: `${base}/exchange/holdback`,
        body: {
          holdbackClassType,
          holdbackExchangeDetailReason: required("reason", args.reason)
        }
      };
    case "exchange_release":
      return { path: `${base}/exchange/holdback/release` };
    case "exchange_reject":
      return { path: `${base}/exchange/reject`, body: { rejectExchangeReason: required("reason", args.reason) } };
  }
}

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) throw new Error(`${name} is required for this action.`);
  return value;
}
