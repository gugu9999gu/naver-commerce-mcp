import { z } from "zod";

import { NaverCommerceApiError, NaverCommerceClient } from "./client.js";
import type { HttpMethod, JsonValue, NaverCommerceConfig } from "./types.js";

export const VERSION = "1.2.0";
export const jsonObject = z.record(z.unknown());
export const optionalJsonObject = jsonObject.optional();
export const querySchema = z.record(
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  ]),
).optional();
export const identifier = z.union([z.string().min(1), z.number()]);
export const executeConfirmation = z.literal("EXECUTE");

export function requiredId(kind: string, value: string | undefined): string {
  if (!value) throw new Error(`id is required for metadata kind '${kind}'.`);
  return encodeURIComponent(value);
}

export function mutationDenied(
  config: NaverCommerceConfig,
  confirm: "EXECUTE",
): ReturnType<typeof fail> | undefined {
  if (confirm !== "EXECUTE") return fail("Mutation confirmation must be EXECUTE.");
  if (!config.allowMutations) {
    return fail(
      "Mutation mode is disabled. Set NAVER_COMMERCE_ALLOW_MUTATIONS=true and restart after reviewing SECURITY.md.",
    );
  }
  return undefined;
}

export async function guardedMutation(
  config: NaverCommerceConfig,
  confirm: "EXECUTE",
  client: NaverCommerceClient,
  method: Exclude<HttpMethod, "GET">,
  path: string,
  body?: Record<string, unknown>,
) {
  const denied = mutationDenied(config, confirm);
  if (denied) return denied;
  return callApi(client, {
    method,
    path,
    body: body as JsonValue | undefined,
    safeToRetry: false,
  });
}

export async function callApi(
  client: NaverCommerceClient,
  options: Parameters<NaverCommerceClient["request"]>[0],
) {
  try {
    return ok(await client.request(options));
  } catch (error) {
    return apiFailure(error);
  }
}

export function apiFailure(error: unknown) {
  if (error instanceof NaverCommerceApiError) {
    return {
      content: [{ type: "text" as const, text: JSON.stringify(error.response, null, 2) }],
      structuredContent: { error: error.response },
      isError: true,
    };
  }
  return fail(error instanceof Error ? error.message : String(error));
}

export function ok(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent: { result: value },
  };
}

export function fail(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    structuredContent: { error: message },
    isError: true,
  };
}

export function readAnnotations() {
  return { readOnlyHint: true, destructiveHint: false, idempotentHint: true };
}

export function mutationAnnotations(destructive: boolean) {
  return { readOnlyHint: false, destructiveHint: destructive, idempotentHint: false };
}
