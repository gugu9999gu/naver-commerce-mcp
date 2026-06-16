import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { NaverCommerceClient } from "../client.js";
import { loadAllowedImages } from "../files.js";
import {
  apiFailure,
  callApi,
  executeConfirmation,
  guardedMutation,
  identifier,
  jsonObject,
  mutationAnnotations,
  mutationDenied,
  ok,
  querySchema,
  readAnnotations,
  requiredId,
} from "../tool-helpers.js";
import type { JsonValue, NaverCommerceConfig, QueryParams } from "../types.js";

export function registerProductTools(
  server: McpServer,
  config: NaverCommerceConfig,
  client: NaverCommerceClient,
): void {
  server.registerTool("naver_commerce_search_products", {
    title: "Search seller products",
    description: "POST /v1/products/search with the official search request body.",
    inputSchema: { request: jsonObject },
    annotations: readAnnotations(),
  }, async ({ request }) => callApi(client, {
    method: "POST", path: "/v1/products/search", body: request as JsonValue, safeToRetry: true,
  }));

  server.registerTool("naver_commerce_get_product", {
    title: "Get origin or channel product",
    description: "Gets a current product record before updates or operational checks.",
    inputSchema: { kind: z.enum(["origin", "channel"]), productNo: identifier },
    annotations: readAnnotations(),
  }, async ({ kind, productNo }) => callApi(client, {
    method: "GET",
    path: `/v2/products/${kind === "origin" ? "origin-products" : "channel-products"}/${encodeURIComponent(String(productNo))}`,
  }));

  server.registerTool("naver_commerce_lookup_product_metadata", {
    title: "Lookup product registration metadata",
    description: "Looks up categories, attributes, origins, notices, options, brands, or manufacturers.",
    inputSchema: {
      kind: z.enum([
        "categories", "category", "subcategories", "attributes", "attribute_values",
        "attribute_units", "origins", "origin_query", "sub_origins", "notice_types",
        "notice_type", "standard_options", "manufacturers", "brands",
      ]),
      id: z.string().optional(),
      query: querySchema,
    },
    annotations: readAnnotations(),
  }, async ({ kind, id, query }) => {
    try {
      const paths: Record<string, string> = {
        categories: "/v1/categories",
        attributes: "/v1/product-attributes/attributes",
        attribute_values: "/v1/product-attributes/attribute-values",
        attribute_units: "/v1/product-attributes/attribute-value-units",
        origins: "/v1/product-origin-areas",
        origin_query: "/v1/product-origin-areas/query",
        sub_origins: "/v1/product-origin-areas/sub-origin-areas",
        notice_types: "/v1/products-for-provided-notice",
        standard_options: "/v1/options/standard-options",
        manufacturers: "/v1/product-manufacturers",
        brands: "/v1/product-brands",
      };
      let path = paths[kind];
      if (kind === "category") path = `/v1/categories/${requiredId(kind, id)}`;
      if (kind === "subcategories") path = `/v1/categories/${requiredId(kind, id)}/sub-categories`;
      if (kind === "notice_type") path = `/v1/products-for-provided-notice/${requiredId(kind, id)}`;
      if (!path) throw new Error(`Unsupported metadata kind: ${kind}`);
      return callApi(client, { method: "GET", path, query: query as QueryParams | undefined });
    } catch (error) {
      return apiFailure(error);
    }
  });

  server.registerTool("naver_commerce_upload_product_images", {
    title: "Upload product images",
    description: "Uploads 1-10 local images to POST /v1/product-images/upload as imageFiles.",
    inputSchema: { filePaths: z.array(z.string().min(1)).min(1).max(10), confirm: executeConfirmation },
    annotations: mutationAnnotations(false),
  }, async ({ filePaths, confirm }) => {
    const denied = mutationDenied(config, confirm);
    if (denied) return denied;
    try {
      const images = await loadAllowedImages(filePaths, config.allowedFileRoots, config.maxImageBytes);
      const response = await client.requestMultipart("/v1/product-images/upload", () => {
        const form = new FormData();
        for (const image of images) {
          const bytes = image.bytes.buffer.slice(image.bytes.byteOffset, image.bytes.byteOffset + image.bytes.byteLength);
          form.append("imageFiles", new Blob([bytes], { type: image.mimeType }), image.filename);
        }
        return form;
      });
      return ok(response);
    } catch (error) {
      return apiFailure(error);
    }
  });

  server.registerTool("naver_commerce_create_product", {
    title: "Create a live NAVER product",
    description: "POST /v2/products with the current official product request body.",
    inputSchema: { request: jsonObject, confirm: executeConfirmation },
    annotations: mutationAnnotations(true),
  }, async ({ request, confirm }) => guardedMutation(config, confirm, client, "POST", "/v2/products", request));

  server.registerTool("naver_commerce_update_product", {
    title: "Update an origin or channel product",
    description: "Updates a current live product using the official complete request body.",
    inputSchema: {
      kind: z.enum(["origin", "channel"]), productNo: identifier,
      request: jsonObject, confirm: executeConfirmation,
    },
    annotations: mutationAnnotations(true),
  }, async ({ kind, productNo, request, confirm }) => guardedMutation(
    config, confirm, client, "PUT",
    `/v2/products/${kind === "origin" ? "origin-products" : "channel-products"}/${encodeURIComponent(String(productNo))}`,
    request,
  ));

  server.registerTool("naver_commerce_delete_product", {
    title: "Delete an origin or channel product",
    description: "Deletes a live product record after explicit confirmation.",
    inputSchema: { kind: z.enum(["origin", "channel"]), productNo: identifier, confirm: executeConfirmation },
    annotations: mutationAnnotations(true),
  }, async ({ kind, productNo, confirm }) => guardedMutation(
    config, confirm, client, "DELETE",
    `/v2/products/${kind === "origin" ? "origin-products" : "channel-products"}/${encodeURIComponent(String(productNo))}`,
  ));

  server.registerTool("naver_commerce_change_product_status", {
    title: "Change product sale status",
    description: "Changes a live origin-product status using a current documented statusType.",
    inputSchema: { originProductNo: identifier, statusType: z.string().min(1), confirm: executeConfirmation },
    annotations: mutationAnnotations(true),
  }, async ({ originProductNo, statusType, confirm }) => guardedMutation(
    config, confirm, client, "PUT",
    `/v1/products/origin-products/${encodeURIComponent(String(originProductNo))}/change-status`,
    { statusType },
  ));

  server.registerTool("naver_commerce_update_option_stock", {
    title: "Update product option stock",
    description: "Updates the official optionInfo object after reading the current product.",
    inputSchema: { originProductNo: identifier, optionInfo: jsonObject, confirm: executeConfirmation },
    annotations: mutationAnnotations(true),
  }, async ({ originProductNo, optionInfo, confirm }) => guardedMutation(
    config, confirm, client, "PUT",
    `/v1/products/origin-products/${encodeURIComponent(String(originProductNo))}/option-stock`,
    { optionInfo },
  ));

  server.registerTool("naver_commerce_multi_update_products", {
    title: "Apply a multi-product update",
    description: "PATCH /v1/products/origin-products/multi-update with the official request body.",
    inputSchema: { request: jsonObject, confirm: executeConfirmation },
    annotations: mutationAnnotations(true),
  }, async ({ request, confirm }) => guardedMutation(
    config, confirm, client, "PATCH", "/v1/products/origin-products/multi-update", request,
  ));
}
