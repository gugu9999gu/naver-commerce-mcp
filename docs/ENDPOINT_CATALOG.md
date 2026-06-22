# 구현 엔드포인트 카탈로그

API 기준: 네이버 커머스 API 2.80.0, 2026-06-10.

## 판매자·상품

| 기능 | 메서드·경로 |
|---|---|
| 계정 | `GET /v1/seller/account` |
| 채널 | `GET /v1/seller/channels` |
| 주소록 | `GET /v1/seller/addressbooks-for-page` |
| 오늘출발 설정 | `GET·POST /v1/seller/this-day-dispatch` |
| 상품 검색 | `POST /v1/products/search` |
| 상품 등록 | `POST /v2/products` |
| 원상품 | `GET·PUT·DELETE /v2/products/origin-products/{no}` |
| 채널상품 | `GET·PUT·DELETE /v2/products/channel-products/{no}` |
| 이미지 | `POST /v1/product-images/upload` |
| 상태 | `PUT /v1/products/origin-products/{no}/change-status` |
| 옵션 재고 | `PUT /v1/products/origin-products/{no}/option-stock` |
| 멀티 수정 | `PATCH /v1/products/origin-products/multi-update` |
| 그룹상품 | `POST /v2/standard-group-products`, `GET .../status`, `GET·PUT·DELETE /v2/standard-group-products/{no}` |

상품 등록 지원 조회: 카테고리, 속성·속성값·단위, 원산지, 상품정보제공고시, 표준 옵션, 제조사, 브랜드.

## 주문·클레임

| 기능 | 메서드·경로 |
|---|---|
| 변경 주문 | `GET /v1/pay-order/seller/product-orders/last-changed-statuses` |
| 기간 주문 | `GET /v1/pay-order/seller/product-orders` |
| 상세 일괄 | `POST /v1/pay-order/seller/product-orders/query` |
| 발주 확인 | `POST /v1/pay-order/seller/product-orders/confirm` |
| 발송 | `POST /v1/pay-order/seller/product-orders/dispatch` |
| 발송 지연 | `POST /v1/pay-order/seller/product-orders/{id}/delay` |
| 배송 희망일 변경 | `POST /v1/pay-order/seller/product-orders/{id}/hope-delivery/change` |
| 취소 | `POST .../{id}/claim/cancel/request|approve` |
| 반품 | `POST .../{id}/claim/return/request|approve|holdback|holdback/release|reject` |
| 교환 | `POST .../{id}/claim/exchange/collect/approve|dispatch|holdback|holdback/release|reject` |

## 문의·정산·N배송

| 기능 | 메서드·경로 |
|---|---|
| 상품 문의 | `GET /v1/contents/qnas` |
| 상품 문의 답변 | `PUT /v1/contents/qnas/{questionId}` |
| 고객 문의 | `GET /v1/pay-user/inquiries` |
| 고객 답변 | `POST·PUT /v1/pay-merchant/inquiries/{inquiryNo}/answer/...` |
| 부가세 | `GET /v1/pay-settle/vat/case|daily` |
| 정산 | `GET /v1/pay-settle/settle/case|daily|commission-details` |
| SKU 목록 | `POST /v1/logistics/products/sellers/me/skus/query-paged-list` |
| SKU | `GET /v1/logistics/products/sellers/me/skus/{nsId}` |
| 물류사 | `GET /v1/logistics/logistics-companies` |
| 출고지 창고 | `GET /v1/logistics/outbound-locations` |
| 반품 택배사 코드 | `GET /v2/product-delivery-info/return-delivery-companies` |
