import { useEffect, useState, useRef, useMemo } from "react"
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents, ZoomControl } from "react-leaflet"
import L from "leaflet"
import type { Feature } from "geojson"
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
const KOREA_GEOJSON_URL = "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/gadm/json/skorea-provinces-geo.json"
const SEOUL_TREEMAP_URL = "https://map.seoul.go.kr/smgis2/extMap/sttree"
const KOREA_MAX_BOUNDS = L.latLngBounds([32.9, 124.6], [38.9, 132.2])

const regionBoundsRef: { current: Record<string, L.LatLngBounds> } = { current: {} }

const NAME_1_TO_KOR: Record<string, string> = {
  Seoul: "서울특별시",
  "Busan": "부산광역시",
  "Daegu": "대구광역시",
  "Incheon": "인천광역시",
  "Gwangju": "광주광역시",
  "Daejeon": "대전광역시",
  "Ulsan": "울산광역시",
  "Sejong": "세종특별자치시",
  "Gyeonggi-do": "경기도",
  "Gangwon-do": "강원특별자치도",
  "Chungcheongbuk-do": "충청북도",
  "Chungcheongnam-do": "충청남도",
  "Jeollabuk-do": "전북특별자치도",
  "Jeollanam-do": "전라남도",
  "Gyeongsangbuk-do": "경상북도",
  "Gyeongsangnam-do": "경상남도",
  "Jeju-do": "제주특별자치도",
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
      .then((res) => res.json())
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
  useMapEvents({
    zoomend: () => {
      const z = map.getZoom()
      if (region !== "00" && z <= 8) {
        onRegionSelect("00")
      }
    },
  })

  return (
    <>
      <GrayMaskLayer />
      <KoreaGeoJSONLayer region={region} sidoCounts={sidoCounts} onRegionSelect={onRegionSelect} />
      <MapRefSetter mapRef={mapRef} />
    </>
  )
}

