import { useEffect, useLayoutEffect, useState, useRef, useMemo, useCallback } from "react"
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents, ZoomControl } from "react-leaflet"
import { centroid } from "@turf/centroid"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { SIDO_TREE_COUNTS } from "../data/mock"
import type { SidoItem } from "../data/mock"
import type { CityTreeData } from "../data/cityTreeData"
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
const KOREA_MAX_BOUNDS = L.latLngBounds([32.9, 124.6], [38.9, 132.2])

const regionBoundsRef: { current: Record<string, L.LatLngBounds> } = { current: {} }

/** flyToBounds/fitBounds 직후 zoomend가 애니메이션 중 z<=8로 오인해 전국 전환하는 것 방지 */
const programmaticZoomUntilRef: { current: number } = { current: 0 }

/** 줌아웃으로 자동 전국 전환 시 flyToBounds 건너뛰기 (사용자 줌 위치 유지) */
const skipFlyToNationalRef: { current: boolean } = { current: false }

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

function getColorNational(count: number, scale: { breaks: [number, number, number, number]; colors: string[] }): string {
  if (count === 0) return NO_DATA_COLOR
  const idx = getStepIndex(count, scale.breaks)
  return scale.colors[idx] ?? FOUR_STEP_COLORS[3]
}

const koreaBoundsRef: { current: L.LatLngBounds | null } = { current: null }

