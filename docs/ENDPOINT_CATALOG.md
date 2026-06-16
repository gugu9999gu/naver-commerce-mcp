# 주요 엔드포인트 카탈로그

이 목록은 MCP에서 바로 사용하거나 구현 검증에 자주 필요한 핵심 엔드포인트다. 전체 API 표가 아니며, 요청 필드는 공식 문서의 최신 스키마를 따른다.

| 영역 | 메서드 | 경로 |
|---|---:|---|
| 인증 | POST | `/v1/oauth2/token` |
| 판매자 | GET | `/v1/seller/account` |
| 판매자 | GET | `/v1/seller/channels` |
| 주소록 | GET | `/v1/seller/addressbooks-for-page` |
| 상품 | POST | `/v1/products/search` |
| 상품 | GET | `/v2/products/origin-products/{originProductNo}` |
| 상품 | GET | `/v2/products/channel-products/{channelProductNo}` |
| 카테고리 | GET | `/v1/categories` |
| 카테고리 | GET | `/v1/categories/{categoryId}` |
| 카테고리 | GET | `/v1/categories/{categoryId}/sub-categories` |
| 주문 | GET | `/v1/pay-order/seller/product-orders/last-changed-statuses` |
| 주문 | GET | `/v1/pay-order/seller/product-orders` |
| 주문 | POST | `/v1/pay-order/seller/product-orders/query` |
| 주문 | GET | `/v1/pay-order/seller/orders/{orderId}/product-order-ids` |
| N배송 | POST | `/v1/logistics/products/sellers/me/skus/query-paged-list` |
| N배송 | GET | `/v1/logistics/products/sellers/me/skus/{nsId}` |
| N배송 | GET | `/v1/logistics/products/sellers/me/skus/{nsId}/product-mappings` |

`POST /v1/products/search`, `POST /v1/pay-order/seller/product-orders/query`, `POST /v1/logistics/products/sellers/me/skus/query-paged-list`는 HTTP 메서드는 POST지만 조회 작업이다. MCP의 읽기 범용 도구는 이 세 경로만 POST 조회로 허용한다.