function KoreaGeoJSONLayer({
  region,
  sidoCounts,
  onRegionSelect,
}: {
  region: string
  sidoCounts: SidoItem[]
  onRegionSelect: (value: string) => void
}) {
  const [geojson, setGeojson] = useState<GeoJSON.GeoJsonObject | null>(null)
  const map = useMap()
  const sidoCountsMap = Object.fromEntries(sidoCounts.map((s) => [s.name, s.count]))
  const nationalScale = getFourStepScale(sidoCounts.map((s) => s.count))
  const nameToId = Object.fromEntries(sidoCounts.map((s) => [s.name, s.id]))

  useEffect(() => {
    const url =
      "https://raw.githubusercontent.com/southkorea/southkorea-maps/master/gadm/json/skorea-provinces-geo.json"
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setGeojson(data)
        const layer = L.geoJSON(data)
        const bounds = layer.getBounds()
        koreaBoundsRef.current = bounds
        map.fitBounds(bounds, { padding: [20, 20] })
        map.zoomIn()
        map.setMinZoom(map.getZoom())
        map.setMaxBounds(KOREA_MAX_BOUNDS)
      })
      .catch(() => setGeojson(null))
  }, [map])

  useEffect(() => {
    if (!geojson) return
    const boundsMap: Record<string, L.LatLngBounds> = {}
    const features = (geojson as GeoJSON.FeatureCollection).features ?? []
    for (const f of features) {
      const nameEn = (f.properties as { NAME_1?: string })?.NAME_1 ?? ""
      const name = NAME_1_TO_KOR[nameEn] ?? nameEn
      const id = nameToId[name]
      if (!id) continue
      try {
        const b = L.geoJSON(f as GeoJSON.Feature).getBounds()
        if (b && b.isValid()) boundsMap[id] = b
      } catch {}
    }
    regionBoundsRef.current = boundsMap
    if (region !== "00") {
      const bounds = boundsMap[region]
      if (bounds?.isValid?.()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 })
      }
    }
  }, [geojson, nameToId, region, map])

  if (!geojson) return null

  return (
    <GeoJSON
      key="sido-layer"
      data={geojson}
      style={(feature) => {
        const nameEn = feature?.properties?.NAME_1 ?? ""
        const name = NAME_1_TO_KOR[nameEn] ?? nameEn
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
        const nameEn = feature?.properties?.NAME_1 ?? ""
        const name = NAME_1_TO_KOR[nameEn] ?? nameEn
        const count = sidoCountsMap[name] ?? 0
        layer.bindTooltip(
          `<div style="text-align: center">${name}<br/><strong>${count.toLocaleString()}그루</strong></div>`,
          {
            permanent: false,
            direction: "center",
            className: "font-sans text-sm font-medium",
          }
        )
        layer.on("tooltipopen", function (this: L.GeoJSON) {
          const tooltip = this.getTooltip()
          if (tooltip?.setLatLng) {
            const bounds = this.getBounds()
            if (bounds.isValid()) tooltip.setLatLng(bounds.getCenter())
          }
        })
        layer.on("click", () => {
          const id = nameToId[name]
          if (id) onRegionSelect(id)
          try {
            const b = L.geoJSON(feature as Feature).getBounds()
            if (b && b.isValid()) {
              map.fitBounds(b, { padding: [40, 40], maxZoom: 11 })
            }
          } catch {}
        })
      }}
    />
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
  const prevRegionRef = useRef(region)
  const baseSidoCounts = treeData?.sidoCounts ?? SIDO_TREE_COUNTS
  const sidoCounts = useMemo(
    () =>
      baseSidoCounts.map((s) =>
        s.id === "11" ? { ...s, count: seoulTreeCount } : s
      ),
    [baseSidoCounts, seoulTreeCount]
  )
  const nationalFourStep = getFourStepScale(sidoCounts.map((s) => s.count))

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (region === "00") {
      if (koreaBoundsRef.current) {
        map.fitBounds(koreaBoundsRef.current, { padding: [20, 20] })
        map.zoomIn()
      }
      prevRegionRef.current = region
    } else {
      const bounds = regionBoundsRef.current[region]
      if (bounds?.isValid?.()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 })
      }
      prevRegionRef.current = region
    }
  }, [region])

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-gray-100 relative min-w-0">
      {/* 모바일: 좌/우 패널 열기 버튼 */}
      <div className="lg:hidden absolute top-3 left-3 right-3 z-[1000] flex justify-between pointer-events-none">
        <div className="pointer-events-auto flex gap-2">
          {onOpenLeft && (
            <button
              type="button"
              onClick={onOpenLeft}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/95 shadow-md border border-gray-200/80 text-sm font-medium text-gray-700 hover:bg-white"
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
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/95 shadow-md border border-gray-200/80 text-sm font-medium text-gray-700 hover:bg-white"
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

      <div className="absolute left-2 sm:left-4 bottom-16 lg:bottom-16 z-[999] bg-white rounded-lg shadow-lg border border-gray-100 p-2 sm:p-3 text-xs">
        <div className="font-semibold text-gray-800 mb-2 text-[11px] tracking-wide">
          색깔 설명 (단위: 그루)
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm border border-gray-300 shrink-0" style={{ backgroundColor: NO_DATA_COLOR }} />
            <span className="text-[10px] text-gray-600 leading-tight">0 (데이터 없음)</span>
          </div>
          {getFourStepLabels(nationalFourStep.breaks).map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm border border-gray-300 shrink-0" style={{ backgroundColor: nationalFourStep.colors[i] }} />
              <span className="text-[10px] text-gray-600 leading-tight">{label}</span>
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
          {region === "11" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
              <a
                href={SEOUL_TREEMAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto group flex flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/95 px-12 py-7 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.16)] hover:scale-[1.02]"
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
          )}
        </MapContainer>
      </div>

      <div className="h-8 sm:h-9 shrink-0 flex items-center justify-center gap-2 bg-slate-50/95 border-t border-slate-200 text-[10px] sm:text-[11px] text-slate-500 tracking-wide px-2">
        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        {dataAttribution}
      </div>
    </main>
  )
}