function GrayMaskLayer() {
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

const PROGRAMMATIC_ZOOM_COOLDOWN_MS = 1200

function RegionZoomController({ region, boundsReady }: { region: string; boundsReady: boolean }) {
  const map = useMap()

  useLayoutEffect(() => {
    if (region !== "00" && !boundsReady) return
    const now = Date.now()
    if (lastZoomedRef.current?.region === region && now - lastZoomedRef.current.at < ZOOM_DEDUPE_MS) return
    lastZoomedRef.current = { region, at: now }
    programmaticZoomUntilRef.current = now + PROGRAMMATIC_ZOOM_COOLDOWN_MS
    const opts = { duration: FLY_DURATION }
    if (region === "00") {
      if (skipFlyToNationalRef.current) {
        skipFlyToNationalRef.current = false
        return
      }
      if (koreaBoundsRef.current?.isValid?.()) {
        map.flyToBounds(koreaBoundsRef.current, { padding: [20, 20], ...opts })
      }
    } else {
      const bounds = regionBoundsRef.current[region]
      if (bounds?.isValid?.()) {
        const center = bounds.getCenter()
        if (region === "42") {
          map.flyTo(center, 9, opts)
        } else if (region === "46") {
          map.flyTo(center, 9, opts)
        } else {
          map.flyToBounds(bounds, { padding: [8, 8], maxZoom: 14, ...opts })
        }
      }
    }
  }, [region, map, boundsReady])

  return null
}

function MapContent({
  region,
  mapRef,
  sidoCounts,
  onRegionSelect,
}: {
  region: string
  mapRef: React.MutableRefObject<L.Map | null>
  sidoCounts: SidoItem[]
  onRegionSelect: (value: string) => void
}) {
  const map = useMap()
  const [boundsReady, setBoundsReady] = useState(false)
  useMapEvents({
    zoomend: () => {
      if (Date.now() < programmaticZoomUntilRef.current) return
      const z = map.getZoom()
      if (region !== "00" && z <= 8) {
        skipFlyToNationalRef.current = true
        onRegionSelect("00")
      }
    },
  })

  return (
    <>
      <GrayMaskLayer />
      <KoreaGeoJSONLayer
        region={region}
        sidoCounts={sidoCounts}
        onRegionSelect={onRegionSelect}
        onBoundsReady={setBoundsReady}
      />
      <RegionZoomController region={region} boundsReady={boundsReady} />
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
      try {
        const pt = centroid(f as GeoJSON.Feature)
        const [lng, lat] = pt.geometry.coordinates
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
}: {
  region: string
  sidoCounts: SidoItem[]
  onRegionSelect: (value: string) => void
  onBoundsReady?: (ready: boolean) => void
}) {
  const regionRef = useRef(region)
  regionRef.current = region
  const [geojson, setGeojson] = useState<GeoJSON.GeoJsonObject | null>(null)
  const map = useMap()
  const [zoomLevel, setZoomLevel] = useState(() => map.getZoom())
  useMapEvents({ zoom: () => setZoomLevel(map.getZoom()), zoomend: () => setZoomLevel(map.getZoom()) })
  const showLabels = zoomLevel >= LABEL_ZOOM_THRESHOLD
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
        map.setMinZoom(8)
        map.setMaxBounds(KOREA_MAX_BOUNDS)
        if (regionRef.current === "00") {
          programmaticZoomUntilRef.current = Date.now() + PROGRAMMATIC_ZOOM_COOLDOWN_MS
          map.fitBounds(bounds, { padding: [20, 20] })
          map.zoomIn()
        }
      })
      .catch(() => setGeojson(null))
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
        key={`sido-layer-${showLabels ? "labels" : "tooltips"}`}
        data={geojson}
      style={(feature) => {
        const name = getFeatureName(feature?.properties as Record<string, unknown>)
        const count = sidoCountsMap[name] ?? 0
        return {
          fillColor: getColorNational(count, nationalScale),
          weight: 1.5,
          opacity: 1,
          color: "#fff",
          fillOpacity: 0.85,
        }
      }}
      onEachFeature={(feature, layer) => {
        const name = getFeatureName(feature?.properties as Record<string, unknown>)
        const count = sidoCountsMap[name] ?? 0
        const id = getFeatureAppId(feature?.properties as Record<string, unknown>)

        const setTooltipLatLng = () => {
          const tooltip = (layer as L.GeoJSON).getTooltip()
          if (tooltip?.setLatLng) {
            try {
              const pt = centroid(feature as GeoJSON.Feature)
              const [lng, lat] = pt.geometry.coordinates
              tooltip.setLatLng([lat, lng])
            } catch {
              const b = (layer as L.GeoJSON).getBounds()
              if (b?.isValid?.()) tooltip.setLatLng(b.getCenter())
            }
          }
        }

        if (!showLabels) {
          const isGyeonggi = id === "41"
          layer.bindTooltip(
            `<div style="text-align: center">${name}<br/><strong>${count.toLocaleString()}그루</strong></div>`,
            {
              permanent: false,
              direction: isGyeonggi ? "bottom" : "center",
              offset: isGyeonggi ? [40, 50] : [0, 0],
              className: "font-sans text-sm font-medium",
            }
          )
          layer.on("tooltipopen", setTooltipLatLng)
        }

        layer.on("click", () => {
          if (id) onRegionSelect(id)
        })
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
  onOpenLeft?: () => void
  onOpenRight?: () => void
}

export function MapPanel({ region, onRegionChange, treeData, seoulTreeCount, onOpenLeft, onOpenRight }: MapPanelProps) {
  const dataAttribution = "데이터 출처: 공공데이터포털 · 산림청 도시숲 가로수관리 가로수 현황"
  const mapRef = useRef<L.Map | null>(null)
  const baseSidoCounts = treeData?.sidoCounts ?? SIDO_TREE_COUNTS
  const sidoCounts = useMemo(
    () =>
      baseSidoCounts.map((s) =>
        s.id === "11" ? { ...s, count: seoulTreeCount } : s
      ),
    [baseSidoCounts, seoulTreeCount]
  )
  const nationalFourStep = getFourStepScale(sidoCounts.map((s) => s.count))

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-slate-100 relative min-w-0">
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

      <div className="absolute left-2 sm:left-4 bottom-14 sm:bottom-16 lg:bottom-16 z-[999] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/80 p-2 sm:p-3 text-xs max-w-[calc(100vw-6rem)]">
        <div className="font-semibold text-slate-800 mb-2 text-[11px] tracking-wide">
          색깔 설명 (단위: 그루)
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm border border-slate-300 shrink-0" style={{ backgroundColor: NO_DATA_COLOR }} />
            <span className="text-[10px] text-slate-600 leading-tight">0 (데이터 없음)</span>
          </div>
          {getFourStepLabels(nationalFourStep.breaks).map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm border border-slate-300 shrink-0" style={{ backgroundColor: nationalFourStep.colors[i] }} />
              <span className="text-[10px] text-slate-600 leading-tight">{label}</span>
            </div>
          ))}
          <p className="text-[10px] text-amber-700 mt-0.5 bg-amber-50 rounded px-1 py-0.5 leading-tight">
            색이 <strong className="font-semibold">진할수록</strong> 나무가 더 많아요.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        <MapContainer
          center={[36.35, 127.9]}
          zoom={7}
          className="w-full h-full"
          zoomControl={false}
          maxBounds={KOREA_MAX_BOUNDS}
          maxBoundsViscosity={1}
          touchZoom={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          boxZoom={true}
          keyboard={false}
        >
          <ZoomControl position="bottomright" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png"
            crossOrigin="anonymous"
          />
          <MapContent
            region={region}
            mapRef={mapRef}
            sidoCounts={sidoCounts}
            onRegionSelect={onRegionChange}
          />
          <SeoulTreemapButton region={region} />
        </MapContainer>
      </div>

      <div className="h-8 sm:h-9 shrink-0 flex items-center justify-center gap-2 bg-white/80 border-t border-slate-200/80 text-[10px] sm:text-[11px] text-slate-500 tracking-wide px-2">
        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        {dataAttribution}
      </div>
    </main>
  )
}
