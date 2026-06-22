import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { NaverCommerceClient } from "../client.js";
import {
  callApi,
  executeConfirmation,
  guardedMutation,
  identifier,
  mutationAnnotations,
  readAnnotations,
} from "../tool-helpers.js";
import type { NaverCommerceConfig, QueryParams } from "../types.js";

export function registerInquiryTools(
  server: McpServer,
  config: NaverCommerceConfig,
  client: NaverCommerceClient,
): void {
  server.registerTool("naver_commerce_get_product_qnas", {
    title: "List product Q&A entries",
    description: "GET /v1/contents/qnas for storefront product questions.",
    inputSchema: {
      fromDate: z.string().min(1), toDate: z.string().min(1),
      answered: z.boolean().default(false), page: z.number().int().min(1).default(1),
      size: z.number().int().min(1).max(100).default(20),
    },
    annotations: readAnnotations(),
  }, async (query) => callApi(client, {
    method: "GET", path: "/v1/contents/qnas", query: query as QueryParams,
  }));

  server.registerTool("naver_commerce_get_qna_templates", {
    title: "List product Q&A answer templates",
    description: "GET /v1/contents/qnas/templates.",
    inputSchema: {
      page: z.number().int().min(1).default(1), size: z.number().int().min(1).max(100).default(20),
    },
    annotations: readAnnotations(),
  }, async (query) => callApi(client, {
    method: "GET", path: "/v1/contents/qnas/templates", query: query as QueryParams,
  }));

  server.registerTool("naver_commerce_answer_product_qna", {
    title: "Answer a product Q&A",
    description: "Creates or overwrites customer-visible answer text.",
    inputSchema: { questionId: identifier, answer: z.string().min(1), confirm: executeConfirmation },
    annotations: mutationAnnotations(true),
  }, async ({ questionId, answer, confirm }) => guardedMutation(
    config, confirm, client, "PUT", `/v1/contents/qnas/${encodeURIComponent(String(questionId))}`,
    { commentContent: answer },
  ));

  server.registerTool("naver_commerce_get_customer_inquiries", {
    title: "List NAVER Pay customer inquiries",
    description: "GET /v1/pay-user/inquiries. Separate from storefront product Q&A.",
    inputSchema: {
      startSearchDate: z.string().min(1), endSearchDate: z.string().min(1),
      answered: z.boolean().default(false), page: z.number().int().min(1).default(1),
      size: z.number().int().min(10).max(200).default(20),
    },
    annotations: readAnnotations(),
  }, async (query) => callApi(client, {
    method: "GET", path: "/v1/pay-user/inquiries", query: query as QueryParams,
  }));

  server.registerTool("naver_commerce_answer_customer_inquiry", {
    title: "Create or update a NAVER Pay inquiry answer",
    description: "POST creates an answer; answerContentId switches to PUT update. Body field is answerComment per the official pay-merchant spec.",
    inputSchema: {
      inquiryNo: identifier, answerContentId: identifier.optional(),
      answer: z.string().min(1), answerTemplateId: identifier.optional(), confirm: executeConfirmation,
    },
    annotations: mutationAnnotations(true),
  }, async ({ inquiryNo, answerContentId, answer, answerTemplateId, confirm }) => {
    const suffix = answerContentId === undefined ? "" : `/${encodeURIComponent(String(answerContentId))}`;
    return guardedMutation(
      config, confirm, client, answerContentId === undefined ? "POST" : "PUT",
      `/v1/pay-merchant/inquiries/${encodeURIComponent(String(inquiryNo))}/answer${suffix}`,
      { answerComment: answer, ...(answerTemplateId === undefined ? {} : { answerTemplateId }) },
    );
  });
}
