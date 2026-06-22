import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { NaverCommerceClient } from "./client.js";
import { VERSION } from "./tool-helpers.js";
import { registerCoreTools } from "./tools/core.js";
import { registerClaimTools } from "./tools/claims.js";
import { registerInquiryTools } from "./tools/inquiries.js";
import { registerLogisticsTools } from "./tools/logistics.js";
import { registerOrderWorkflowTools } from "./tools/order-workflows.js";
import { registerProductTools } from "./tools/products.js";
import { registerResourcesAndPrompt } from "./tools/resources.js";
import { registerSellerTools } from "./tools/seller.js";
import { registerSettlementTools } from "./tools/settlement.js";
import type { NaverCommerceConfig } from "./types.js";

export function createServer(
  config: NaverCommerceConfig,
  client = new NaverCommerceClient(config),
): McpServer {
  const server = new McpServer(
    { name: "naver-commerce-mcp", version: VERSION },
    {
      instructions:
        "This server operates a real NAVER Commerce account when credentials are configured. Read current state before writes. All writes require operator-enabled mutation mode and confirm=EXECUTE. Never invent product, order, claim, carrier, tracking, category, or reason codes.",
    },
  );

  registerCoreTools(server, config, client);
  registerSellerTools(server, config, client);
  registerProductTools(server, config, client);
  registerOrderWorkflowTools(server, config, client);
  registerClaimTools(server, config, client);
  registerInquiryTools(server, config, client);
  registerSettlementTools(server, client);
  registerLogisticsTools(server, client);
  registerResourcesAndPrompt(server);
  return server;
}
