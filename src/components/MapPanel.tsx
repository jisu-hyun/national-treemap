import { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback } from "react"
import { MapContainer, TileLayer, GeoJSON, Marker, Pane, useMap, useMapEvents, ZoomControl } from "react-leaflet"
import { centroid } from "@turf/centroid"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { SIDO_TREE_COUNTS } from "../data/mock"
import type { SidoItem } from "../data/mock"
import { SIDO_ID_SEOUL, SIDO_ID_BUSAN, SIDO_ID_JEONBUK } from "../data/sidoOverrides"
import type { CityTreeData } from "../data/cityTreeData"
import type { BusanSegment } from "../data/busanSegment"
import { buildGrayMaskGeoJSON } from "../data/grayMaskUtils"
import {
  getFourStepScale,
  getStepIndex,
  getFourStepLabels,
  FOUR_STEP_COLORS,
  NO_DATA_COLOR,
} from "../data/mapClusterUtils"
/** KOSTAT 2013: 통계청 행정경계. 로컬 우선(강원 등 안정적 로드) */
const KOREA_GEOJSON_URL =
  `${import.meta.env.BASE_URL}data/skorea_provinces_geo_simple.json`
const SEOUL_TREEMAP_URL = "https://map.seoul.go.kr/smgis2/extMap/sttree"
/** 쿼리로 캐시 방지 (데이터 재생성 후에도 최신 수종 반영) */
const BUSAN_JINGU_TREES_URL = `${import.meta.env.BASE_URL}data/busan-jingu-trees.json?v=2`
/** 사하구: 좌표는 지오코딩으로 생성한 JSON */
const BUSAN_SAHA_TREES_URL = `${import.meta.env.BASE_URL}data/busan-saha-trees.json?v=1`
/** 중구: 좌표는 지오코딩으로 생성한 JSON */
const BUSAN_JUNGGU_TREES_URL = `${import.meta.env.BASE_URL}data/busan-junggu-trees.json?v=1`
/** 동래구: 좌표는 지오코딩으로 생성한 JSON */
const BUSAN_DONGNAE_TREES_URL = `${import.meta.env.BASE_URL}data/busan-dongnae-trees.json?v=1`
/** 영도구: CSV에 위경도 있음 */
const BUSAN_YEONGDO_TREES_URL = `${import.meta.env.BASE_URL}data/busan-yeongdo-trees.json?v=1`
/** 도시공간정보시스템 기반 구별 JSON (구 전용 CSV 없는 11개 구), 파일 분리로 배포 용량 분산 */
const BUSAN_UGIS_IDS = ["gangseo", "gijang", "haeundae", "buk", "geumjeong", "sasang", "nam", "yeonje", "suyeong", "dong", "seo"]
const BUSAN_UGIS_BASE = `${import.meta.env.BASE_URL}data/busan-ugis/`
/** 전북 전주시 가로수 (parse-jeonju.mjs로 생성) */
const JEONJU_TREES_URL = `${import.meta.env.BASE_URL}data/jeonju-trees.json?v=1`
/** 전북 정읍시 가로수 (parse-jeongeup.mjs로 생성) */
const JEONGEUP_TREES_URL = `${import.meta.env.BASE_URL}data/jeongeup-trees.json?v=1`
/** 전북 완주군 가로수 (parse-wanju.mjs로 생성) */
const WANJU_TREES_URL = `${import.meta.env.BASE_URL}data/wanju-trees.json?v=1`
/** 경기도 광주시 가로수 (parse-gwangju.mjs로 생성, Shapefile 기반) */
const GWANGJU_TREES_URL = `${import.meta.env.BASE_URL}data/gwangju-trees.json?v=1`
/** 경기도 용인시 가로수 (parse-yongin.mjs로 생성) */
const YONGIN_TREES_URL = `${import.meta.env.BASE_URL}data/yongin-trees.json?v=1`
/** 경기도 광명시 가로수 (parse-gwangmyeong.mjs로 생성) */
const GWANGMYEONG_TREES_URL = `${import.meta.env.BASE_URL}data/gwangmyeong-trees.json?v=1`
/** 경기도 안양시 가로수 (parse-anyang.mjs로 생성) */
const ANYANG_TREES_URL = `${import.meta.env.BASE_URL}data/anyang-trees.json?v=1`
/** 경기도 양평군 가로수 (parse-yangpyeong.mjs로 생성) */
const YANGPYEONG_TREES_URL = `${import.meta.env.BASE_URL}data/yangpyeong-trees.json?v=1`
/** 경기도 의정부시 가로수 (parse-uijeongbu.mjs로 생성) */
const UIJEONGBU_TREES_URL = `${import.meta.env.BASE_URL}data/uijeongbu-trees.json?v=1`
/** 경기도 고양시 가로수 (parse-goyang.mjs로 생성) */
const GOYANG_TREES_URL = `${import.meta.env.BASE_URL}data/goyang-trees.json?v=1`
/** 경기도 안산시 가로수 (parse-ansan.mjs로 생성) */
const ANSAN_TREES_URL = `${import.meta.env.BASE_URL}data/ansan-trees.json?v=1`
/** 경기도 의왕시 가로수 (parse-uiwang.mjs로 생성) */
const UIWANG_TREES_URL = `${import.meta.env.BASE_URL}data/uiwang-trees.json?v=1`
/** 경기도 과천시 가로수 (parse-gwacheon.mjs로 생성) */
const GWACHEON_TREES_URL = `${import.meta.env.BASE_URL}data/gwacheon-trees.json?v=1`
/** 전국 뷰에서 잡아둔 범위 — 확대했을 때도 이 범위 밖으로 패닝 불가 */
const nationalViewBoundsRef: { current: L.LatLngBounds | null } = { current: null }

/** 전국 뷰 초기 줌 (새로고침·전국 진입 시 고정) */
const NATIONAL_DEFAULT_ZOOM = 8
/** 전국 뷰에서 허용하는 최소 줌. 한 단계 더 축소 가능(7), 초점·패닝 고정은 유지 */
const NATIONAL_MIN_ZOOM = 7
/** 전국 뷰 목표 중심 오프셋 (bounds 중심 기준). lat 음수=남쪽(제주), lng 음수=서쪽(왼쪽) */
const NATIONAL_VIEW_CENTER_OFFSET_LAT = -0.2
const NATIONAL_VIEW_CENTER_OFFSET_LNG = 0.28

/** 한반도 대략 중심 + 오프셋 (MapContainer 초기값·리렌더 시 동기화용, GeoJSON 로드 전에도 동일 위치) */
const KOREA_APPROX_CENTER: L.LatLngTuple = [36.35, 127.9]
const INITIAL_NATIONAL_CENTER: L.LatLngTuple = [
  KOREA_APPROX_CENTER[0] + NATIONAL_VIEW_CENTER_OFFSET_LAT,
  KOREA_APPROX_CENTER[1] + NATIONAL_VIEW_CENTER_OFFSET_LNG,
]

function getNationalViewCenter(bounds: L.LatLngBounds): L.LatLngTuple {
  const c = bounds.getCenter()
  return [c.lat + NATIONAL_VIEW_CENTER_OFFSET_LAT, c.lng + NATIONAL_VIEW_CENTER_OFFSET_LNG]
}

/** 전국 뷰: 현재 뷰 고정(패닝 제한). 축소는 NATIONAL_MIN_ZOOM(7)까지 허용 */
function lockNationalView(map: L.Map) {
  map.setMinZoom(NATIONAL_MIN_ZOOM)
  const b = map.getBounds()
  map.setMaxBounds(b)
  nationalViewBoundsRef.current = b
}

/** 전국 뷰 초점 한 번만 적용 (setView 사용, panBy 제거로 누적/위로 올라가는 현상 방지) */
function applyNationalViewPosition(map: L.Map, bounds: L.LatLngBounds) {
  const center = getNationalViewCenter(bounds)
  map.setView(center, NATIONAL_DEFAULT_ZOOM)
  lockNationalView(map)
}

const regionBoundsRef: { current: Record<string, L.LatLngBounds> } = { current: {} }

/** flyToBounds/fitBounds 직후 zoomend가 애니메이션 중 z<=8로 오인해 전국 전환하는 것 방지 */
const programmaticZoomUntilRef: { current: number } = { current: 0 }

/** 줌아웃으로 자동 전국 전환 시 flyToBounds 건너뛰기 (사용자 줌 위치 유지) */
const skipFlyToNationalRef: { current: boolean } = { current: false }

/** GeoJSON 로드 시 이미 전국 뷰(fitBounds+pan) 적용했으면 RegionZoomController에서 flyToBounds 생략 → 새로고침 시 초점 한 번만 이동 */
const nationalViewSetByGeoJSONRef: { current: boolean } = { current: false }

/** StrictMode 이중 실행·연속 트리거로 zoom 두 번 되는 것 방지 */
const lastZoomedRef: { current: { region: string; at: number } | null } = { current: null }
const ZOOM_DEDUPE_MS = 1500

/** KOSTAT 2013 GeoJSON code → 앱 시도 id (행정구역코드) */
const KOSTAT_CODE_TO_APP_ID: Record<string, string> = {
  "11": "11",   // 서울
  "21": "26",   // 부산
  "22": "27",   // 대구
  "23": "28",   // 인천
  "24": "29",   // 광주
  "25": "30",   // 대전
  "26": "31",   // 울산
  "29": "36",   // 세종
  "31": "41",   // 경기
  "32": "42",   // 강원
  "33": "43",   // 충북
  "34": "44",   // 충남
  "35": "45",   // 전북
  "36": "46",   // 전남
  "37": "47",   // 경북
  "38": "48",   // 경남
  "39": "50",   // 제주
}

/** KOSTAT 시도명 → 앱 시도명 (스타일/툴팁용) */
const KOSTAT_NAME_TO_APP: Record<string, string> = {
  강원도: "강원특별자치도",
  전라북도: "전북특별자치도",
}

/** 시도명 → 앱 id (code 누락/불일치 시 fallback) */
const SIDO_NAME_TO_APP_ID: Record<string, string> = {
  강원도: "42",
  강원특별자치도: "42",
  전라북도: "45",
  전북특별자치도: "45",
}

