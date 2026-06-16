import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { API_ANALYSIS } from "../analysis-resource.js";
import { ENDPOINT_CATALOG } from "../catalog.js";

export function registerResourcesAndPrompt(server: McpServer): void {
  server.registerResource("naver-commerce-api-analysis", "naver-commerce://analysis", {
    title: "NAVER Commerce API analysis",
    description: "Authentication, product, order, synchronization, retry, and security guidance.",
    mimeType: "text/markdown",
  }, async (uri) => ({ contents: [{ uri: uri.href, text: API_ANALYSIS }] }));

  server.registerResource("naver-commerce-endpoint-catalog", "naver-commerce://endpoint-catalog", {
    title: "NAVER Commerce endpoint catalog",
    description: "Curated endpoints with operation risk classification.",
    mimeType: "application/json",
  }, async (uri) => ({
    contents: [{ uri: uri.href, text: JSON.stringify(ENDPOINT_CATALOG, null, 2) }],
  }));

  server.registerPrompt("naver_commerce_safe_workflow", {
    title: "Plan a safe NAVER Commerce workflow",
    description: "Plans a read-before-write workflow for a real seller account.",
    argsSchema: {
      goal: z.string(), involvesMutation: z.enum(["yes", "no", "unknown"]).default("unknown"),
    },
  }, ({ goal, involvesMutation }) => ({
    messages: [{
      role: "user" as const,
      content: {
        type: "text" as const,
        text: `Plan and execute a safe NAVER Commerce workflow for: ${goal}\nMutation: ${involvesMutation}.\nFirst call naver_commerce_verify_connection and read current records. Never guess identifiers, state transitions, reason codes, carrier codes, tracking numbers, or required product fields. For a write, show the exact effect and wait for approval before using confirm=EXECUTE.`,
      },
    }],
  }));
}
