# naver-commerce-mcp

네이버 스마트스토어 운영 업무를 실제 네이버 커머스 API에 연결하는 TypeScript MCP 서버다. 자격 증명과 애플리케이션 권한을 설정하면 **상품 등록·수정·삭제, 이미지 업로드, 재고 및 판매 상태 변경, 발주 확인, 발송, 취소·반품·교환, 문의 답변, 정산 조회**를 MCP 도구로 실행할 수 있다.

> API 기준: 네이버 커머스 API **2.80.0 (2026-06-10)**. `current` 문서는 계속 바뀌므로 운영 전 공식 변경 이력을 확인한다.

## 실제 지원 업무

### 연결 및 판매자

- OAuth 2.0 Client Credentials 토큰 자동 발급
- bcrypt + Base64 전자서명
- 판매자 계정, 채널, 주소록 조회
- `401 / GW.AUTHN` 발생 시 토큰 재발급 후 1회 재시도

### 상품

- 상품 검색과 원상품·채널상품 조회
- 카테고리, 속성, 원산지, 상품정보제공고시, 옵션, 브랜드, 제조사 조회
- 로컬 이미지 1~10개 multipart 업로드
- 상품 등록, 수정, 삭제
- 판매 상태, 옵션 재고, 멀티 상품 수정
- 그룹(표준그룹)상품 등록·수정·삭제·조회와 비동기 결과 폴링

### 주문 및 클레임

- 변경 주문 증분 조회와 커서 처리
- 기간별 주문 및 최대 300건 상세 조회
- 발주 확인과 발송 처리: 요청당 최대 30건
- 발송 지연
- 취소 요청·승인
- 반품 요청·승인·보류·해제·거부
- 교환 수거 승인·재배송·보류·해제·거부

### 문의·정산·N배송

- 상품 문의와 답변 템플릿 조회
- 상품 문의 답변 등록·수정
- 네이버페이 고객 문의 조회와 답변 등록·수정
- 부가세, 정산, 수수료 조회
- N배송 SKU·연결 상품·출고지 창고·물류사·반품 택배사 코드 조회
- 오늘출발 설정 조회·변경, 배송 희망일 변경

## 필수 조건

1. 네이버 커머스API센터 가입
2. 애플리케이션 등록과 필요한 API 권한 승인
3. `client_id`, `client_secret` 발급
4. Node.js 20.12 이상
5. 로컬 또는 서버의 MCP 실행 환경

실제 자격 증명을 저장소에 커밋하면 안 된다.

## 설치

```bash
git clone https://github.com/gugu9999gu/naver-commerce-mcp.git
cd naver-commerce-mcp
npm install
npm run build
cp .env.example .env
```

`.env`를 설정한다.

```dotenv
NAVER_COMMERCE_CLIENT_ID=발급받은_client_id
NAVER_COMMERCE_CLIENT_SECRET=발급받은_client_secret
NAVER_COMMERCE_TOKEN_TYPE=SELF
NAVER_COMMERCE_ACCOUNT_ID=

# 처음에는 false로 연결과 조회부터 검증한다.
NAVER_COMMERCE_ALLOW_MUTATIONS=false

# 상품 이미지가 저장된 전용 디렉터리만 허용한다.
NAVER_COMMERCE_ALLOWED_FILE_ROOTS=/absolute/path/product-images
NAVER_COMMERCE_MAX_IMAGE_BYTES=20971520
```

## MCP 클라이언트 등록

```json
{
  "mcpServers": {
    "naver-commerce": {
      "command": "node",
      "args": [
        "--env-file=/absolute/path/naver-commerce-mcp/.env",
        "/absolute/path/naver-commerce-mcp/dist/src/index.js"
      ]
    }
  }
}
```

연결 후 `naver_commerce_verify_connection`을 호출한다. 성공하면 실제 네이버의 `GET /v1/seller/account` 결과와 Trace ID가 반환된다.

## 운영 순서

### 읽기 기능 검증

1. `naver_commerce_health`
2. `naver_commerce_verify_connection`
3. `naver_commerce_get_channels`
4. `naver_commerce_search_products`
5. `naver_commerce_get_changed_product_orders`

### 쓰기 기능 활성화

읽기 검증이 끝난 후에만 다음 값을 변경하고 서버를 재시작한다.

```dotenv
NAVER_COMMERCE_ALLOW_MUTATIONS=true
```

각 쓰기 도구에는 다음 확인값도 필요하다.

```json
{ "confirm": "EXECUTE" }
```

변경 요청은 중복 처리 위험 때문에 자동 재시도하지 않는다. 실행 전 최신 상태를 조회하고 실행 후 `GNCP-GW-Trace-ID`와 최종 상태를 확인한다.

### 상품 등록

1. `naver_commerce_lookup_product_metadata`로 카테고리와 필수 메타데이터를 조회한다.
2. `naver_commerce_upload_product_images`로 이미지를 업로드한다.
3. 반환 이미지 URL을 공식 상품 요청 객체에 넣는다.
4. `naver_commerce_create_product`를 호출한다.
5. 생성된 원상품과 채널상품을 다시 조회한다.

### 주문 처리

1. `naver_commerce_get_changed_product_orders`로 변경 주문을 찾는다.
2. `naver_commerce_get_product_order_details`로 최신 상태를 확인한다.
3. 상태가 허용할 때 `naver_commerce_confirm_orders`로 발주 확인한다.
4. 실제 택배사 코드와 송장번호가 확보된 뒤 `naver_commerce_dispatch_orders`로 발송 처리한다.

