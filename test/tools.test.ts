import assert from "node:assert/strict";
import test from "node:test";

import { registerClaimTools } from "../src/tools/claims.js";
import { registerInquiryTools } from "../src/tools/inquiries.js";
import { registerLogisticsTools } from "../src/tools/logistics.js";
import type { NaverCommerceConfig } from "../src/types.js";

type Handler = (args: Record<string, unknown>) => Promise<unknown>;
type RecordedCall = Record<string, unknown>;

// Minimal fakes so we can invoke a tool handler directly and inspect the
// outgoing API request it builds, without spinning up the stdio transport.
function fakeServer() {
  const handlers = new Map<string, Handler>();
  const server = {
    registerTool(name: string, _def: unknown, handler: Handler) {
      handlers.set(name, handler);
    },
  };
  const invoke = (name: string, args: Record<string, unknown>): Promise<unknown> => {
    const handler = handlers.get(name);
    if (!handler) throw new Error(`tool not registered: ${name}`);
    return handler(args);
  };
  return { server, invoke };
}

function recordingClient() {
  const calls: RecordedCall[] = [];
  const client = {
    async request(options: RecordedCall) {
      calls.push(options);
      return { ok: true, status: 200, statusText: "OK", method: options.method, path: options.path, data: {} };
    },
  };
  const at = (index: number): RecordedCall => {
    const call = calls[index];
    if (!call) throw new Error(`no recorded call at index ${index}`);
    return call;
  };
  return { client, at, count: () => calls.length };
}

const mutableConfig = { allowMutations: true } as unknown as NaverCommerceConfig;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyServer = (s: unknown) => s as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyClient = (c: unknown) => c as any;

test("customer inquiry answer sends answerComment, not the legacy replyContent", async () => {
  const { server, invoke } = fakeServer();
  const { client, at, count } = recordingClient();
  registerInquiryTools(anyServer(server), mutableConfig, anyClient(client));

  await invoke("naver_commerce_answer_customer_inquiry", {
    inquiryNo: "123", answer: "감사합니다", confirm: "EXECUTE",
  });

  assert.equal(count(), 1);
  assert.equal(at(0).method, "POST");
  assert.equal(at(0).path, "/v1/pay-merchant/inquiries/123/answer");
  assert.deepEqual(at(0).body, { answerComment: "감사합니다" });
});

test("customer inquiry answer update uses PUT and carries answerTemplateId", async () => {
  const { server, invoke } = fakeServer();
  const { client, at } = recordingClient();
  registerInquiryTools(anyServer(server), mutableConfig, anyClient(client));

  await invoke("naver_commerce_answer_customer_inquiry", {
    inquiryNo: "123", answerContentId: "456", answer: "수정", answerTemplateId: "7", confirm: "EXECUTE",
  });

  assert.equal(at(0).method, "PUT");
  assert.equal(at(0).path, "/v1/pay-merchant/inquiries/123/answer/456");
  assert.deepEqual(at(0).body, { answerComment: "수정", answerTemplateId: "7" });
});

test("claim cancel/approve sends no body; cancel/request still sends cancelReason", async () => {
  const { server, invoke } = fakeServer();
  const { client, at } = recordingClient();
  registerClaimTools(anyServer(server), mutableConfig, anyClient(client));

  await invoke("naver_commerce_manage_claim", {
    action: "cancel_approve", productOrderId: "po1", confirm: "EXECUTE",
  });
  assert.equal(at(0).path, "/v1/pay-order/seller/product-orders/po1/claim/cancel/approve");
  assert.equal(at(0).body, undefined);

  await invoke("naver_commerce_manage_claim", {
    action: "cancel_request", productOrderId: "po1", reason: "변심", confirm: "EXECUTE",
  });
  assert.deepEqual(at(1).body, { cancelReason: "변심" });
});

test("logistics companies tool calls GET /v1/logistics/logistics-companies", async () => {
  const { server, invoke } = fakeServer();
  const { client, at } = recordingClient();
  registerLogisticsTools(anyServer(server), anyClient(client));

  await invoke("naver_commerce_get_logistics_companies", {});
  assert.equal(at(0).method, "GET");
  assert.equal(at(0).path, "/v1/logistics/logistics-companies");
});

test("outbound locations tool calls GET /v1/logistics/outbound-locations", async () => {
  const { server, invoke } = fakeServer();
  const { client, at } = recordingClient();
  registerLogisticsTools(anyServer(server), anyClient(client));

  await invoke("naver_commerce_get_outbound_locations", {});
  assert.equal(at(0).method, "GET");
  assert.equal(at(0).path, "/v1/logistics/outbound-locations");
});
