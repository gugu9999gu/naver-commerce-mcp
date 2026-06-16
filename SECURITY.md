# Security model

## Default posture

This is a local stdio MCP server and does not listen on a network port. Every product, order, claim, and inquiry mutation is blocked unless `NAVER_COMMERCE_ALLOW_MUTATIONS=true`. A mutation tool also requires the literal input `confirm: "EXECUTE"`.

## Credentials and commerce data

- Keep `client_id`, `client_secret`, access tokens, buyer PII, orders, settlement data, and inquiry contents out of commits, issues, prompts, and screenshots.
- Use process environment variables or a secret manager.
- Rotate a credential immediately after suspected exposure.
- The health tool returns only masked configuration metadata.
- Store operational logs in a protected location and redact buyer information.

## Product image files

Image upload is disabled unless `NAVER_COMMERCE_ALLOWED_FILE_ROOTS` is configured. The server resolves real paths, blocks traversal and symlink escapes, accepts known image extensions only, applies a file-size limit, and allows at most ten images per request.

Use a dedicated image staging directory. Do not allow `/`, a home directory, or a shared secrets directory. In Docker, mount it read-only.

## Safe mutations

Before a live mutation:

1. Verify the connection and token context.
2. Read the target resource and confirm current state.
3. Validate identifiers and all NAVER codes against current official data.
4. Show the exact business effect to the operator.
5. Obtain explicit approval.
6. Execute once. Mutation failures are not automatically retried.
7. Re-read the resource and retain `GNCP-GW-Trace-ID` for audit.

## Remote deployment

Do not expose this stdio server as an unauthenticated web service. A remote MCP gateway needs TLS, MCP authorization, per-user seller authorization, network restrictions, audit logging, rate limiting, secret-manager integration, and buyer-data retention controls.

## Reporting

Send security reports privately to the repository owner. Never include active credentials, access tokens, buyer PII, live order payloads, or settlement records in a public issue.