식별자, 상태 코드, 사유 코드, 택배사 코드, 송장번호를 추측해서 실행하면 안 된다.

## 주요 MCP 도구

- 연결: `naver_commerce_health`, `naver_commerce_verify_connection`
- 판매자: `naver_commerce_get_account`, `naver_commerce_get_channels`, `naver_commerce_get_addressbooks`
- 상품 조회: `naver_commerce_search_products`, `naver_commerce_get_product`, `naver_commerce_lookup_product_metadata`
- 상품 변경: `naver_commerce_upload_product_images`, `naver_commerce_create_product`, `naver_commerce_update_product`, `naver_commerce_delete_product`
- 재고·상태: `naver_commerce_change_product_status`, `naver_commerce_update_option_stock`, `naver_commerce_multi_update_products`
- 그룹상품: `naver_commerce_create_group_product`, `naver_commerce_get_group_product_result`, `naver_commerce_get_group_product`, `naver_commerce_update_group_product`, `naver_commerce_delete_group_product`
- 주문 조회: `naver_commerce_get_changed_product_orders`, `naver_commerce_get_orders`, `naver_commerce_get_product_order_details`
- 주문 처리: `naver_commerce_confirm_orders`, `naver_commerce_dispatch_orders`, `naver_commerce_delay_dispatch`, `naver_commerce_change_hope_delivery`
- 클레임: `naver_commerce_manage_claim`
- 문의: `naver_commerce_get_product_qnas`, `naver_commerce_answer_product_qna`, `naver_commerce_get_customer_inquiries`, `naver_commerce_answer_customer_inquiry`
- 정산: `naver_commerce_get_settlement_data`
- 배송 설정: `naver_commerce_get_this_day_dispatch`, `naver_commerce_set_this_day_dispatch`
- N배송·물류: `naver_commerce_list_skus`, `naver_commerce_get_sku`, `naver_commerce_get_logistics_companies`, `naver_commerce_get_outbound_locations`, `naver_commerce_get_return_delivery_companies`
- 확장: `naver_commerce_request`, `naver_commerce_execute_mutation`

## 이미지 업로드 보안

`naver_commerce_upload_product_images`는 다음을 강제한다.

- `NAVER_COMMERCE_ALLOWED_FILE_ROOTS` 아래의 실제 경로만 허용
- 심볼릭 링크를 해석한 뒤 루트 이탈 차단
- 이미지 확장자만 허용
- 파일당 최대 크기 제한
- 한 번에 최대 10개

Docker에서는 허용 디렉터리를 읽기 전용으로 마운트한다.

```bash
docker build -t naver-commerce-mcp .
docker run --rm -i \
  --env-file .env \
  -e NAVER_COMMERCE_ALLOWED_FILE_ROOTS=/product-images \
  -v /host/product-images:/product-images:ro \
  naver-commerce-mcp
```

## 주문 증분 동기화

변경 주문 응답에 `more`가 있으면 `more.moreFrom`과 `more.moreSequence`로 다음 요청을 이어간다. 주문 상세 저장이 성공한 뒤에만 커서를 확정하고, 장애 복구에서는 일부 시간 범위를 겹쳐 조회한 뒤 `productOrderId`로 중복 제거한다.

## 테스트

```bash
npm run check
npm test
npm audit --audit-level=high
```

자동 테스트는 공식 서명 벡터, API 경로 방어, 조회 POST 분류, 이미지 경로 격리, 인증 만료 복구, 재시도 시 토큰 재사용을 검증한다.

MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node --env-file=.env dist/src/index.js
```

## 제한 사항

- 실제 스마트스토어 호출 성공 여부는 사용자의 네이버 자격 증명, 애플리케이션 권한, 판매자 상태에 달려 있다.
- 상품 등록은 카테고리별 필수 필드가 달라 최신 공식 JSON 요청 객체를 그대로 받는다.
- 파일 다운로드와 대용량 스트리밍 API는 포함하지 않았다.
- 원격 HTTP 서비스가 아니라 stdio MCP다. 원격 노출에는 별도 인증·권한·감사 체계가 필요하다.
- 네이버 공식 SDK 또는 공식 제품이 아니다.

### 커머스 API가 제공하지 않는 기능 (이 MCP의 한계가 아님)

다음은 네이버 커머스 API 자체가 노출하지 않아 어떤 MCP·SDK로도 불가능하며, 스마트스토어센터 UI에서만 처리된다. (네이버 공식 GitHub 답변으로 확인: 쿠폰 #3199, 혜택 조회/수정 #3465, 리뷰 #1909, 리뷰·톡톡 #1582)

- 쿠폰 발급·혜택(즉시할인 외) 관리, 적립/포인트 정책 — 즉시할인은 상품 등록/수정 바디의 `immediateDiscountPolicy`·`reservedDiscountPolicy`로만 설정 가능
- 리뷰(구매평) 조회·답글
- 네이버 톡톡 상담 데이터
- 주소록(출고지·반품지) 생성·수정·삭제 — 조회만 가능
- 주문 수량 분할, 구매자 배송지 변경, 판매자측 구매확정(구매확정은 구매자 액션)

## 문서

- [상세 API 분석](docs/API_ANALYSIS.md)
- [엔드포인트 카탈로그](docs/ENDPOINT_CATALOG.md)
- [보안 정책](SECURITY.md)
- [네이버 커머스 API 공식 문서](https://apicenter.commerce.naver.com/docs/commerce-api/current)
- [네이버 커머스 API 기술지원](https://github.com/commerce-api-naver/commerce-api)

## 라이선스

MIT
