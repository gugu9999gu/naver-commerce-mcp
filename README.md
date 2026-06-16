# naver-commerce-mcp

네이버 커머스 API를 MCP(Model Context Protocol) 도구로 제공하는 TypeScript 서버다. 상품·주문·판매자·카테고리·N배송 조회를 편의 도구로 제공하고, 나머지 JSON API는 안전 장치가 적용된 범용 요청 도구로 호출할 수 있다.

> 기준: 네이버 커머스 API **2.80.0 (2026-06-10)**. 네이버의 `current` 문서는 계속 바뀔 수 있으므로 운영 배포 전 변경 이력을 확인한다.

## 특징

- OAuth 2.0 Client Credentials 및 bcrypt + Base64 전자서명
- 3시간 토큰 캐시, 만료 전 갱신, `401/GW.AUTHN` 1회 복구
- `429/502/503/504` 조회 요청의 제한된 지수 백오프
- 계정, 채널, 상품, 카테고리, 주문, SKU 편의 도구
- `naver-commerce://analysis`, `naver-commerce://endpoint-catalog` MCP 리소스
- 쓰기 작업 기본 차단 및 이중 확인
- SSRF 방지를 위한 호스트 고정과 `/v1`, `/v2` 경로 검증
- stdio 전용: 자격 증명과 주문 데이터가 로컬 프로세스 경계를 벗어나지 않음

## 설치

```bash
git clone https://github.com/gugu9999gu/naver-commerce-mcp.git
cd naver-commerce-mcp
npm install
npm run build
cp .env.example .env
```

`.env`에 커머스API센터에서 발급받은 값을 입력한다.

```dotenv
NAVER_COMMERCE_CLIENT_ID=...
NAVER_COMMERCE_CLIENT_SECRET=...
NAVER_COMMERCE_TOKEN_TYPE=SELF
NAVER_COMMERCE_ALLOW_MUTATIONS=false
```

Node.js는 `.env`를 자동으로 읽지 않는다. 터미널에서 실행할 때는 Node 20의 `--env-file`을 사용한다.

```bash
node --env-file=.env dist/src/index.js
```

## MCP 클라이언트 설정

로컬 MCP 설정에 다음 형식으로 등록한다. `command`와 `args`는 절대 경로 사용을 권장한다.

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

`npx` 없이 고정된 로컬 빌드를 실행하므로 공급망 변동과 시작 지연을 줄일 수 있다.

## 제공 도구

| 도구 | 용도 |
|---|---|
| `naver_commerce_health` | 설정 상태와 토큰 캐시 메타데이터 확인 |
| `naver_commerce_endpoint_catalog` | 주요 공식 엔드포인트 목록 |
| `naver_commerce_request` | GET 및 허용된 조회용 POST 호출 |
| `naver_commerce_get_account` | 판매자 계정 조회 |
| `naver_commerce_get_channels` | 계정 하위 채널 조회 |
| `naver_commerce_search_products` | 상품 목록 검색 |
| `naver_commerce_get_origin_product` | 원상품 조회 |
| `naver_commerce_get_channel_product` | 채널 상품 조회 |
| `naver_commerce_get_categories` | 전체/단건/하위 카테고리 조회 |
| `naver_commerce_get_changed_product_orders` | 증분 주문 변경 목록 조회 |
| `naver_commerce_get_product_order_details` | 최대 300개 상품주문 상세 조회 |
| `naver_commerce_get_order_product_ids` | 주문번호의 상품주문번호 조회 |
| `naver_commerce_list_skus` | N배송 SKU 목록 조회 |
| `naver_commerce_get_sku` | SKU 또는 SKU 연결상품 조회 |
| `naver_commerce_execute_mutation` | 명시적으로 승인된 변경 요청 |

## 쓰기 작업 활성화

기본값은 차단이다. 실제 상품·주문 상태를 변경하려면 운영자가 다음 값을 설정하고 서버를 재시작해야 한다.

```dotenv
NAVER_COMMERCE_ALLOW_MUTATIONS=true
```

호출 시에도 `confirm`에 정확히 `EXECUTE`를 전달해야 한다. 변경 요청은 자동 재시도하지 않는다. 실행 전 현재 상태를 조회하고, 실행 후 응답의 `GNCP-GW-Trace-ID`를 기록한다.

## 주문 증분 동기화

`naver_commerce_get_changed_product_orders`는 최대 300건을 반환한다. 응답에 `more`가 있으면:

1. `more.moreFrom`을 다음 `lastChangedFrom`으로 사용한다.
2. `more.moreSequence`를 다음 `moreSequence`로 사용한다.
3. 상세 조회와 내부 저장이 끝난 후에만 커서를 확정한다.
4. 장애 복구 시 겹치는 시간 범위를 재조회하고 상품주문번호로 중복 제거한다.

## 테스트

```bash
npm test
```

MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node --env-file=.env dist/src/index.js
```

stdio MCP 서버는 stdout을 JSON-RPC 전용으로 사용한다. 이 프로젝트의 로그는 stderr로만 출력한다.

## Docker

```bash
docker build -t naver-commerce-mcp .
docker run --rm -i --env-file .env naver-commerce-mcp
```

stdio 서버이므로 `-i`가 필요하다.

## 문서

- [상세 API 분석](docs/API_ANALYSIS.md)
- [주요 엔드포인트](docs/ENDPOINT_CATALOG.md)
- [보안 모델](SECURITY.md)
- [네이버 공식 커머스 API 문서](https://apicenter.commerce.naver.com/docs/commerce-api/current)
- [네이버 공식 기술지원 저장소](https://github.com/commerce-api-naver/commerce-api)

## 제한 사항

- multipart 이미지 업로드와 파일 스트리밍은 구현하지 않았다.
- 네이버 기술지원 안내상 리뷰와 톡톡 상담 데이터는 커머스 API 제공 범위가 아니다.
- 원격 HTTP MCP 서버는 포함하지 않았다. 주문·구매자 정보가 포함될 수 있으므로 인증 없는 원격 노출은 안전하지 않다.
- 이 프로젝트는 네이버의 공식 SDK나 공식 제품이 아니다.

## 라이선스

MIT
