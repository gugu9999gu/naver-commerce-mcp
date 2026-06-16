import path from "node:path";

import type { NaverCommerceConfig, TokenType } from "./types.js";

const OFFICIAL_BASE_URL = "https://api.commerce.naver.com/external";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`Invalid integer value '${value}'. Expected ${min}..${max}.`);
  }
  return parsed;
}

function parseTokenType(value: string | undefined): TokenType {
  const normalized = (value ?? "SELF").trim().toUpperCase();
  if (normalized !== "SELF" && normalized !== "SELLER") {
    throw new Error("NAVER_COMMERCE_TOKEN_TYPE must be SELF or SELLER.");
  }
  return normalized;
}

function normalizeBaseUrl(value: string | undefined): string {
  const raw = (value ?? OFFICIAL_BASE_URL).trim().replace(/\/+$/, "");
  const parsed = new URL(raw);
  if (parsed.protocol !== "https:") {
    throw new Error("NAVER_COMMERCE_BASE_URL must use HTTPS.");
  }
  return raw;
}

function parseAllowedFileRoots(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => path.resolve(entry));
}

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
): NaverCommerceConfig {
  const tokenType = parseTokenType(env.NAVER_COMMERCE_TOKEN_TYPE);
  const accountId = env.NAVER_COMMERCE_ACCOUNT_ID?.trim() || undefined;

  return {
    clientId: env.NAVER_COMMERCE_CLIENT_ID?.trim() || undefined,
    clientSecret: env.NAVER_COMMERCE_CLIENT_SECRET?.trim() || undefined,
    tokenType,
    accountId,
    allowMutations: parseBoolean(env.NAVER_COMMERCE_ALLOW_MUTATIONS, false),
    allowedFileRoots: parseAllowedFileRoots(env.NAVER_COMMERCE_ALLOWED_FILE_ROOTS),
    maxImageBytes: parseInteger(
      env.NAVER_COMMERCE_MAX_IMAGE_BYTES,
      20 * 1024 * 1024,
      1024,
      100 * 1024 * 1024,
    ),
    timeoutMs: parseInteger(env.NAVER_COMMERCE_TIMEOUT_MS, 30_000, 1_000, 120_000),
    maxRetries: parseInteger(env.NAVER_COMMERCE_MAX_RETRIES, 2, 0, 5),
    tokenRefreshMarginMs: parseInteger(
      env.NAVER_COMMERCE_TOKEN_REFRESH_MARGIN_MS,
      300_000,
      30_000,
      1_800_000,
    ),
    clockSkewMs: parseInteger(
      env.NAVER_COMMERCE_CLOCK_SKEW_MS,
      0,
      -300_000,
      300_000,
    ),
    baseUrl: normalizeBaseUrl(env.NAVER_COMMERCE_BASE_URL),
  };
}

export function validateCredentials(config: NaverCommerceConfig): void {
  if (!config.clientId) {
    throw new Error("NAVER_COMMERCE_CLIENT_ID is not configured.");
  }
  if (!config.clientSecret) {
    throw new Error("NAVER_COMMERCE_CLIENT_SECRET is not configured.");
  }
  if (config.tokenType === "SELLER" && !config.accountId) {
    throw new Error(
      "NAVER_COMMERCE_ACCOUNT_ID is required when NAVER_COMMERCE_TOKEN_TYPE=SELLER.",
    );
  }
}

export function publicConfig(config: NaverCommerceConfig): Record<string, unknown> {
  return {
    configured: Boolean(config.clientId && config.clientSecret),
    clientId: config.clientId ? `${config.clientId.slice(0, 4)}***` : undefined,
    tokenType: config.tokenType,
    accountIdConfigured: Boolean(config.accountId),
    allowMutations: config.allowMutations,
    imageUploadEnabled: config.allowedFileRoots.length > 0,
    allowedFileRootCount: config.allowedFileRoots.length,
    maxImageBytes: config.maxImageBytes,
    timeoutMs: config.timeoutMs,
    maxRetries: config.maxRetries,
    tokenRefreshMarginMs: config.tokenRefreshMarginMs,
    baseUrl: config.baseUrl,
  };
}