function getFeatureName(props: Record<string, unknown> | null): string {
  const raw = (props?.name as string) ?? ""
  return KOSTAT_NAME_TO_APP[raw] ?? raw
}

function getFeatureAppId(props: Record<string, unknown> | null): string | null {
  const code = String(props?.code ?? "")
  const byCode = KOSTAT_CODE_TO_APP_ID[code]
  if (byCode) return byCode
  const name = (props?.name as string) ?? ""
  return SIDO_NAME_TO_APP_ID[name] ?? null
}

function filterPolysByLng(
  coords: GeoJSON.MultiPolygon["coordinates"],
  pred: (minLng: number, maxLng: number) => boolean
): GeoJSON.MultiPolygon["coordinates"] {
  return coords.filter((ring) => {
    const flat = ring[0].flat() as number[]
    const lngs = flat.filter((_, i) => i % 2 === 0)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    return pred(minLng, maxLng)
  })
}

/** 경상북도: 울릉도 제외. 인천: 백령도·대청도 등 서쪽 도서 제외 (줌 시 해상 빈 공간 방지) */
function getFeatureBounds(f: GeoJSON.Feature, appId: string | null): L.LatLngBounds | null {
  try {
    const geom = f.geometry
    if (!geom || geom.type === "Point") return null

    if (geom.type === "MultiPolygon" && geom.coordinates?.length > 1) {
      let filtered: GeoJSON.MultiPolygon["coordinates"] | null = null
      if (appId === "47") {
        filtered = filterPolysByLng(geom.coordinates, (_, max) => max < 130.5)
      } else if (appId === "28") {
        filtered = filterPolysByLng(geom.coordinates, (_, max) => max > 125.5)
      }
      if (filtered && filtered.length > 0) {
        const feature: GeoJSON.Feature = {
          type: "Feature",
          properties: f.properties,
          geometry: { type: "MultiPolygon", coordinates: filtered },
        }
        const b = L.geoJSON(feature).getBounds()
        return b?.isValid?.() ? b : null
      }
    }

    const b = L.geoJSON(f as GeoJSON.Feature).getBounds()
    return b?.isValid?.() ? b : null
  } catch {
    return null
  }
}

/** 라벨 위치: 필터 대상(경북·인천)은 bounds 중심 사용, 그 외는 centroid (확대 시 화면 안에 보이도록) */
function getFeatureLabelPoint(f: GeoJSON.Feature, appId: string | null): [number, number] | null {
  const b = getFeatureBounds(f, appId)
  if (b?.isValid?.()) {
    const c = b.getCenter()
    return [c.lat, c.lng]
  }
  try {
    const pt = centroid(f as GeoJSON.Feature)
    const [lng, lat] = pt.geometry.coordinates
    return [lat, lng]
  } catch {
    return null
  }
}

function getColorNational(count: number, scale: { breaks: [number, number, number, number]; colors: string[] }): string {
  if (count === 0) return NO_DATA_COLOR
  const idx = getStepIndex(count, scale.breaks)
  return scale.colors[idx] ?? FOUR_STEP_COLORS[3]
}

const koreaBoundsRef: { current: L.LatLngBounds | null } = { current: null }

/** 부산·전주 등 구간 원형 마커 표시 줌 (이 이상이면 그레이 마스크·배경 숨김). 10 = 덜 확대 */
const DETAIL_MARKER_ZOOM = 10
const BUSAN_MARKER_ZOOM = DETAIL_MARKER_ZOOM
/** 이 줌 이상이면 원클러스터 대신 개별 원(구간별 원 마커) 표시 */
const INDIVIDUAL_MARKER_ZOOM = 13
/** 구간별 가로수 데이터가 있는 시도 (부산·전북·경기). 이외 지역은 세부 데이터 없음 안내 표시 */
const REGIONS_WITH_DETAIL = ["26", "45", "41"]
/** 개별 원 표시 시 화면 내 마커만 렌더, 이 개수 초과 시 잘라서 렉 방지 */
const MAX_VISIBLE_INDIVIDUAL_MARKERS = 500

/** 기본·확대 공통: CARTO Voyager(따뜻한 톤, 자연스러운 지형). Light 대비 시인성·디자인 개선 */
const TILE_CARTO_VOYAGER = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png"

function TileLayerByView() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
      url={TILE_CARTO_VOYAGER}
      crossOrigin="anonymous"
    />
  )
}

/** 원 크기 범례 구간 (전체 구간 마커 공통): 100, 500, 5000 그루 */
const BUSAN_LEGEND_BREAKS = { low: 100, high: 500, xlarge: 5000 }

/** 원 반지름(px) · 범례와 지도에서 동일 사용 (부산·전북·경기 등 전체 적용) */
const BUSAN_CIRCLE_RADIUS = { small: 8, medium: 14, large: 22, xlarge: 32 } as const

/** 부산 원 색상 · 범례와 지도에서 동일 사용 */
const BUSAN_CIRCLE_STYLE = {
  fill: "#059669",
  stroke: "#047857",
  fillOpacity: 0.75,
  strokeWidth: 1.5,
} as const

