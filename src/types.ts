export type TokenType = "SELF" | "SELLER";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type QueryValue = JsonPrimitive | JsonPrimitive[] | undefined;
export type QueryParams = Record<string, QueryValue>;

export type NaverCommerceConfig = {
  clientId?: string | undefined;
  clientSecret?: string | undefined;
  tokenType: TokenType;
  accountId?: string | undefined;
  allowMutations: boolean;
  allowedFileRoots: string[];
  maxImageBytes: number;
  timeoutMs: number;
  maxRetries: number;
  tokenRefreshMarginMs: number;
  clockSkewMs: number;
  baseUrl: string;
};

export type AccessToken = {
  value: string;
  tokenType: string;
  expiresAt: number;
};

export type NaverApiResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  method: HttpMethod;
  path: string;
  traceId?: string;
  gatewayResponseTimeMs?: string;
  data: unknown;
};

export type RequestOptions = {
  method: HttpMethod;
  path: string;
  query?: QueryParams | undefined;
  body?: JsonValue | undefined;
  safeToRetry?: boolean | undefined;
};
