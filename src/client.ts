import { TokenProvider } from "./auth.js";
import type {
  HttpMethod,
  JsonValue,
  NaverApiResponse,
  NaverCommerceConfig,
  QueryParams,
  RequestOptions,
} from "./types.js";

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

export class NaverCommerceApiError extends Error {
  constructor(
    message: string,
    readonly response: NaverApiResponse,
  ) {
    super(message);
    this.name = "NaverCommerceApiError";
  }
}

export function validateApiPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/v1/") && !trimmed.startsWith("/v2/")) {
    throw new Error("API path must start with /v1/ or /v2/.");
  }
  if (trimmed.includes("://") || trimmed.includes("\\")) {
    throw new Error("API path must be a relative NAVER Commerce path.");
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    throw new Error("API path contains invalid percent encoding.");
  }
  if (decoded.split("/").some((segment) => segment === ".." || segment === ".")) {
    throw new Error("Path traversal segments are not allowed.");
  }
  if (decoded === "/v1/oauth2/token") {
    throw new Error("Use the built-in token provider instead of calling the token endpoint directly.");
  }
  return trimmed;
}

export function buildApiUrl(
  baseUrl: string,
  path: string,
  query: QueryParams | undefined,
): URL {
  const safePath = validateApiPath(path);
  const url = new URL(`${baseUrl}${safePath}`);
  if (!query) return url;

  for (const [key, rawValue] of Object.entries(query)) {
    if (rawValue === undefined) continue;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value === null) continue;
      url.searchParams.append(key, String(value));
    }
  }
  return url;
}

export class NaverCommerceClient {
  readonly tokens: TokenProvider;

  constructor(
    private readonly config: NaverCommerceConfig,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly sleep: (milliseconds: number) => Promise<void> = (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)),
  ) {
    this.tokens = new TokenProvider(config, fetchImpl);
  }

  async request(options: RequestOptions): Promise<NaverApiResponse> {
    const path = validateApiPath(options.path);
    const method = options.method;
    const safeToRetry = options.safeToRetry ?? method === "GET";
    let authRetried = false;
    let transientRetries = 0;

    while (true) {
      const token = await this.tokens.getToken(authRetried);
      const response = await this.perform({ ...options, path, method }, token);
      const code = getErrorCode(response.data);

      if (response.status === 401 && code === "GW.AUTHN" && !authRetried) {
        this.tokens.clear();
        authRetried = true;
        continue;
      }

      if (
        safeToRetry &&
        RETRYABLE_STATUSES.has(response.status) &&
        transientRetries < this.config.maxRetries
      ) {
        const waitMs = retryDelayMs(transientRetries, response.data);
        transientRetries += 1;
        await this.sleep(waitMs);
        continue;
      }

      if (!response.ok) {
        throw new NaverCommerceApiError(
          `NAVER Commerce API failed: ${method} ${path} -> HTTP ${response.status} ${response.statusText}`,
          response,
        );
      }
      return response;
    }
  }

  private async perform(
    options: RequestOptions,
    token: string,
  ): Promise<NaverApiResponse> {
    const url = buildApiUrl(this.config.baseUrl, options.path, options.query);
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };

    let body: string | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json; charset=utf-8";
      body = JSON.stringify(options.body);
    }

    const requestInit: RequestInit = {
      method: options.method,
      headers,
      signal: AbortSignal.timeout(this.config.timeoutMs),
    };
    if (body !== undefined) requestInit.body = body;

    const response = await this.fetchImpl(url, requestInit);

    const data = await parseResponseBody(response);
    const result: NaverApiResponse = {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      method: options.method,
      path: options.path,
      data,
    };
    const traceId = response.headers.get("gncp-gw-trace-id");
    const responseTime = response.headers.get("gncp-gw-httpclient-responsetime");
    if (traceId) result.traceId = traceId;
    if (responseTime) result.gatewayResponseTimeMs = responseTime;
    return result;
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    try {
      return JSON.parse(text) as JsonValue;
    } catch {
      return { raw: text, parseError: "Invalid JSON response" };
    }
  }
  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return text;
  }
}

function getErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const code = (data as Record<string, unknown>).code;
  return typeof code === "string" ? code : undefined;
}

function retryDelayMs(attempt: number, data: unknown): number {
  const base = Math.min(8_000, 500 * 2 ** attempt);
  const jitter = Math.floor(Math.random() * 250);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const retryAfter = (data as Record<string, unknown>).retryAfter;
    if (typeof retryAfter === "number" && retryAfter > 0) {
      return Math.min(30_000, retryAfter * 1000);
    }
  }
  return base + jitter;
}

export const READ_ONLY_POST_PATHS = new Set([
  "/v1/products/search",
  "/v1/pay-order/seller/product-orders/query",
  "/v1/logistics/products/sellers/me/skus/query-paged-list",
]);

export function isReadOnlyRequest(method: HttpMethod, path: string): boolean {
  return method === "GET" || (method === "POST" && READ_ONLY_POST_PATHS.has(path));
}
