import assert from "node:assert/strict";
import test from "node:test";

import { NaverCommerceClient } from "../src/client.js";
import type { NaverCommerceConfig } from "../src/types.js";

const config: NaverCommerceConfig = {
  clientId: "client",
  clientSecret: "$2a$10$abcdefghijklmnopqrstuv",
  tokenType: "SELF",
  allowMutations: false,
  allowedFileRoots: [],
  maxImageBytes: 1024,
  timeoutMs: 5_000,
  maxRetries: 2,
  tokenRefreshMarginMs: 30_000,
  clockSkewMs: 0,
  baseUrl: "https://api.commerce.naver.com/external",
};

test("refreshes a token once after GW.AUTHN", async () => {
  let tokenCalls = 0;
  let apiCalls = 0;
  const fetchMock: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("/v1/oauth2/token")) {
      tokenCalls += 1;
      return Response.json({ access_token: `token-${tokenCalls}`, expires_in: 10800 });
    }
    apiCalls += 1;
    if (apiCalls === 1) {
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer token-1");
      return Response.json({ code: "GW.AUTHN" }, { status: 401 });
    }
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer token-2");
    return Response.json({ accountNo: 1 });
  };

  const client = new NaverCommerceClient(config, fetchMock, async () => undefined);
  const result = await client.request({ method: "GET", path: "/v1/seller/account" });
  assert.equal(result.status, 200);
  assert.equal(tokenCalls, 2);
  assert.equal(apiCalls, 2);
});

test("transient retries reuse the cached token", async () => {
  let tokenCalls = 0;
  let apiCalls = 0;
  const fetchMock: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes("/v1/oauth2/token")) {
      tokenCalls += 1;
      return Response.json({ access_token: "token", expires_in: 10800 });
    }
    apiCalls += 1;
    if (apiCalls === 1) return Response.json({ message: "busy" }, { status: 503 });
    return Response.json({ accountNo: 1 });
  };

  const client = new NaverCommerceClient(config, fetchMock, async () => undefined);
  await client.request({ method: "GET", path: "/v1/seller/account" });
  assert.equal(tokenCalls, 1);
  assert.equal(apiCalls, 2);
});
