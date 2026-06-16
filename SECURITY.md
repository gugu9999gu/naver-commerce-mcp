# Security model

## Default posture

This server is a local stdio MCP server. It does not listen on a network port. All mutation calls are blocked unless `NAVER_COMMERCE_ALLOW_MUTATIONS=true` is set by the operator. Even then, the mutation tool requires the exact confirmation value `EXECUTE`.

## Secrets

- Put credentials in process environment variables or a local `.env` loaded by the host process.
- Never commit `.env`, access tokens, `client_secret`, buyer information, or order payloads.
- Rotate a credential immediately when it appears in a prompt, log, screenshot, issue, or commit.
- The health tool returns only masked configuration metadata.

## Remote deployment

Do not expose this stdio server directly as an unauthenticated web service. A remote Streamable HTTP deployment needs a separate MCP authorization layer, TLS, host validation, IP/network controls, per-user authorization, audit logging, secret-manager integration, and response-data handling appropriate for personal information.

## Mutation controls

Before a mutation:

1. Read the target resource and confirm its current state.
2. Confirm the endpoint and current NAVER schema.
3. Show the exact business effect to the user.
4. Obtain explicit approval.
5. Execute once. Do not automatically retry an ambiguous mutation failure.
6. Re-read the resource and record the `GNCP-GW-Trace-ID`.

## Reporting

Open a private security report with the repository owner. Do not include live credentials, tokens, buyer PII, or order data in a public issue.