/** 전국: 색깔 구간 범례. 부산 확대(원형 마커): 원 크기 = 그루 수 구간(100·500 그루 기준). 모바일에서는 눌러야 표시 */
function MapLegendOverlay({
  region: _region,
  nationalFourStep,
}: {
  region: string
  nationalFourStep: { breaks: [number, number, number, number]; colors: string[] }
}) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [mobileLegendOpen, setMobileLegendOpen] = useState(false)
  useMapEvents({
    zoom: () => setZoom(map.getZoom()),
    zoomend: () => setZoom(map.getZoom()),
  })
  const showCircleLegend = zoom >= DETAIL_MARKER_ZOOM
  const { low, high, xlarge } = BUSAN_LEGEND_BREAKS
  const r = BUSAN_CIRCLE_RADIUS
  const legendCircleStyle = (radius: number) => ({
    width: radius * 2,
    height: radius * 2,
    backgroundColor: `rgba(5, 150, 105, ${BUSAN_CIRCLE_STYLE.fillOpacity})`,
    border: `${BUSAN_CIRCLE_STYLE.strokeWidth}px solid ${BUSAN_CIRCLE_STYLE.stroke}`,
    borderRadius: "50%",
    boxSizing: "border-box" as const,
  })

  const legendContent = (
    <>
      {showCircleLegend ? (
        <>
          <div className="font-semibold text-slate-800 mb-1.5 text-[13px] tracking-wide">
            원 크기 설명 (단위: 그루)
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-block shrink-0" style={legendCircleStyle(r.small)} />
              <span className="text-[12px] text-slate-600 leading-tight">0 ~ {low.toLocaleString()} 그루</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block shrink-0" style={legendCircleStyle(r.medium)} />
              <span className="text-[12px] text-slate-600 leading-tight">{(low + 1).toLocaleString()} ~ {high.toLocaleString()} 그루</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block shrink-0" style={legendCircleStyle(r.large)} />
              <span className="text-[12px] text-slate-600 leading-tight">{(high + 1).toLocaleString()} ~ {xlarge.toLocaleString()} 그루</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block shrink-0" style={legendCircleStyle(r.xlarge)} />
              <span className="text-[12px] text-slate-600 leading-tight">{(xlarge + 1).toLocaleString()} 그루 이상</span>
            </div>
          </div>
          <p className="text-[12px] text-amber-700 mt-1.5 bg-amber-50 rounded px-1.5 py-0.5 leading-tight">
            원이 <strong className="font-semibold">클수록</strong> 나무가 더 많아요.
          </p>
        </>
      ) : (
        <>
          <div className="font-semibold text-slate-800 mb-1.5 text-[13px] tracking-wide">
            색깔 설명 (단위: 그루)
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm border border-slate-300 shrink-0" style={{ backgroundColor: NO_DATA_COLOR }} />
              <span className="text-[12px] text-slate-600 leading-tight">0 (데이터 없음)</span>
            </div>
            {getFourStepLabels(nationalFourStep.breaks).map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm border border-slate-300 shrink-0" style={{ backgroundColor: nationalFourStep.colors[i] }} />
                <span className="text-[12px] text-slate-600 leading-tight">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-amber-700 mt-1.5 bg-amber-50 rounded px-1.5 py-0.5 leading-tight">
            색이 <strong className="font-semibold">진할수록</strong> 나무가 더 많아요.
          </p>
        </>
      )}
    </>
  )

  return (
    <div
      className="absolute left-4 bottom-3 z-[999] w-[220px] shrink-0 sm:pointer-events-none pointer-events-auto"
      aria-hidden
    >
      {/* 모바일: 닫힐 때는 버튼만 표시 */}
      <div className="sm:hidden">
        {!mobileLegendOpen ? (
          <button
            type="button"
            onClick={() => setMobileLegendOpen(true)}
            className="w-full bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/80 px-3 py-2.5 text-xs font-medium text-slate-700 flex items-center justify-center gap-1.5 min-h-[40px] hover:bg-white transition-colors"
            aria-label="범례 보기"
          >
            <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343L12.657 5.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            범례
          </button>
        ) : (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/80 px-3 py-2.5 text-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-semibold text-slate-800 text-[13px] tracking-wide">범례</span>
              <button
                type="button"
                onClick={() => setMobileLegendOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors -mr-1"
                aria-label="범례 닫기"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {legendContent}
          </div>
        )}
      </div>
      {/* 데스크톱: 항상 범례 표시 */}
      <div className="hidden sm:block bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/80 px-3 py-2.5 text-xs">
        {legendContent}
      </div>
    </div>
  )
}

function GrayMaskLayer({ region: _region, zoom }: { region: string; zoom: number }) {
  const [maskGeoJson, setMaskGeoJson] = useState<GeoJSON.Polygon | null>(null)

  useEffect(() => {
    fetch(KOREA_GEOJSON_URL)
      .then((r) => r.json())
      .then((data: GeoJSON.FeatureCollection) => {
        const mask = buildGrayMaskGeoJSON(data.features ?? [])
        setMaskGeoJson(mask)
      })
      .catch(() => setMaskGeoJson(null))
  }, [])

  if (!maskGeoJson) return null
  if (zoom >= DETAIL_MARKER_ZOOM) return null

  return (
    <GeoJSON
      key="gray-mask"
      data={maskGeoJson}
      style={{
        fillColor: "#9ca3af",
        fillOpacity: 0.45,
        weight: 0,
        color: "transparent",
        interactive: false,
      }}
    />
  )
}

function MapRefSetter({
  mapRef,
}: {
  mapRef: React.MutableRefObject<L.Map | null>
}) {
  const map = useMap()
  useEffect(() => {
    mapRef.current = map
    return () => {
      mapRef.current = null
    }
  }, [map, mapRef])
  return null
}

const FLY_DURATION = 0.6

const PROGRAMMATIC_ZOOM_COOLDOWN_MS = 2500

/** 반응형: 지도 컨테이너 리사이즈 시 Leaflet 크기 갱신 (페이지/창 커지면 지도도 같이 커지도록) */
function MapResizeSync() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    if (!container) return
    const ro = new ResizeObserver(() => {
      map.invalidateSize()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [map])
  return null
}

function RegionZoomController({
  region,
  boundsReady,
  onNationalMinZoomApplied,
}: {
  region: string
  boundsReady: boolean
  onNationalMinZoomApplied?: (zoom: number) => void
}) {
  const map = useMap()

  useLayoutEffect(() => {
    if (region !== "00") {
      // 지역 선택 시 한반도 전체 범위 안에서 자유롭게 패닝 (창 크기와 무관)
      const bounds = koreaBoundsRef.current
      if (bounds?.isValid?.()) map.setMaxBounds(bounds)
      if (!boundsReady) return
    } else if (!boundsReady) return
    const now = Date.now()
    if (lastZoomedRef.current?.region === region && now - lastZoomedRef.current.at < ZOOM_DEDUPE_MS) return
    lastZoomedRef.current = { region, at: now }
    programmaticZoomUntilRef.current = now + PROGRAMMATIC_ZOOM_COOLDOWN_MS
    const opts = { duration: FLY_DURATION }
    if (region === "00") {
      if (skipFlyToNationalRef.current) {
        skipFlyToNationalRef.current = false
        lockNationalView(map)
        return
      }
      if (nationalViewSetByGeoJSONRef.current) {
        nationalViewSetByGeoJSONRef.current = false
        lockNationalView(map)
        return
      }
      if (koreaBoundsRef.current?.isValid?.()) {
        const bounds = koreaBoundsRef.current
        const center = getNationalViewCenter(bounds)
        map.flyTo(center, NATIONAL_DEFAULT_ZOOM, opts)
        map.once("moveend", () => {
          lockNationalView(map)
          onNationalMinZoomApplied?.(NATIONAL_MIN_ZOOM)
        })
      }
    } else {
      const bounds = regionBoundsRef.current[region]
      if (bounds?.isValid?.()) {
        const center = bounds.getCenter()
        /** 지역 확대 시 최소 줌. 전북(45)·부산(26)은 원클러스터가 보이도록 11 이상 */
        const REGION_MIN_ZOOM = 10
        const minZoomForDetail = (region === "26" || region === "45" || region === "41") ? DETAIL_MARKER_ZOOM : REGION_MIN_ZOOM
        if (region === "42") {
          map.flyTo(center, Math.max(9, REGION_MIN_ZOOM), opts)
        } else if (region === "46") {
          map.flyTo(center, Math.max(9, REGION_MIN_ZOOM), opts)
        } else {
          map.flyToBounds(bounds, { padding: [8, 8], maxZoom: 14, ...opts })
          map.once("moveend", () => {
            const z = map.getZoom()
            if (z < minZoomForDetail) map.setZoom(minZoomForDetail)
          })
        }
      }
    }
  }, [region, map, boundsReady])

  return null
}

function getBusanRadius(trees: number): number {
  if (trees <= BUSAN_LEGEND_BREAKS.low) return BUSAN_CIRCLE_RADIUS.small
  if (trees <= BUSAN_LEGEND_BREAKS.high) return BUSAN_CIRCLE_RADIUS.medium
  if (trees <= BUSAN_LEGEND_BREAKS.xlarge) return BUSAN_CIRCLE_RADIUS.large
  return BUSAN_CIRCLE_RADIUS.xlarge
}

/** 개별 원 마커용 divIcon — 최신형 디자인·모션 적용 */
function getIndividualCircleDivIcon(m: BusanSegment, selected: boolean): L.DivIcon {
  const radius = getBusanRadius(m.trees)
  const size = radius * 2
  const selectedClass = selected ? " is-selected" : ""
  return L.divIcon({
    html: `<div class="street-tree-individual-circle${selectedClass}" style="width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;--individual-size:${size}px" aria-label="${m.trees}그루"></div>`,
    className: "street-tree-individual-marker",
    iconSize: [size, size],
    iconAnchor: [radius, radius],
  })
}

function isSameSegment(a: BusanSegment | null, b: BusanSegment): boolean {
  return a != null && a.lat === b.lat && a.lng === b.lng && a.name === b.name
}

/** 한국 범위: 위도 33~43, 경도 124~132. 데이터에 lat/lng가 바뀌어 있으면 보정해 [lat, lng] 반환 */
function segmentCenter(m: BusanSegment): [number, number] {
  const { lat, lng } = m
  const likelySwapped = lat >= 90 || (lat > 50 && lng < 90) || (lat >= 124 && lat <= 135 && lng >= 33 && lng <= 43)
  if (likelySwapped) return [lng, lat]
  return [lat, lng]
}

/** 부산 행정구역 대략 범위 (지오코딩 오류로 서울 등 타 지역 좌표가 섞인 마커 제외용) */
const BUSAN_BOUNDS = { latMin: 34.85, latMax: 35.55, lngMin: 128.7, lngMax: 129.55 }
function isInBusanBounds(m: BusanSegment): boolean {
  const [lat, lng] = segmentCenter(m)
  return lat >= BUSAN_BOUNDS.latMin && lat <= BUSAN_BOUNDS.latMax && lng >= BUSAN_BOUNDS.lngMin && lng <= BUSAN_BOUNDS.lngMax
}

/** 그리드 클러스터: bounds를 격자로 나누고 구간을 셀에 모아 합계·중심·셀 인덱스 반환 (원클러스터용) */
export type ClusterPoint = { lat: number; lng: number; trees: number; cellR: number; cellC: number }
function gridCluster(segments: BusanSegment[], bounds: L.LatLngBounds, zoom: number): ClusterPoint[] {
  const ne = bounds.getNorthEast()
  const sw = bounds.getSouthWest()
  const latMin = sw.lat
  const latMax = ne.lat
  const lngMin = sw.lng
  const lngMax = ne.lng
  const gridN = Math.min(24, Math.max(4, 4 * 2 ** (zoom - DETAIL_MARKER_ZOOM)))
  const cellLat = (latMax - latMin) / gridN
  const cellLng = (lngMax - lngMin) / gridN
  const key = (r: number, c: number) => `${r},${c}`
  const cells = new Map<string, { latSum: number; lngSum: number; trees: number; count: number; cellR: number; cellC: number }>()
  for (const m of segments) {
    const [lat, lng] = segmentCenter(m)
    if (!bounds.contains([lat, lng])) continue
    const r = Math.min(gridN - 1, Math.floor((lat - latMin) / cellLat))
    const c = Math.min(gridN - 1, Math.floor((lng - lngMin) / cellLng))
    const k = key(r, c)
    const cur = cells.get(k)
    if (!cur) {
      cells.set(k, { latSum: lat, lngSum: lng, trees: m.trees, count: 1, cellR: r, cellC: c })
    } else {
      cur.latSum += lat
      cur.lngSum += lng
      cur.trees += m.trees
      cur.count += 1
    }
  }
  const out: ClusterPoint[] = []
  cells.forEach((v) => {
    out.push({
      lat: v.latSum / v.count,
      lng: v.lngSum / v.count,
      trees: v.trees,
      cellR: v.cellR,
      cellC: v.cellC,
    })
  })
  return out
}

function getCellForSegment(m: BusanSegment, bounds: L.LatLngBounds, zoom: number): { r: number; c: number } | null {
  const [lat, lng] = segmentCenter(m)
  if (!bounds.contains([lat, lng])) return null
  const ne = bounds.getNorthEast()
  const sw = bounds.getSouthWest()
  const gridN = Math.min(24, Math.max(4, 4 * 2 ** (zoom - DETAIL_MARKER_ZOOM)))
  const cellLat = (ne.lat - sw.lat) / gridN
  const cellLng = (ne.lng - sw.lng) / gridN
  const r = Math.min(gridN - 1, Math.floor((lat - sw.lat) / cellLat))
  const c = Math.min(gridN - 1, Math.floor((lng - sw.lng) / cellLng))
  return { r, c }
}

function getSegmentsInCell(segments: BusanSegment[], bounds: L.LatLngBounds, zoom: number, cellR: number, cellC: number): BusanSegment[] {
  return segments.filter((m) => {
    const cell = getCellForSegment(m, bounds, zoom)
    return cell != null && cell.r === cellR && cell.c === cellC
  })
}

/** 화면 내 마커만 남기고, 개수 제한 초과 시 선택된 구간은 유지한 채 잘라서 반환 (렉 방지) */
function getVisibleCappedMarkers(
  markers: BusanSegment[],
  bounds: L.LatLngBounds | null,
  selectedSegment: BusanSegment | null,
  max: number
): BusanSegment[] {
  const visible = bounds?.isValid?.()
    ? markers.filter((m) => bounds.contains(segmentCenter(m)))
    : markers
  if (visible.length <= max) return visible
  const selectedInVisible = selectedSegment && visible.some((m) => isSameSegment(selectedSegment, m))
  if (!selectedInVisible) return visible.slice(0, max)
  return [
    selectedSegment,
    ...visible.filter((m) => !isSameSegment(selectedSegment, m)).slice(0, max - 1),
  ]
}

/** 원클러스터용 원 반지름 (그루 수). 글자 크기 확보·가독성 위해 개별 원보다 크게 */
function getClusterRadius(trees: number): number {
  if (trees <= BUSAN_LEGEND_BREAKS.low) return 20
  if (trees <= BUSAN_LEGEND_BREAKS.high) return 28
  if (trees <= BUSAN_LEGEND_BREAKS.xlarge) return 36
  return 46
}

/** 원클러스터 마커용 divIcon (원 안에 숫자) */
function getClusterDivIcon(trees: number, selected: boolean): L.DivIcon {
  const radius = getClusterRadius(trees)
  const size = radius * 2
  const countStr = Number(trees).toLocaleString()
  const selectedClass = selected ? " is-selected" : ""
  return L.divIcon({
    html: `<div class="street-tree-cluster-circle${selectedClass}" style="--cluster-size:${size}px;width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px"><span class="street-tree-cluster-count">${countStr}</span><span class="street-tree-cluster-unit">그루</span></div>`,
    className: "street-tree-cluster-marker",
    iconSize: [size, size],
    iconAnchor: [radius, radius],
  })
}

function BusanJinguMarkers({
  region: _region,
  zoom,
  bounds,
  markers,
  selectedSegment,
  onSegmentSelect,
  onOpenLeft,
}: {
  region: string
  zoom: number
  bounds: L.LatLngBounds | null
  markers: BusanSegment[]
  selectedSegment: BusanSegment | null
  onSegmentSelect: (s: BusanSegment) => void
  onOpenLeft?: () => void
}) {
  const map = useMap()
  const inBounds = useMemo(() => markers.filter(isInBusanBounds), [markers])
  const boundsKey = bounds?.isValid?.() ? `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}` : ""
  const clusters = useMemo(
    () => (zoom < INDIVIDUAL_MARKER_ZOOM && bounds?.isValid?.() ? gridCluster(inBounds, bounds, zoom) : []),
    [inBounds, boundsKey, zoom]
  )

  if (markers.length === 0) return null
  if (zoom < BUSAN_MARKER_ZOOM) return null

  if (zoom < INDIVIDUAL_MARKER_ZOOM && bounds?.isValid?.()) {
    const selectedCell = selectedSegment ? getCellForSegment(selectedSegment, bounds, zoom) : null
    return (
      <Pane name="busan-markers" style={{ zIndex: 600 }}>
        {clusters.map((cl, i) => {
          const selected = selectedCell != null && cl.cellR === selectedCell.r && cl.cellC === selectedCell.c
          return (
            <Marker
              key={`${cl.cellR}-${cl.cellC}-${i}`}
              position={[cl.lat, cl.lng]}
              icon={getClusterDivIcon(cl.trees, selected)}
              eventHandlers={{
                click: () => {
                  map.flyTo([cl.lat, cl.lng], INDIVIDUAL_MARKER_ZOOM, { duration: FLY_DURATION })
                  const segs = getSegmentsInCell(inBounds, bounds, zoom, cl.cellR, cl.cellC)
                  const best = segs.length ? segs.reduce((a, b) => (a.trees >= b.trees ? a : b)) : null
                  if (best) onSegmentSelect(best)
                  onOpenLeft?.()
                },
              }}
            />
          )
        })}
      </Pane>
    )
  }

  const toRender = getVisibleCappedMarkers(inBounds, bounds, selectedSegment, MAX_VISIBLE_INDIVIDUAL_MARKERS)
  return (
    <Pane name="busan-markers" style={{ zIndex: 600 }}>
      {toRender.map((m, i) => {
        const selected = isSameSegment(selectedSegment, m)
        return (
          <Marker
            key={`${m.lat}-${m.lng}-${i}`}
            position={segmentCenter(m)}
            icon={getIndividualCircleDivIcon(m, selected)}
            eventHandlers={{
              click: () => {
                onSegmentSelect(m)
                onOpenLeft?.()
              },
            }}
          />
        )
      })}
    </Pane>
  )
}

/** 전주·정읍·완주·경기 광주 구간 마커 (줌 일정 이상: 원클러스터 → 더 확대 시 개별 원) */
function Region45Markers({
  region: _region,
  zoom,
  bounds,
  markers,
  selectedSegment,
  onSegmentSelect,
  onOpenLeft,
  paneName,
}: {
  region: string
  zoom: number
  bounds: L.LatLngBounds | null
  markers: BusanSegment[]
  selectedSegment: BusanSegment | null
  onSegmentSelect: (s: BusanSegment) => void
  onOpenLeft?: () => void
  paneName: string
  regionId?: string
}) {
  const map = useMap()
  const boundsKey = bounds?.isValid?.() ? `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}` : ""
  const clusters = useMemo(
    () => (zoom < INDIVIDUAL_MARKER_ZOOM && bounds?.isValid?.() ? gridCluster(markers, bounds, zoom) : []),
    [markers, boundsKey, zoom]
  )

  if (markers.length === 0) return null
  if (zoom < DETAIL_MARKER_ZOOM) return null

  if (zoom < INDIVIDUAL_MARKER_ZOOM && bounds?.isValid?.()) {
    const selectedCell = selectedSegment ? getCellForSegment(selectedSegment, bounds, zoom) : null
    return (
      <Pane name={paneName} style={{ zIndex: 600 }}>
        {clusters.map((cl, i) => {
          const selected = selectedCell != null && cl.cellR === selectedCell.r && cl.cellC === selectedCell.c
          return (
            <Marker
              key={`${cl.cellR}-${cl.cellC}-${paneName}-${i}`}
              position={[cl.lat, cl.lng]}
              icon={getClusterDivIcon(cl.trees, selected)}
              eventHandlers={{
                click: () => {
                  map.flyTo([cl.lat, cl.lng], INDIVIDUAL_MARKER_ZOOM, { duration: FLY_DURATION })
                  const segs = getSegmentsInCell(markers, bounds, zoom, cl.cellR, cl.cellC)
                  const best = segs.length ? segs.reduce((a, b) => (a.trees >= b.trees ? a : b)) : null
                  if (best) onSegmentSelect(best)
                  onOpenLeft?.()
                },
              }}
            />
          )
        })}
      </Pane>
    )
  }

  const toRender = getVisibleCappedMarkers(markers, bounds, selectedSegment, MAX_VISIBLE_INDIVIDUAL_MARKERS)
  return (
    <Pane name={paneName} style={{ zIndex: 600 }}>
      {toRender.map((m, i) => {
        const selected = isSameSegment(selectedSegment, m)
        return (
          <Marker
            key={`${m.lat}-${m.lng}-${m.name}-${i}`}
            position={segmentCenter(m)}
            icon={getIndividualCircleDivIcon(m, selected)}
            eventHandlers={{
              click: () => {
                onSegmentSelect(m)
                onOpenLeft?.()
              },
            }}
          />
        )
      })}
    </Pane>
  )
}

function MapContent({
  region,
  mapRef,
  sidoCounts,
  busanMarkers,
  jeonjuMarkers,
  jeongeupMarkers,
  wanjuMarkers,
  gwangjuMarkers,
  yonginMarkers,
  gwangmyeongMarkers,
  anyangMarkers,
  yangpyeongMarkers,
  uijeongbuMarkers,
  goyangMarkers,
  ansanMarkers,
  uiwangMarkers,
  gwacheonMarkers,
  onRegionSelect,
  selectedBusanSegment,
  selectedJeonjuSegment,
  selectedJeongeupSegment,
  selectedWanjuSegment,
  selectedGwangjuSegment,
  selectedYonginSegment,
  selectedGwangmyeongSegment,
  selectedAnyangSegment,
  selectedYangpyeongSegment,
  selectedUijeongbuSegment,
  selectedGoyangSegment,
  selectedAnsanSegment,
  selectedUiwangSegment,
  selectedGwacheonSegment,
  onBusanSegmentSelect,
  onJeonjuSegmentSelect,
  onJeongeupSegmentSelect,
  onWanjuSegmentSelect,
  onGwangjuSegmentSelect,
  onYonginSegmentSelect,
  onGwangmyeongSegmentSelect,
  onAnyangSegmentSelect,
  onYangpyeongSegmentSelect,
  onUijeongbuSegmentSelect,
  onGoyangSegmentSelect,
  onAnsanSegmentSelect,
  onUiwangSegmentSelect,
  onGwacheonSegmentSelect,
  onOpenLeft,
  onNationalMinZoomApplied,
  effectiveMinZoom,
  onInitialNationalViewReady,
}: {
  region: string
  mapRef: React.MutableRefObject<L.Map | null>
  sidoCounts: SidoItem[]
  busanMarkers: BusanSegment[]
  jeonjuMarkers: BusanSegment[]
  jeongeupMarkers: BusanSegment[]
  wanjuMarkers: BusanSegment[]
  gwangjuMarkers: BusanSegment[]
  yonginMarkers: BusanSegment[]
  gwangmyeongMarkers: BusanSegment[]
  anyangMarkers: BusanSegment[]
  yangpyeongMarkers: BusanSegment[]
  uijeongbuMarkers: BusanSegment[]
  goyangMarkers: BusanSegment[]
  ansanMarkers: BusanSegment[]
  uiwangMarkers: BusanSegment[]
  gwacheonMarkers: BusanSegment[]
  onRegionSelect: (value: string) => void
  selectedBusanSegment: BusanSegment | null
  selectedJeonjuSegment: BusanSegment | null
  selectedJeongeupSegment: BusanSegment | null
  selectedWanjuSegment: BusanSegment | null
  selectedGwangjuSegment: BusanSegment | null
  selectedYonginSegment: BusanSegment | null
  selectedGwangmyeongSegment: BusanSegment | null
  selectedAnyangSegment: BusanSegment | null
  selectedYangpyeongSegment: BusanSegment | null
  selectedUijeongbuSegment: BusanSegment | null
  selectedGoyangSegment: BusanSegment | null
  selectedAnsanSegment: BusanSegment | null
  selectedUiwangSegment: BusanSegment | null
  selectedGwacheonSegment: BusanSegment | null
  onBusanSegmentSelect: (s: BusanSegment) => void
  onJeonjuSegmentSelect: (s: BusanSegment) => void
  onJeongeupSegmentSelect: (s: BusanSegment) => void
  onWanjuSegmentSelect: (s: BusanSegment) => void
  onGwangjuSegmentSelect: (s: BusanSegment) => void
  onYonginSegmentSelect: (s: BusanSegment) => void
  onGwangmyeongSegmentSelect: (s: BusanSegment) => void
  onAnyangSegmentSelect: (s: BusanSegment) => void
  onYangpyeongSegmentSelect: (s: BusanSegment) => void
  onUijeongbuSegmentSelect: (s: BusanSegment) => void
  onGoyangSegmentSelect: (s: BusanSegment) => void
  onAnsanSegmentSelect: (s: BusanSegment) => void
  onUiwangSegmentSelect: (s: BusanSegment) => void
  onGwacheonSegmentSelect: (s: BusanSegment) => void
  onOpenLeft?: () => void
  onNationalMinZoomApplied?: (zoom: number) => void
  effectiveMinZoom: number
  onInitialNationalViewReady?: () => void
}) {
  const map = useMap()
  const [boundsReady, setBoundsReady] = useState(false)
  const [zoom, setZoom] = useState(() => map.getZoom())
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(() => map.getBounds())
  const boundsRafRef = useRef<number | null>(null)
  const setBoundsDeferred = useCallback(() => {
    if (boundsRafRef.current != null) return
    boundsRafRef.current = requestAnimationFrame(() => {
      boundsRafRef.current = null
      setMapBounds(map.getBounds())
    })
  }, [map])
  useMapEvents({
    zoom: () => setZoom(map.getZoom()),
    moveend: () => setBoundsDeferred(),
    zoomend: () => {
      setZoom(map.getZoom())
      setMapBounds(map.getBounds())
      if (Date.now() < programmaticZoomUntilRef.current) return
      const z = map.getZoom()
      if (region !== "00" && z < 8) {
        skipFlyToNationalRef.current = true
        onRegionSelect("00")
      }
    },
  })

  useEffect(() => {
    map.setMinZoom(effectiveMinZoom)
  }, [map, effectiveMinZoom])

  return (
    <>
      <MapResizeSync />
      <GrayMaskLayer region={region} zoom={zoom} />
      <KoreaGeoJSONLayer
        region={region}
        sidoCounts={sidoCounts}
        onRegionSelect={onRegionSelect}
        onBoundsReady={setBoundsReady}
        onNationalMinZoomApplied={onNationalMinZoomApplied}
        onInitialNationalViewReady={onInitialNationalViewReady}
      />
      <BusanJinguMarkers
        region={region}
        zoom={zoom}
        bounds={mapBounds}
        markers={busanMarkers}
        selectedSegment={selectedBusanSegment}
        onSegmentSelect={onBusanSegmentSelect}
        onOpenLeft={onOpenLeft}
      />
      <Region45Markers
        region={region}
        zoom={zoom}
        bounds={mapBounds}
        markers={jeonjuMarkers}
        selectedSegment={selectedJeonjuSegment}
        onSegmentSelect={onJeonjuSegmentSelect}
        onOpenLeft={onOpenLeft}
        paneName="jeonju-markers"
      />
      <Region45Markers
        region={region}
        zoom={zoom}
        bounds={mapBounds}
        markers={jeongeupMarkers}
        selectedSegment={selectedJeongeupSegment}
        onSegmentSelect={onJeongeupSegmentSelect}
        onOpenLeft={onOpenLeft}
        paneName="jeongeup-markers"
      />
      <Region45Markers
        region={region}
        zoom={zoom}
        bounds={mapBounds}
        markers={wanjuMarkers}
        selectedSegment={selectedWanjuSegment}
        onSegmentSelect={onWanjuSegmentSelect}
        onOpenLeft={onOpenLeft}
        paneName="wanju-markers"
      />
      <Region45Markers
        region={region}
        zoom={zoom}
        bounds={mapBounds}
        markers={gwangjuMarkers}
        selectedSegment={selectedGwangjuSegment}
        onSegmentSelect={onGwangjuSegmentSelect}
        onOpenLeft={onOpenLeft}
        paneName="gwangju-markers"
      />
      <Region45Markers
        region={region}
        zoom={zoom}
        bounds={mapBounds}
        markers={yonginMarkers}
        selectedSegment={selectedYonginSegment}
        onSegmentSelect={onYonginSegmentSelect}
        onOpenLeft={onOpenLeft}
        paneName="yongin-markers"
      />
      <Region45Markers
        region={region}
        zoom={zoom}
        bounds={mapBounds}
        markers={gwangmyeongMarkers}
        selectedSegment={selectedGwangmyeongSegment}
        onSegmentSelect={onGwangmyeongSegmentSelect}
        onOpenLeft={onOpenLeft}
        paneName="gwangmyeong-markers"
      />
      <Region45Markers
        region={region}
        zoom={zoom}
        bounds={mapBounds}
        markers={anyangMarkers}
        selectedSegment={selectedAnyangSegment}
        onSegmentSelect={onAnyangSegmentSelect}
        onOpenLeft={onOpenLeft}
        paneName="anyang-markers"
      />
      <Region45Markers
        region={region}
        zoom={zoom}
        bounds={mapBounds}
        markers={yangpyeongMarkers}
        selectedSegment={selectedYangpyeongSegment}
        onSegmentSelect={onYangpyeongSegmentSelect}
        onOpenLeft={onOpenLeft}
        paneName="yangpyeong-markers"
      />
      <Region45Markers
        region={region}
        zoom={zoom}
        bounds={mapBounds}
        markers={uijeongbuMarkers}
        selectedSegment={selectedUijeongbuSegment}
        onSegmentSelect={onUijeongbuSegmentSelect}
        onOpenLeft={onOpenLeft}
        paneName="uijeongbu-markers"
      />
      <Region45Markers
        region={region}
        zoom={zoom}
        bounds={mapBounds}
        markers={goyangMarkers}
        selectedSegment={selectedGoyangSegment}
        onSegmentSelect={onGoyangSegmentSelect}
        onOpenLeft={onOpenLeft}
        paneName="goyang-markers"
      />
      <Region45Markers
        region={region}
        zoom={zoom}
        bounds={mapBounds}
        markers={ansanMarkers}
        selectedSegment={selectedAnsanSegment}
        onSegmentSelect={onAnsanSegmentSelect}
        onOpenLeft={onOpenLeft}
        paneName="ansan-markers"
      />
      <Region45Markers
        region={region}
        zoom={zoom}
        bounds={mapBounds}
        markers={uiwangMarkers}
        selectedSegment={selectedUiwangSegment}
        onSegmentSelect={onUiwangSegmentSelect}
        onOpenLeft={onOpenLeft}
        paneName="uiwang-markers"
      />
      <Region45Markers
        region={region}
        zoom={zoom}
        bounds={mapBounds}
        markers={gwacheonMarkers}
        selectedSegment={selectedGwacheonSegment}
        onSegmentSelect={onGwacheonSegmentSelect}
        onOpenLeft={onOpenLeft}
        paneName="gwacheon-markers"
      />
      <RegionZoomController
        region={region}
        boundsReady={boundsReady}
        onNationalMinZoomApplied={onNationalMinZoomApplied}
      />
      <MapRefSetter mapRef={mapRef} />
    </>
  )
}

/** 줌 9 미만: 전국 뷰 → 호버 툴팁만. 줌 9 이상: 확대 뷰 → 고정 라벨만. 절대 겹치지 않음 */
const LABEL_ZOOM_THRESHOLD = 9

/** 줌/패닝 시 실시간으로 위치 갱신되는 범례 오버레이 (move 시 rAF 쓰로틀, moveend/zoomend 즉시) */
function FixedRegionLabelsOverlay({
  geojson,
  sidoCountsMap,
  region,
}: {
  geojson: GeoJSON.FeatureCollection
  sidoCountsMap: Record<string, number>
  region: string
}) {
  const map = useMap()
  const rafRef = useRef<number | null>(null)
  const [labelPositions, setLabelPositions] = useState<
    Array<{ key: string; name: string; count: number; left: number; top: number; isGyeonggi: boolean }>
  >([])

  const updatePositions = useCallback(() => {
    if (!map) return
    const features = geojson.features ?? []
    const positions: typeof labelPositions = []
    for (const f of features) {
      const id = getFeatureAppId(f.properties as Record<string, unknown>)
      if (!id) continue
      if (region !== "00" && id !== region) continue
      const name = getFeatureName(f.properties as Record<string, unknown>)
      const count = sidoCountsMap[name] ?? 0
      const pt = getFeatureLabelPoint(f as GeoJSON.Feature, id)
      if (!pt) continue
      try {
        const [lat, lng] = pt
        const point = map.latLngToContainerPoint([lat, lng])
        positions.push({
          key: id,
          name,
          count,
          left: point.x,
          top: point.y,
          isGyeonggi: id === "41",
        })
      } catch {
        // skip
      }
    }
    setLabelPositions(positions)
  }, [geojson, map, sidoCountsMap, region])

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      updatePositions()
    })
  }, [updatePositions])

  useEffect(() => {
    updatePositions()
  }, [map, updatePositions])

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useMapEvents({
    move: scheduleUpdate,
    moveend: updatePositions,
    zoom: scheduleUpdate,
    zoomend: updatePositions,
  })

  return (
    <div
      className="absolute inset-0 z-[400]"
      style={{ pointerEvents: "none" }}
      aria-hidden
      data-no-block
    >
      {labelPositions.map(({ key, name, count, left, top, isGyeonggi }) => (
        <div
          key={key}
          className="region-label-tooltip"
          style={{
            position: "absolute",
            left: isGyeonggi ? left + 100 : left,
            top: isGyeonggi ? top + 160 : top,
            transform: isGyeonggi ? "translate(-50%, 0)" : "translate(-50%, -50%)",
            textAlign: "center",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {name}
          <br />
          <strong>{count.toLocaleString()}그루</strong>
        </div>
      ))}
    </div>
  )
}

function KoreaGeoJSONLayer({
  region,
  sidoCounts,
  onRegionSelect,
  onBoundsReady,
  onNationalMinZoomApplied,
  onInitialNationalViewReady,
}: {
  region: string
  sidoCounts: SidoItem[]
  onRegionSelect: (value: string) => void
  onBoundsReady?: (ready: boolean) => void
  onNationalMinZoomApplied?: (zoom: number) => void
  onInitialNationalViewReady?: () => void
}) {
  const regionRef = useRef(region)
  regionRef.current = region
  const activeTooltipLayerRef = useRef<L.Layer | null>(null)
  const [geojson, setGeojson] = useState<GeoJSON.GeoJsonObject | null>(null)
  const map = useMap()
  const [zoomLevel, setZoomLevel] = useState(() => map.getZoom())
  useMapEvents({ zoom: () => setZoomLevel(map.getZoom()), zoomend: () => setZoomLevel(map.getZoom()) })
  const reapplyActiveHighlight = useCallback(() => {
    const layer = activeTooltipLayerRef.current
    if (layer && (layer as L.Path).setStyle) {
      ;(layer as L.Path).bringToFront()
      ;(layer as L.Path).setStyle({ color: "#0ea5e9", weight: 2.2, opacity: 1 })
    }
  }, [])
  useMapEvents({
    moveend: reapplyActiveHighlight,
    zoomend: reapplyActiveHighlight,
  })
  useEffect(() => {
    reapplyActiveHighlight()
  }, [zoomLevel, reapplyActiveHighlight])
  const showLabels = zoomLevel >= LABEL_ZOOM_THRESHOLD && zoomLevel < DETAIL_MARKER_ZOOM
  const sidoCountsMap = Object.fromEntries(sidoCounts.map((s) => [s.name, s.count]))
  const nationalScale = getFourStepScale(sidoCounts.map((s) => s.count))

  useEffect(() => {
    fetch(KOREA_GEOJSON_URL)
      .then((r) => r.json())
      .then((data) => {
        setGeojson(data)
        const layer = L.geoJSON(data)
        const bounds = layer.getBounds()
        koreaBoundsRef.current = bounds
        if (regionRef.current === "00") {
          programmaticZoomUntilRef.current = Date.now() + PROGRAMMATIC_ZOOM_COOLDOWN_MS
          applyNationalViewPosition(map, bounds)
          onNationalMinZoomApplied?.(NATIONAL_MIN_ZOOM)
          nationalViewSetByGeoJSONRef.current = true
          onInitialNationalViewReady?.()
        }
      })
      .catch(() => {
        setGeojson(null)
        onInitialNationalViewReady?.()
      })
  }, [map])

  useEffect(() => {
    if (!geojson) return
    const boundsMap: Record<string, L.LatLngBounds> = {}
    const features = (geojson as GeoJSON.FeatureCollection).features ?? []
    for (const f of features) {
      const id = getFeatureAppId(f.properties as Record<string, unknown>)
      if (!id) continue
      const b = getFeatureBounds(f as GeoJSON.Feature, id)
      if (b) boundsMap[id] = b
    }
    regionBoundsRef.current = boundsMap
    onBoundsReady?.(true)
  }, [geojson, onBoundsReady])

  if (!geojson) return null

  return (
    <>
      {showLabels && (
        <FixedRegionLabelsOverlay
          geojson={geojson as GeoJSON.FeatureCollection}
          sidoCountsMap={sidoCountsMap}
          region={region}
        />
      )}
      <GeoJSON
        key={`sido-layer-${showLabels ? "labels" : "tooltips"}-${zoomLevel >= DETAIL_MARKER_ZOOM ? "detail-hide-tt" : "default"}`}
        data={geojson}
      style={(feature) => {
        const hideFill = zoomLevel >= DETAIL_MARKER_ZOOM
        const name = getFeatureName(feature?.properties as Record<string, unknown>)
        const count = sidoCountsMap[name] ?? 0
        return {
          fillColor: getColorNational(count, nationalScale),
          weight: 1.2,
          opacity: 0.95,
          color: hideFill ? "#64748b" : "#f1f5f9",
          fillOpacity: hideFill ? 0 : 0.88,
        }
      }}
      onEachFeature={(feature, layer) => {
        const name = getFeatureName(feature?.properties as Record<string, unknown>)
        const count = sidoCountsMap[name] ?? 0
        const id = getFeatureAppId(feature?.properties as Record<string, unknown>)

        const hideDetailTooltip = (id === "26" || id === "45" || id === "41") && zoomLevel >= DETAIL_MARKER_ZOOM
        const hideTooltip = hideDetailTooltip && zoomLevel >= DETAIL_MARKER_ZOOM
        if (!showLabels && !hideTooltip) {
          const hasDetail = id != null && REGIONS_WITH_DETAIL.includes(id)
          const noDetailHint = !hasDetail
            ? '<br/><span class="region-tooltip-no-detail">이 지역은 구간별 가로수 데이터가 없어요.</span>'
            : ""
          layer.bindTooltip(
            `<div style="text-align: center">${name}<br/><strong>${count.toLocaleString()}그루</strong>${noDetailHint}</div>`,
            {
              permanent: false,
              direction: "bottom",
              offset: [0, 26],
              className: "font-sans text-sm font-medium region-tooltip",
              sticky: false,
            }
          )
          const setTooltipToLabel = () => {
            const tooltip = (layer as L.GeoJSON).getTooltip()
            if (tooltip?.setLatLng) {
              const pt = getFeatureLabelPoint(feature as GeoJSON.Feature, id)
              if (pt) tooltip.setLatLng(pt)
            }
          }
          const onMouseMove = (e: L.LeafletMouseEvent) => {
            const tooltip = (layer as L.GeoJSON).getTooltip()
            if (tooltip?.setLatLng) tooltip.setLatLng(e.latlng)
          }
          let moveBound: ((e: L.LeafletMouseEvent) => void) | null = null
          const getDefaultStroke = () => {
            const hideFill = zoomLevel >= DETAIL_MARKER_ZOOM
            return {
              color: hideFill ? "#64748b" : "#f1f5f9",
              weight: 1.2,
              opacity: 0.95,
            }
          }
          layer.on("tooltipopen", () => {
            activeTooltipLayerRef.current = layer
            ;(layer as L.Path).bringToFront()
            ;(layer as L.Path).setStyle({
              color: "#0ea5e9",
              weight: 2.2,
              opacity: 1,
            })
            if (map.getZoom() >= DETAIL_MARKER_ZOOM) {
              moveBound = onMouseMove
              layer.on("mousemove", moveBound)
            } else {
              setTooltipToLabel()
            }
          })
          layer.on("tooltipclose", () => {
            activeTooltipLayerRef.current = null
            ;(layer as L.Path).setStyle(getDefaultStroke())
            ;(layer as L.Path).bringToBack()
            if (moveBound) {
              layer.off("mousemove", moveBound)
              moveBound = null
            }
          })
        }

        // 부산 확대·가로수 마커 표시 시: 부산 폴리곤은 클릭 비활성화 → 원형 마커 클릭이 왼쪽 팝업으로 전달되도록
        if (hideTooltip) {
          (layer as L.Path).setStyle({ interactive: false })
        } else {
          layer.on("click", () => {
            if (id) onRegionSelect(id)
          })
        }
      }}
      />
    </>
  )
}

function SeoulTreemapButton({ region }: { region: string }) {
  const [userHasMoved, setUserHasMoved] = useState(false)

  useEffect(() => {
    if (region === "11") setUserHasMoved(false)
  }, [region])

  useMapEvents({
    move: () => {
      if (Date.now() > programmaticZoomUntilRef.current) setUserHasMoved(true)
    },
    moveend: () => {
      if (Date.now() > programmaticZoomUntilRef.current) setUserHasMoved(true)
    },
    zoomend: () => {
      if (Date.now() > programmaticZoomUntilRef.current) setUserHasMoved(true)
    },
  })

  const showButton = region === "11" && !userHasMoved
  if (!showButton) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
      <a
        href={SEOUL_TREEMAP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto group flex flex-col items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-white/20 bg-white/95 px-6 py-5 sm:px-12 sm:py-7 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.16)] hover:scale-[1.02] min-h-[44px] min-w-[44px]"
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
          Seoul Street Tree Map
        </span>
        <span className="text-xl font-semibold tracking-tight text-slate-800">
          서울 가로수 트리맵
        </span>
        <span className="flex items-center gap-2 text-sm font-medium text-emerald-600 transition-colors group-hover:text-emerald-700">
          새 창에서 열기
          <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </span>
      </a>
    </div>
  )
}

