import bcrypt from "bcryptjs";

import { validateCredentials } from "./config.js";
import type { AccessToken, NaverCommerceConfig } from "./types.js";

export function generateClientSecretSign(
  clientId: string,
  clientSecret: string,
  timestamp: number,
): string {
  const password = `${clientId}_${timestamp}`;
  const hashed = bcrypt.hashSync(password, clientSecret);
  return Buffer.from(hashed, "utf8").toString("base64");
}

function readString(data: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

function readNumber(data: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

export class TokenProvider {
  private cached: AccessToken | undefined;
  private inFlight: Promise<AccessToken> | undefined;

  constructor(
    private readonly config: NaverCommerceConfig,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  clear(): void {
    this.cached = undefined;
  }

  getCachedMetadata(): Record<string, unknown> {
    if (!this.cached) return { cached: false };
    return {
      cached: true,
      tokenType: this.cached.tokenType,
      expiresAt: new Date(this.cached.expiresAt).toISOString(),
      expiresInSeconds: Math.max(0, Math.floor((this.cached.expiresAt - this.now()) / 1000)),
    };
  }

  async getToken(forceRefresh = false): Promise<string> {
    validateCredentials(this.config);

    if (
      !forceRefresh &&
      this.cached &&
      this.cached.expiresAt - this.config.tokenRefreshMarginMs > this.now()
    ) {
      return this.cached.value;
    }

    if (!forceRefresh && this.inFlight) {
      return (await this.inFlight).value;
    }

    const pending = this.issueToken();
    this.inFlight = pending;
    try {
      const token = await pending;
      this.cached = token;
      return token.value;
    } finally {
      this.inFlight = undefined;
    }
  }

  private async issueToken(): Promise<AccessToken> {
    validateCredentials(this.config);
    const clientId = this.config.clientId!;
    const clientSecret = this.config.clientSecret!;
    const timestamp = this.now() + this.config.clockSkewMs;
    const signature = generateClientSecretSign(clientId, clientSecret, timestamp);

    // NAVER's token endpoint expects application/x-www-form-urlencoded body
    // parameters; sending them as query string returns HTTP 415.
    const params = new URLSearchParams();
    params.set("client_id", clientId);
    params.set("timestamp", String(timestamp));
    params.set("client_secret_sign", signature);
    params.set("grant_type", "client_credentials");
    params.set("type", this.config.tokenType);
    if (this.config.tokenType === "SELLER" && this.config.accountId) {
      params.set("account_id", this.config.accountId);
    }

    const response = await this.fetchImpl(`${this.config.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });

    const text = await response.text();
    let body: unknown = text;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        // Keep the original text for diagnostics.
      }
    }

    if (!response.ok) {
      throw new Error(
        `NAVER token request failed: HTTP ${response.status} ${response.statusText}; ${safeStringify(body)}`,
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("NAVER token response was not a JSON object.");
    }

    const record = body as Record<string, unknown>;
    const value = readString(record, "access_token", "accessToken");
    if (!value) throw new Error("NAVER token response did not include an access token.");

    const expiresIn = readNumber(record, "expires_in", "expiresIn") ?? 10_800;
    const tokenType = readString(record, "token_type", "tokenType") ?? "Bearer";
    return {
      value,
      tokenType,
      expiresAt: this.now() + Math.max(60, expiresIn) * 1000,
    };
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
