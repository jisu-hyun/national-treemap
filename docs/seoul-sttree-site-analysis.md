# 서울시 가로수 트리맵 사이트 분석

**대상 URL:** https://map.seoul.go.kr/smgis2/extMap/sttree

---

## 1. 전체 구조

| 구분 | 기술/경로 |
|------|-----------|
| **프론트** | jQuery 3.2.1, jQuery UI, Bootstrap, Leaflet(지도), Highcharts(트리맵·막대그래프) |
| **기타 라이브러리** | Proj4, Turf.js, WKT, html2canvas, mCustomScrollbar |
| **컨텍스트** | `smgis2ContextJs = '/smgis2'` (기준 경로) |
| **지도 엔진** | Leaflet + WMTS 타일, GeoServer WFS(프록시 경유) |

---

## 2. 페이지 로드 흐름

1. **메인 HTML**  
   - `/smgis2/extMap/sttree`  
   - `#leftTab`은 비어 있고, 아래에서 AJAX로 채움.

2. **좌측 패널 HTML**  
   - PC: `POST /smgis2/extMap/sttreeTab`  
   - 모바일: `POST /smgis2/extMap/sttreeTabM`  
   - 응답: HTML 조각 (트리맵 영역 `#khZone`, 총 그루 `#ttCnt`, 통계 영역 등).

3. **탭 로드 후**  
   - `sttreeTab.js`에서 `getSggList()`, `data1()`, `ajaxTreeStat("")` 호출로 초기 데이터 로드.  
   - 트리맵/통계/수종 목록 등은 아래 API 사용.

---

## 3. 데이터 API 정리

### 3.1 좌측 패널용 (sttreeTab.js)

| 용도 | 메서드 | URL | 비고 |
|------|--------|-----|------|
| 자치구 목록 | GET | `/smgis2/sttree/getSggList` | 드롭다운 "서울시" + 구 목록 |
| 수종별 트리맵 | GET | `/smgis2/sttree/getTreeMapList?sgg_cd={코드}&type=` | sgg_cd 빈 값이면 서울 전체, Highcharts 트리맵용 |
| 한눈에 보는 통계 | GET | `/smgis2/sttree/getTreeStat?sgg_cd={코드}` | 가장 많은 수종, 자치구, 도로 |
| 수종(식물) 목록 | GET | `/smgis2/sttree/getWdptList` | 필터/등록용 수종 목록, 색상 등 |

### 3.2 지도·통계용 (sttree.js – `/qry/STTREE_V2`)

공통: `gJson(smgis2ContextJs + "/qry/STTREE_V2", dataString, callback)`  
POST 형식으로 보내는 것으로 추정되며, `dataString`에 `cmd`와 기타 파라미터 포함.

| cmd | 파라미터 | 용도 |
|-----|----------|------|
| `getTotCnt` | `settingInfo` (JSON) | 수종 필터 반영한 **총 가로수** |
| `getGarosuGeom` | `minx, miny, maxx, maxy` (지도 bounds) + `settingInfo` | 현재 지도 범위 내 가로수 **GeoJSON** (점/원·라인) |
| `getSGGCnt` | `settingInfo` | **구(자치구)별** 가로수 개수 (지도 choropleth용) |

- `settingInfo`: 수종 필터 등  
  - `selectTree`: 선택 수종 배열  
  - `etcTreeInfo`: “기타” 수종 처리용 등

### 3.3 경계/배경

| 용도 | URL/방식 | 비고 |
|------|----------|------|
| 구 경계 | `/smgis2/qry/GEO` + `cmd=SggBnd2&simplify=...` | 자치구 폴리곤 |
| 동 경계 | `/smgis2/qry/GEO` + `cmd=HumdBnd2&simplify=...` + bnd | 동 단위 경계 |
| 타일/GeoServer | `TILE_MAP_SEVER_IP` 등 (getProp/mapot_server로 획득) | 내부 타일 서버 |
| WFS | `location.origin + '/smgis2/proxy?url=http://98.33.2.93:9080/geoserver/sttree/'` + `ows?` | GeoServer WFS (프록시 경유) |

### 3.4 도로/상세

| 용도 | URL | 비고 |
|------|-----|------|
| 도로별 통계 표 | `/smgis2/sttree/getRoadStat?code={구코드}` | 도로명, 도로구분, 수량, 백분율 |
| 도로 차트 | `/smgis2/sttree/getRoadChartData?road_cd={도로코드}` | 해당 도로 수종별 차트 |
| 접속 로그 | `POST /smgis2/sttree/insertUrlAccessLog` | access_url, login_user_id 등 |

---

## 4. 주요 변수/상수 (sttree.js)

- **GEOSERVER_URL**: `origin + '/smgis2/proxy?url=http://98.33.2.93:9080/geoserver/sttree/'`
- **TILE_MAP_SEVER_IP**: `getProp/mapot_server` 응답의 `mapot_server_tile` 등
- **currMapView**: `"gu"`(구 단위) 등 시각화 모드
- **settingInfo**: 수종 필터 등, `getTotCnt` / `getGarosuGeom` / `getSGGCnt`에 공통 전달
- **wdpt_colors**: 수종별 색/체크 상태 (getWdptList 기반으로 구성된 것으로 추정)

---

## 5. 데이터 크롤링/연동 시 유의사항

1. **공식 오픈데이터 우선**  
   - [서울 열린데이터광장](https://data.seoul.go.kr/dataList/OA-1325/S/1/datasetView.do)의 “서울시 가로수 위치정보” 등 공개 데이터셋이 있으면, 이용약관을 확인한 뒤 API/파일 다운로드로 사용하는 것이 안전하고 안정적입니다.

2. **map.seoul.go.kr 직접 호출**  
   - 위 API들은 **서비스 전용**이며, 공개 API 명세가 없습니다.  
   - 크롤링·과도한 요청은 이용약관 위반·IP 제한 가능성이 있습니다.  
   - 필요한 경우 서울시 담당 부서(정원도시국 정원도시정책과 등)에 **공개 API 또는 배치 제공** 여부를 문의하는 것이 좋습니다.

3. **실제 호출 시**  
   - `/qry/STTREE_V2`는 POST로 `cmd`, `settingInfo`, bounds 등이 어떻게 인코딩되는지(폼 body vs JSON)를 브라우저 개발자 도구 Network 탭으로 확인해야 합니다.  
   - 쿠키/세션·Referer 제한이 있을 수 있어, 동일 도메인 또는 허용된 환경에서만 동작할 수 있습니다.

4. **GeoServer/WFS**  
   - `98.33.2.93` 등 내부 IP는 외부에서 직접 접근 불가이며, 반드시 `/smgis2/proxy?url=...` 경유로만 호출됩니다.

---

## 6. 요약

- **좌측 패널**: `sttreeTab`(HTML) + `getSggList`, `getTreeMapList`, `getTreeStat`, `getWdptList`로 자치구·수종별 트리맵·통계·수종 목록 표시.
- **지도**: `STTREE_V2`의 `getTotCnt` / `getGarosuGeom` / `getSGGCnt`와 `GEO`(SggBnd2, HumdBnd2), GeoServer WFS로 구·동 경계 및 가로수 공간 데이터 표시.
- **도로 상세**: `getRoadStat`, `getRoadChartData`로 도로별 통계·차트 제공.

서울 데이터를 우리 프로젝트(전국 가로수 지도)에 넣으려면, **공개 데이터셋/공식 API**를 쓰거나, 위 API를 참고해 서울시에 **데이터·API 제공 요청**을 하는 방식을 권장합니다.
