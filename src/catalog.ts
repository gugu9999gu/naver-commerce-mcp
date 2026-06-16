export type EndpointCatalogItem = {
  category: string;
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  mode: "read" | "mutation" | "async-mutation";
  notes?: string;
  docs: string;
};

const DOCS = "https://apicenter.commerce.naver.com/docs/commerce-api/current";

export const ENDPOINT_CATALOG: EndpointCatalogItem[] = [
  {
    category: "auth",
    name: "인증 토큰 발급/갱신",
    method: "POST",
    path: "/v1/oauth2/token",
    mode: "read",
    notes: "OAuth 2.0 client_credentials; 서버 내부에서 자동 처리",
    docs: `${DOCS}/exchange-sellers-auth`,
  },
  {
    category: "seller",
    name: "계정 정보 조회",
    method: "GET",
    path: "/v1/seller/account",
    mode: "read",
    docs: `${DOCS}/get-account-info-by-account-no-sellers`,
  },
  {
    category: "seller",
    name: "계정 하위 채널 조회",
    method: "GET",
    path: "/v1/seller/channels",
    mode: "read",
    docs: `${DOCS}/get-channels-by-account-no-sellers`,
  },
  {
    category: "seller",
    name: "주소록 목록 조회",
    method: "GET",
    path: "/v1/seller/addressbooks-for-page",
    mode: "read",
    notes: "페이지당 100건 고정",
    docs: `${DOCS}/get-page-addresses-sellers`,
  },
  {
    category: "seller",
    name: "주소록 단건 조회",
    method: "GET",
    path: "/v1/seller/addressbooks/{addressBookNo}",
    mode: "read",
    docs: `${DOCS}/get-address-sellers`,
  },
  {
    category: "products",
    name: "상품 목록 검색",
    method: "POST",
    path: "/v1/products/search",
    mode: "read",
    docs: `${DOCS}/search-product`,
  },
  {
    category: "products",
    name: "원상품 조회",
    method: "GET",
    path: "/v2/products/origin-products/{originProductNo}",
    mode: "read",
    docs: `${DOCS}/read-origin-product-product`,
  },
  {
    category: "products",
    name: "채널 상품 조회",
    method: "GET",
    path: "/v2/products/channel-products/{channelProductNo}",
    mode: "read",
    docs: `${DOCS}/read-channel-product-1-product`,
  },
  {
    category: "products",
    name: "상품 등록",
    method: "POST",
    path: "/v2/products",
    mode: "mutation",
    docs: `${DOCS}/create-product-product`,
  },
  {
    category: "products",
    name: "원상품 수정",
    method: "PUT",
    path: "/v2/products/origin-products/{originProductNo}",
    mode: "mutation",
    docs: `${DOCS}/update-origin-product-product`,
  },
  {
    category: "products",
    name: "그룹상품 등록",
    method: "POST",
    path: "/v2/standard-group-products",
    mode: "async-mutation",
    notes: "결과 조회 API로 비동기 처리 상태 확인 필요",
    docs: `${DOCS}/create-product-1-product`,
  },
  {
    category: "categories",
    name: "전체 카테고리 조회",
    method: "GET",
    path: "/v1/categories",
    mode: "read",
    docs: `${DOCS}/get-category-list-product`,
  },
  {
    category: "categories",
    name: "카테고리 조회",
    method: "GET",
    path: "/v1/categories/{categoryId}",
    mode: "read",
    docs: `${DOCS}/get-category-product`,
  },
  {
    category: "categories",
    name: "하위 카테고리 조회",
    method: "GET",
    path: "/v1/categories/{categoryId}/sub-categories",
    mode: "read",
    docs: `${DOCS}/get-sub-category-product`,
  },
  {
    category: "orders",
    name: "변경 상품 주문 내역 조회",
    method: "GET",
    path: "/v1/pay-order/seller/product-orders/last-changed-statuses",
    mode: "read",
    notes: "최대 300건; moreFrom/moreSequence로 이어서 조회",
    docs: `${DOCS}/seller-get-last-changed-status-pay-order-seller`,
  },
  {
    category: "orders",
    name: "조건형 상품 주문 상세 조회",
    method: "GET",
    path: "/v1/pay-order/seller/product-orders",
    mode: "read",
    docs: `${DOCS}/seller-get-product-orders-with-conditions-pay-order-seller`,
  },
  {
    category: "orders",
    name: "상품 주문 상세 일괄 조회",
    method: "POST",
    path: "/v1/pay-order/seller/product-orders/query",
    mode: "read",
    notes: "한 번에 최대 300개 상품 주문 번호",
    docs: `${DOCS}/seller-get-product-orders-pay-order-seller`,
  },
  {
    category: "orders",
    name: "주문별 상품 주문 번호 조회",
    method: "GET",
    path: "/v1/pay-order/seller/orders/{orderId}/product-order-ids",
    mode: "read",
    docs: `${DOCS}/seller-get-product-order-ids-pay-order-seller`,
  },
  {
    category: "logistics",
    name: "SKU 목록 조회",
    method: "POST",
    path: "/v1/logistics/products/sellers/me/skus/query-paged-list",
    mode: "read",
    docs: `${DOCS}/get-ns-information-paged-list-nfa`,
  },
  {
    category: "logistics",
    name: "SKU 단건 조회",
    method: "GET",
    path: "/v1/logistics/products/sellers/me/skus/{nsId}",
    mode: "read",
    docs: `${DOCS}/get-ns-detail-nfa`,
  },
  {
    category: "logistics",
    name: "SKU 연결상품 조회",
    method: "GET",
    path: "/v1/logistics/products/sellers/me/skus/{nsId}/product-mappings",
    mode: "read",
    docs: `${DOCS}/get-linked-products-nfa`,
  },
  {
    category: "logistics",
    name: "연동 물류사 조회",
    method: "GET",
    path: "/v1/logistics/logistics-companies",
    mode: "read",
    docs: `${DOCS}/get-logistics-companies-nfa`,
  },
];

export function catalogByCategory(category?: string): EndpointCatalogItem[] {
  if (!category) return ENDPOINT_CATALOG;
  const normalized = category.trim().toLowerCase();
  return ENDPOINT_CATALOG.filter((item) => item.category.toLowerCase() === normalized);
}