interface MapPanelProps {
  region: string
  onRegionChange: (value: string) => void
  treeData: CityTreeData | null
  seoulTreeCount: number
  onBusanTreeCountLoad?: (count: number) => void
  /** 전북(전주·정읍·완주) 구축 데이터 합계 — MapPanel에서 합산 후 1회 전달 */
  onJeonbukTreeCountLoad?: (count: number) => void
  /** 경기 세부(광주·용인·광명·안양·양평·의정부·고양·안산·의왕·과천) 관할별 총 그루수 — 상단 요약 박스용 */
  onGyeonggiDetailCountsLoad?: (counts: {
    gwangju: number
    yongin: number
    gwangmyeong: number
    anyang: number
    yangpyeong: number
    uijeongbu: number
    goyang: number
    ansan: number
    uiwang: number
    gwacheon: number
  }) => void
  /** 전북 세부(전주·정읍·완주) 관할별 총 그루수 — 상단 요약 박스용 */
  onJeonbukDetailCountsLoad?: (counts: { jeonju: number; jeongeup: number; wanju: number }) => void
  onOpenLeft?: () => void
  onOpenRight?: () => void
  selectedBusanSegment?: BusanSegment | null
  onBusanSegmentSelect?: (s: BusanSegment) => void
  selectedJeonjuSegment?: BusanSegment | null
  onJeonjuSegmentSelect?: (s: BusanSegment) => void
  selectedJeongeupSegment?: BusanSegment | null
  onJeongeupSegmentSelect?: (s: BusanSegment) => void
  selectedWanjuSegment?: BusanSegment | null
  onWanjuSegmentSelect?: (s: BusanSegment) => void
  selectedGwangjuSegment?: BusanSegment | null
  onGwangjuSegmentSelect?: (s: BusanSegment) => void
  selectedYonginSegment?: BusanSegment | null
  onYonginSegmentSelect?: (s: BusanSegment) => void
  selectedGwangmyeongSegment?: BusanSegment | null
  onGwangmyeongSegmentSelect?: (s: BusanSegment) => void
  selectedAnyangSegment?: BusanSegment | null
  onAnyangSegmentSelect?: (s: BusanSegment) => void
  selectedYangpyeongSegment?: BusanSegment | null
  onYangpyeongSegmentSelect?: (s: BusanSegment) => void
  selectedUijeongbuSegment?: BusanSegment | null
  onUijeongbuSegmentSelect?: (s: BusanSegment) => void
  selectedGoyangSegment?: BusanSegment | null
  onGoyangSegmentSelect?: (s: BusanSegment) => void
  selectedAnsanSegment?: BusanSegment | null
  onAnsanSegmentSelect?: (s: BusanSegment) => void
  selectedUiwangSegment?: BusanSegment | null
  onUiwangSegmentSelect?: (s: BusanSegment) => void
  selectedGwacheonSegment?: BusanSegment | null
  onGwacheonSegmentSelect?: (s: BusanSegment) => void
}

