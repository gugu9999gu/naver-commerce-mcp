import assert from "node:assert/strict";
import test from "node:test";

import { buildApiUrl, isReadOnlyRequest, validateApiPath } from "../src/client.js";

test("builds a fixed-origin URL and repeats array query values", () => {
  const url = buildApiUrl("https://api.commerce.naver.com/external", "/v1/categories", {
    enabled: true,
    ids: [1, 2],
  });
  assert.equal(url.origin, "https://api.commerce.naver.com");
  assert.equal(url.pathname, "/external/v1/categories");
  assert.deepEqual(url.searchParams.getAll("ids"), ["1", "2"]);
});

test("rejects absolute URLs and traversal", () => {
  assert.throws(() => validateApiPath("https://evil.example/v1/test"));
  assert.throws(() => validateApiPath("/v1/../oauth2/token"));
  assert.throws(() => validateApiPath("/v1/%2e%2e/oauth2/token"));
});

test("classifies only explicitly known POST reads as read-only", () => {
  assert.equal(isReadOnlyRequest("GET", "/v1/seller/account"), true);
  assert.equal(isReadOnlyRequest("POST", "/v1/products/search"), true);
  assert.equal(isReadOnlyRequest("POST", "/v2/products"), false);
  assert.equal(isReadOnlyRequest("DELETE", "/v2/products/origin-products/1"), false);
});
