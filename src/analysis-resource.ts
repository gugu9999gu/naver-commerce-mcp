export const API_ANALYSIS = `# NAVER Commerce API integration analysis

## Baseline

- Documentation baseline: Commerce API 2.80.0, published 2026-06-10.
- Production host: https://api.commerce.naver.com/external
- Default payload: JSON, UTF-8.
- Date-time: ISO 8601 with KST offset (+09:00).
- Important response headers: GNCP-GW-Trace-ID and GNCP-GW-HttpClient-ResponseTime.

## Authentication

The API uses OAuth 2.0 Client Credentials. Token issuance requires a signature rather than sending the application secret directly:

1. timestamp = Unix time in milliseconds.
2. password = client_id + "_" + timestamp.
3. bcrypt hash the password with client_secret as the salt.
4. Base64-encode the bcrypt output.
5. POST /v1/oauth2/token with client_id, timestamp, client_secret_sign, grant_type=client_credentials, type=SELF or SELLER, and account_id for SELLER.

The official token lifetime is 10,800 seconds. The MCP server caches tokens, refreshes them before expiry, and retries once after HTTP 401 with code GW.AUTHN.

## Domain model

- Product: origin product contains shared product attributes; channel products represent SmartStore or ShoppingWindow channel-specific state.
- Group product: several operations are asynchronous. The initial request is not final success; poll the group-product request-result endpoint.
- Orders: orderId and productOrderId are distinct. Order collection should use changed-order polling with cursor continuation, then batch details by productOrderId.
- Claims: cancel, return, and exchange are separate state machines. Treat claim mutations as high-risk and verify the latest state before writing.
- Seller: SELF and SELLER token contexts determine whose resources are accessible.
- Analytics: many BizData endpoints are Brand Store subscription features and can be limited to up to 18 months of data.

## Pagination and incremental synchronization

For changed product orders, the response is ordered by change time and then product-order number. A request returns at most 300 rows (or limitCount). If a more object is present, continue with moreFrom as lastChangedFrom and moreSequence as the next cursor. Persist the cursor only after downstream processing succeeds to avoid gaps.

## Rate limits and retries

NAVER applies token-bucket rate limiting. HTTP 429 should be retried with bounded exponential backoff. GET and explicitly known read-only POST requests can be retried automatically. Mutation requests are not automatically retried because duplicate processing can create inconsistent state.

## MCP security model

- The base URL is fixed to an HTTPS endpoint.
- Paths must begin with /v1/ or /v2/ and cannot contain traversal or absolute URLs.
- Credentials never appear in tool results or logs.
- Mutation execution is disabled by default and needs both NAVER_COMMERCE_ALLOW_MUTATIONS=true and the literal confirmation string EXECUTE.
- The server uses stdio. Logs go to stderr only, keeping stdout reserved for MCP JSON-RPC.
- Remote exposure should add separate MCP authorization, network allow-lists, audit logs, and secret-manager integration.

## Known scope gaps

Product image multipart upload is implemented with local file-root isolation. Generic file download and streaming endpoints are not implemented. Review collection and TalkTalk consultation data are not exposed by the Commerce API according to NAVER's technical-support guidance. Always verify the current official documentation before adding a new workflow.
`;