export function MapPanel({ region, onRegionChange, treeData, seoulTreeCount, onBusanTreeCountLoad, onJeonbukTreeCountLoad, onGyeonggiDetailCountsLoad, onJeonbukDetailCountsLoad, onOpenLeft, onOpenRight, selectedBusanSegment = null, onBusanSegmentSelect, selectedJeonjuSegment = null, onJeonjuSegmentSelect, selectedJeongeupSegment = null, onJeongeupSegmentSelect, selectedWanjuSegment = null, onWanjuSegmentSelect, selectedGwangjuSegment = null, onGwangjuSegmentSelect, selectedYonginSegment = null, onYonginSegmentSelect, selectedGwangmyeongSegment = null, onGwangmyeongSegmentSelect, selectedAnyangSegment = null, onAnyangSegmentSelect, selectedYangpyeongSegment = null, onYangpyeongSegmentSelect, selectedUijeongbuSegment = null, onUijeongbuSegmentSelect, selectedGoyangSegment = null, onGoyangSegmentSelect, selectedAnsanSegment = null, onAnsanSegmentSelect, selectedUiwangSegment = null, onUiwangSegmentSelect, selectedGwacheonSegment = null, onGwacheonSegmentSelect }: MapPanelProps) {
  const dataAttribution = "데이터 출처: 공공데이터포털"
  const mapRef = useRef<L.Map | null>(null)
  const [busanMarkers, setBusanMarkers] = useState<BusanSegment[]>([])
  const [jeonjuMarkers, setJeonjuMarkers] = useState<BusanSegment[]>([])
  const [jeongeupMarkers, setJeongeupMarkers] = useState<BusanSegment[]>([])
  const [wanjuMarkers, setWanjuMarkers] = useState<BusanSegment[]>([])
  const [gwangjuMarkers, setGwangjuMarkers] = useState<BusanSegment[]>([])
  const [yonginMarkers, setYonginMarkers] = useState<BusanSegment[]>([])
  const [gwangmyeongMarkers, setGwangmyeongMarkers] = useState<BusanSegment[]>([])
  const [anyangMarkers, setAnyangMarkers] = useState<BusanSegment[]>([])
  const [yangpyeongMarkers, setYangpyeongMarkers] = useState<BusanSegment[]>([])
  const [uijeongbuMarkers, setUijeongbuMarkers] = useState<BusanSegment[]>([])
  const [goyangMarkers, setGoyangMarkers] = useState<BusanSegment[]>([])
  const [ansanMarkers, setAnsanMarkers] = useState<BusanSegment[]>([])
  const [uiwangMarkers, setUiwangMarkers] = useState<BusanSegment[]>([])
  const [gwacheonMarkers, setGwacheonMarkers] = useState<BusanSegment[]>([])
  /** 전국 뷰 적용 시 최소줌(리셋 후 축소 방지). region "00"일 때만 Map에 반영 */
  const [nationalMinZoom, setNationalMinZoom] = useState<number | null>(null)
  const effectiveMinZoom = region === "00" ? (nationalMinZoom ?? NATIONAL_MIN_ZOOM) : 3
  /** 전국 초기 로드: GeoJSON 적용 전까지 지도 숨김 → 새로고침 시 초점 점프 방지 */
  const [initialNationalViewReady, setInitialNationalViewReady] = useState(false)
  useEffect(() => {
    if (region !== "00") return
    const t = setTimeout(() => setInitialNationalViewReady(true), 5000)
    return () => clearTimeout(t)
  }, [region])
  /** 부산 가로수 데이터: 지역 선택 시 표시용 + 총그루수 산출용으로 앱 로드 시 1회 fetch */
  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      fetch(BUSAN_JINGU_TREES_URL).then((r) => r.json()),
      fetch(BUSAN_SAHA_TREES_URL).then((r) => r.json()),
      fetch(BUSAN_JUNGGU_TREES_URL).then((r) => r.json()),
      fetch(BUSAN_DONGNAE_TREES_URL).then((r) => r.json()),
      fetch(BUSAN_YEONGDO_TREES_URL).then((r) => r.json()),
      ...BUSAN_UGIS_IDS.map((id) =>
        fetch(`${BUSAN_UGIS_BASE}${id}.json?v=1`).then((r) =>
          r.ok ? r.json() : Promise.resolve([])
        )
      ),
    ])
      .then((results) => {
        if (cancelled) return
        const merged: BusanSegment[] = []
        for (const res of results) {
          if (res.status !== "fulfilled") continue
          const arr = Array.isArray(res.value) ? (res.value as BusanSegment[]) : []
          merged.push(...arr)
        }
        setBusanMarkers(merged)
      })
      .catch(() => {
        if (!cancelled) setBusanMarkers([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetch(JEONJU_TREES_URL)
      .then((r) => r.json())
      .then((arr: BusanSegment[]) => {
        if (!cancelled && Array.isArray(arr)) setJeonjuMarkers(arr)
      })
      .catch(() => {
        if (!cancelled) setJeonjuMarkers([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetch(JEONGEUP_TREES_URL)
      .then((r) => r.json())
      .then((arr: BusanSegment[]) => {
        if (!cancelled && Array.isArray(arr)) setJeongeupMarkers(arr)
      })
      .catch(() => {
        if (!cancelled) setJeongeupMarkers([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetch(WANJU_TREES_URL)
      .then((r) => r.json())
      .then((arr: BusanSegment[]) => {
        if (!cancelled && Array.isArray(arr)) setWanjuMarkers(arr)
      })
      .catch(() => {
        if (!cancelled) setWanjuMarkers([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetch(GWANGJU_TREES_URL)
      .then((r) => r.json())
      .then((arr: BusanSegment[]) => {
        if (!cancelled && Array.isArray(arr)) setGwangjuMarkers(arr)
      })
      .catch(() => {
        if (!cancelled) setGwangjuMarkers([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetch(YONGIN_TREES_URL)
      .then((r) => r.json())
      .then((arr: BusanSegment[]) => {
        if (!cancelled && Array.isArray(arr)) setYonginMarkers(arr)
      })
      .catch(() => {
        if (!cancelled) setYonginMarkers([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetch(GWANGMYEONG_TREES_URL)
      .then((r) => r.json())
      .then((arr: BusanSegment[]) => {
        if (!cancelled && Array.isArray(arr)) setGwangmyeongMarkers(arr)
      })
      .catch(() => {
        if (!cancelled) setGwangmyeongMarkers([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetch(ANYANG_TREES_URL)
      .then((r) => r.json())
      .then((arr: BusanSegment[]) => {
        if (!cancelled && Array.isArray(arr)) setAnyangMarkers(arr)
      })
      .catch(() => {
        if (!cancelled) setAnyangMarkers([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    const base = ((import.meta.env.BASE_URL || "/") as string).replace(/\/$/, "") || ""
    const pathPrefix = base ? `/${base.replace(/^\//, "")}/` : "/"
    const url =
      typeof window !== "undefined" && window.location?.origin
        ? `${window.location.origin}${pathPrefix}data/yangpyeong-trees.json?v=1`
        : YANGPYEONG_TREES_URL
    const load = (u: string) =>
      fetch(u)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))))
        .then((arr: unknown) => {
          if (cancelled) return
          const list = Array.isArray(arr) ? arr : (arr as { data?: unknown[] })?.data
          if (Array.isArray(list) && list.length > 0) {
            const first = list[0] as Record<string, unknown>
            if (typeof first?.lat === "number" && typeof first?.lng === "number") setYangpyeongMarkers(list as BusanSegment[])
          }
        })
    load(url).catch(() => {
      if (!cancelled && url !== YANGPYEONG_TREES_URL) load(YANGPYEONG_TREES_URL).catch(() => setYangpyeongMarkers([]))
      else if (!cancelled) setYangpyeongMarkers([])
    })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetch(UIJEONGBU_TREES_URL)
      .then((r) => r.json())
      .then((arr: BusanSegment[]) => {
        if (!cancelled && Array.isArray(arr)) setUijeongbuMarkers(arr)
      })
      .catch(() => {
        if (!cancelled) setUijeongbuMarkers([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetch(GOYANG_TREES_URL)
      .then((r) => r.json())
      .then((arr: BusanSegment[]) => {
        if (!cancelled && Array.isArray(arr)) setGoyangMarkers(arr)
      })
      .catch(() => {
        if (!cancelled) setGoyangMarkers([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetch(ANSAN_TREES_URL)
      .then((r) => r.json())
      .then((arr: BusanSegment[]) => {
        if (!cancelled && Array.isArray(arr)) setAnsanMarkers(arr)
      })
      .catch(() => {
        if (!cancelled) setAnsanMarkers([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetch(UIWANG_TREES_URL)
      .then((r) => r.json())
      .then((arr: BusanSegment[]) => {
        if (!cancelled && Array.isArray(arr)) setUiwangMarkers(arr)
      })
      .catch(() => {
        if (!cancelled) setUiwangMarkers([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetch(GWACHEON_TREES_URL)
      .then((r) => r.json())
      .then((arr: BusanSegment[]) => {
        if (!cancelled && Array.isArray(arr)) setGwacheonMarkers(arr)
      })
      .catch(() => {
        if (!cancelled) setGwacheonMarkers([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  const busanTreeCount = useMemo(
    () => busanMarkers.filter(isInBusanBounds).reduce((sum, m) => sum + m.trees, 0),
    [busanMarkers]
  )
  useEffect(() => {
    if (busanMarkers.length > 0) onBusanTreeCountLoad?.(busanTreeCount)
  }, [busanTreeCount, busanMarkers.length, onBusanTreeCountLoad])
  const jeonjuTreeCount = useMemo(
    () => jeonjuMarkers.reduce((sum, m) => sum + m.trees, 0),
    [jeonjuMarkers]
  )
  const jeongeupTreeCount = useMemo(
    () => jeongeupMarkers.reduce((sum, m) => sum + m.trees, 0),
    [jeongeupMarkers]
  )
  const wanjuTreeCount = useMemo(
    () => wanjuMarkers.reduce((sum, m) => sum + m.trees, 0),
    [wanjuMarkers]
  )
  /** 전북(전주시·정읍시·완주군) 구축 데이터 합계 — 전국 총합·전북 표시용 */
  const jeonbukTreeCount = useMemo(
    () => jeonjuTreeCount + jeongeupTreeCount + wanjuTreeCount,
    [jeonjuTreeCount, jeongeupTreeCount, wanjuTreeCount]
  )
  const hasJeonbukData = jeonjuMarkers.length > 0 || jeongeupMarkers.length > 0 || wanjuMarkers.length > 0
  useEffect(() => {
    if (hasJeonbukData) onJeonbukTreeCountLoad?.(jeonbukTreeCount)
  }, [jeonbukTreeCount, hasJeonbukData, onJeonbukTreeCountLoad])

  const gyeonggiDetailCounts = useMemo(
    () => ({
      gwangju: gwangjuMarkers.reduce((s, m) => s + m.trees, 0),
      yongin: yonginMarkers.reduce((s, m) => s + m.trees, 0),
      gwangmyeong: gwangmyeongMarkers.reduce((s, m) => s + m.trees, 0),
      anyang: anyangMarkers.reduce((s, m) => s + m.trees, 0),
      yangpyeong: yangpyeongMarkers.reduce((s, m) => s + m.trees, 0),
      uijeongbu: uijeongbuMarkers.reduce((s, m) => s + m.trees, 0),
      goyang: goyangMarkers.reduce((s, m) => s + m.trees, 0),
      ansan: ansanMarkers.reduce((s, m) => s + m.trees, 0),
      uiwang: uiwangMarkers.reduce((s, m) => s + m.trees, 0),
      gwacheon: gwacheonMarkers.reduce((s, m) => s + m.trees, 0),
    }),
    [gwangjuMarkers, yonginMarkers, gwangmyeongMarkers, anyangMarkers, yangpyeongMarkers, uijeongbuMarkers, goyangMarkers, ansanMarkers, uiwangMarkers, gwacheonMarkers]
  )
  useEffect(() => {
    onGyeonggiDetailCountsLoad?.(gyeonggiDetailCounts)
  }, [gyeonggiDetailCounts, onGyeonggiDetailCountsLoad])
  const jeonbukDetailCounts = useMemo(
    () => ({ jeonju: jeonjuTreeCount, jeongeup: jeongeupTreeCount, wanju: wanjuTreeCount }),
    [jeonjuTreeCount, jeongeupTreeCount, wanjuTreeCount]
  )
  useEffect(() => {
    if (hasJeonbukData) onJeonbukDetailCountsLoad?.(jeonbukDetailCounts)
  }, [jeonbukDetailCounts, hasJeonbukData, onJeonbukDetailCountsLoad])

  const baseSidoCounts = treeData?.sidoCounts ?? SIDO_TREE_COUNTS
  const sidoCounts = useMemo(
    () =>
      baseSidoCounts.map((s) => {
        if (s.id === SIDO_ID_SEOUL) return { ...s, count: seoulTreeCount }
        if (s.id === SIDO_ID_BUSAN && busanMarkers.length > 0) return { ...s, count: busanTreeCount }
        if (s.id === SIDO_ID_JEONBUK && hasJeonbukData) return { ...s, count: jeonbukTreeCount }
        return s
      }),
    [
      baseSidoCounts,
      seoulTreeCount,
      busanMarkers.length,
      busanTreeCount,
      hasJeonbukData,
      jeonbukTreeCount,
    ]
  )
  const nationalFourStep = getFourStepScale(sidoCounts.map((s) => s.count))

  return (
    <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-100 relative">
      {/* 모바일: 좌/우 패널 열기 버튼 */}
      <div className="lg:hidden absolute top-3 left-3 right-3 z-[1000] flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto flex gap-2">
          {onOpenLeft && (
            <button
              type="button"
              onClick={onOpenLeft}
              className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl bg-white/95 shadow-md border border-slate-200/80 text-sm font-medium text-slate-700 hover:bg-white"
              aria-label="통계 패널 열기"
            >
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              통계
            </button>
          )}
          {onOpenRight && (
            <button
              type="button"
              onClick={onOpenRight}
              className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl bg-white/95 shadow-md border border-slate-200/80 text-sm font-medium text-slate-700 hover:bg-white"
              aria-label="뉴스 패널 열기"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              뉴스
            </button>
          )}
        </div>
      </div>

      <div
        className="flex-1 min-h-0 relative transition-opacity duration-200"
        style={{ opacity: region !== "00" || initialNationalViewReady ? 1 : 0 }}
      >
        <MapContainer
          center={INITIAL_NATIONAL_CENTER}
          zoom={NATIONAL_DEFAULT_ZOOM}
          minZoom={effectiveMinZoom}
          maxZoom={13}
          maxBoundsViscosity={1}
          className="w-full h-full"
          zoomControl={false}
          touchZoom={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          boxZoom={true}
          keyboard={false}
        >
          <ZoomControl position="bottomright" />
          <TileLayerByView />
          <MapContent
            region={region}
            mapRef={mapRef}
            sidoCounts={sidoCounts}
            busanMarkers={busanMarkers}
            jeonjuMarkers={jeonjuMarkers}
            jeongeupMarkers={jeongeupMarkers}
            wanjuMarkers={wanjuMarkers}
            gwangjuMarkers={gwangjuMarkers}
            yonginMarkers={yonginMarkers}
            gwangmyeongMarkers={gwangmyeongMarkers}
            anyangMarkers={anyangMarkers}
            yangpyeongMarkers={yangpyeongMarkers}
            uijeongbuMarkers={uijeongbuMarkers}
            goyangMarkers={goyangMarkers}
            ansanMarkers={ansanMarkers}
            uiwangMarkers={uiwangMarkers}
            gwacheonMarkers={gwacheonMarkers}
            onRegionSelect={onRegionChange}
            selectedBusanSegment={selectedBusanSegment ?? null}
            selectedJeonjuSegment={selectedJeonjuSegment ?? null}
            selectedJeongeupSegment={selectedJeongeupSegment ?? null}
            selectedWanjuSegment={selectedWanjuSegment ?? null}
            selectedGwangjuSegment={selectedGwangjuSegment ?? null}
            selectedYonginSegment={selectedYonginSegment ?? null}
            selectedGwangmyeongSegment={selectedGwangmyeongSegment ?? null}
            selectedAnyangSegment={selectedAnyangSegment ?? null}
            selectedYangpyeongSegment={selectedYangpyeongSegment ?? null}
            selectedUijeongbuSegment={selectedUijeongbuSegment ?? null}
            selectedGoyangSegment={selectedGoyangSegment ?? null}
            selectedAnsanSegment={selectedAnsanSegment ?? null}
            selectedUiwangSegment={selectedUiwangSegment ?? null}
            selectedGwacheonSegment={selectedGwacheonSegment ?? null}
            onBusanSegmentSelect={onBusanSegmentSelect ?? (() => {})}
            onJeonjuSegmentSelect={onJeonjuSegmentSelect ?? (() => {})}
            onJeongeupSegmentSelect={onJeongeupSegmentSelect ?? (() => {})}
            onWanjuSegmentSelect={onWanjuSegmentSelect ?? (() => {})}
            onGwangjuSegmentSelect={onGwangjuSegmentSelect ?? (() => {})}
            onYonginSegmentSelect={onYonginSegmentSelect ?? (() => {})}
            onGwangmyeongSegmentSelect={onGwangmyeongSegmentSelect ?? (() => {})}
            onAnyangSegmentSelect={onAnyangSegmentSelect ?? (() => {})}
            onYangpyeongSegmentSelect={onYangpyeongSegmentSelect ?? (() => {})}
            onUijeongbuSegmentSelect={onUijeongbuSegmentSelect ?? (() => {})}
            onGoyangSegmentSelect={onGoyangSegmentSelect ?? (() => {})}
            onAnsanSegmentSelect={onAnsanSegmentSelect ?? (() => {})}
            onUiwangSegmentSelect={onUiwangSegmentSelect ?? (() => {})}
            onGwacheonSegmentSelect={onGwacheonSegmentSelect ?? (() => {})}
            onOpenLeft={onOpenLeft}
            onNationalMinZoomApplied={setNationalMinZoom}
            effectiveMinZoom={effectiveMinZoom}
            onInitialNationalViewReady={() => setInitialNationalViewReady(true)}
          />
          <MapLegendOverlay region={region} nationalFourStep={nationalFourStep} />
          <SeoulTreemapButton region={region} />
        </MapContainer>
      </div>

      <div className="h-6 sm:h-7 shrink-0 flex items-center justify-center gap-1.5 py-0.5 bg-white/80 border-t border-slate-200/80 text-[10px] sm:text-[11px] text-slate-500 tracking-wide px-2">
        <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        {dataAttribution}
      </div>
    </main>
  )
}
