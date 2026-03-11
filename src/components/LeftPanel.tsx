import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts"
import {
  SIDO_TREE_COUNTS,
  SPECIES_DATA,
  TOTAL_TREES,
  getTopSpecies,
} from "../data/mock"
import {
  getTopSpeciesFromData,
  type CityTreeData,
} from "../data/cityTreeData"
import { getDensity } from "../data/sidoAreas"
import type { BusanSegment } from "../data/busanSegment"
import { SIDO_ID_SEOUL, SIDO_ID_BUSAN, SIDO_ID_JEONBUK } from "../data/sidoOverrides"

function getSidoOptions(sidoCounts: { id: string; name: string }[]) {
  return [{ value: "00", label: "전국" }, ...sidoCounts.map((s) => ({ value: s.id, label: s.name }))]
}

interface LeftPanelProps {
  region: string
  onRegionChange: (value: string) => void
  treeData: CityTreeData | null
  treeDataError: string | null
  seoulTreeCount: number
  busanTreeCount?: number | null
  /** 전북(전주·정읍·완주) 구축 데이터 합계 — MapPanel에서 합산 후 전달 */
  jeonbukTreeCount?: number | null
  /** 경기 세부(광주·용인·광명·안양·양평·의정부·고양·안산) 관할별 총 그루수 */
  gyeonggiDetailCounts?: { gwangju: number; yongin: number; gwangmyeong: number; anyang: number; yangpyeong: number; uijeongbu: number; goyang: number; ansan: number; uiwang: number; gwacheon: number } | null
  /** 전북 세부(전주·정읍·완주) 관할별 총 그루수 */
  jeonbukDetailCounts?: { jeonju: number; jeongeup: number; wanju: number } | null
  mobileOpen?: boolean
  onMobileClose?: () => void
  selectedBusanSegment?: BusanSegment | null
  onClearBusanSegment?: () => void
  selectedJeonjuSegment?: BusanSegment | null
  onClearJeonjuSegment?: () => void
  selectedJeongeupSegment?: BusanSegment | null
  onClearJeongeupSegment?: () => void
  selectedWanjuSegment?: BusanSegment | null
  onClearWanjuSegment?: () => void
  selectedGwangjuSegment?: BusanSegment | null
  onClearGwangjuSegment?: () => void
  selectedYonginSegment?: BusanSegment | null
  onClearYonginSegment?: () => void
  selectedGwangmyeongSegment?: BusanSegment | null
  onClearGwangmyeongSegment?: () => void
  selectedAnyangSegment?: BusanSegment | null
  onClearAnyangSegment?: () => void
  selectedYangpyeongSegment?: BusanSegment | null
  onClearYangpyeongSegment?: () => void
  selectedUijeongbuSegment?: BusanSegment | null
  onClearUijeongbuSegment?: () => void
  selectedGoyangSegment?: BusanSegment | null
  onClearGoyangSegment?: () => void
  selectedAnsanSegment?: BusanSegment | null
  onClearAnsanSegment?: () => void
  selectedUiwangSegment?: BusanSegment | null
  onClearUiwangSegment?: () => void
  selectedGwacheonSegment?: BusanSegment | null
  onClearGwacheonSegment?: () => void
}

export function LeftPanel({ region, onRegionChange, treeData, treeDataError, seoulTreeCount, busanTreeCount = null, jeonbukTreeCount = null, gyeonggiDetailCounts = null, jeonbukDetailCounts = null, mobileOpen = false, onMobileClose, selectedBusanSegment = null, onClearBusanSegment, selectedJeonjuSegment = null, onClearJeonjuSegment, selectedJeongeupSegment = null, onClearJeongeupSegment, selectedWanjuSegment = null, onClearWanjuSegment, selectedGwangjuSegment = null, onClearGwangjuSegment, selectedYonginSegment = null, onClearYonginSegment, selectedGwangmyeongSegment = null, onClearGwangmyeongSegment, selectedAnyangSegment = null, onClearAnyangSegment, selectedYangpyeongSegment = null, onClearYangpyeongSegment, selectedUijeongbuSegment = null, onClearUijeongbuSegment, selectedGoyangSegment = null, onClearGoyangSegment, selectedAnsanSegment = null, onClearAnsanSegment, selectedUiwangSegment = null, onClearUiwangSegment, selectedGwacheonSegment = null, onClearGwacheonSegment }: LeftPanelProps) {
  const baseSidoCounts = treeData?.sidoCounts ?? SIDO_TREE_COUNTS
  const baseTotal = treeData?.total ?? TOTAL_TREES

  /** 시도별 구축 데이터 치환값 (없으면 CSV 값 유지) */
  const detailOverrides: Partial<Record<string, number>> = {
    [SIDO_ID_SEOUL]: seoulTreeCount,
    ...(busanTreeCount != null && { [SIDO_ID_BUSAN]: busanTreeCount }),
    ...(jeonbukTreeCount != null && { [SIDO_ID_JEONBUK]: jeonbukTreeCount }),
  }

  /** 전국 총합: 상세 구축 데이터 있는 시도만 CSV값을 구축 합계로 치환 */
  const totalTrees =
    baseTotal +
    baseSidoCounts.reduce((delta, s) => {
      const replacement = detailOverrides[s.id]
      return delta + (replacement != null ? replacement - s.count : 0)
    }, 0)

  const sidoCounts = baseSidoCounts.map((s) => {
    const replacement = detailOverrides[s.id]
    return replacement != null ? { ...s, count: replacement } : s
  })

  const SIDO_OPTIONS = getSidoOptions(sidoCounts)
  const species = treeData?.species ?? SPECIES_DATA

  /** 선택 지역 표시값: 상세 치환값 우선, 없으면 시도 집계값 */
  const displayTotal =
    region === "00"
      ? totalTrees
      : (detailOverrides[region] ?? sidoCounts.find((s) => s.id === region)?.count ?? 0)
  const displaySpecies = species
  const regionLabel = SIDO_OPTIONS.find((o) => o.value === region)?.label ?? "전국"
  const totalLabel = region === "00" ? "전국에는" : `${regionLabel}에는`
  const totalCountFormatted = displayTotal.toLocaleString()

  /** 마커 클릭 시 상단 요약: 해당 관할 라벨 + 관할 총 그루수 */
  const hasSegmentSelected =
    !!selectedBusanSegment || !!selectedJeonjuSegment || !!selectedJeongeupSegment ||
    !!selectedWanjuSegment || !!selectedGwangjuSegment || !!selectedYonginSegment ||
    !!selectedGwangmyeongSegment || !!selectedAnyangSegment || !!selectedYangpyeongSegment || !!selectedUijeongbuSegment || !!selectedGoyangSegment || !!selectedAnsanSegment || !!selectedUiwangSegment || !!selectedGwacheonSegment
  const summaryLabel =
    selectedBusanSegment ? "부산광역시에는" :
    selectedJeonjuSegment ? "전북특별자치도 전주시에는" :
    selectedJeongeupSegment ? "전북특별자치도 정읍시에는" :
    selectedWanjuSegment ? "전북특별자치도 완주군에는" :
    selectedGwangjuSegment ? "경기도 광주시에는" :
    selectedYonginSegment ? "경기도 용인시에는" :
    selectedGwangmyeongSegment ? "경기도 광명시에는" :
    selectedAnyangSegment ? "경기도 안양시에는" :
    selectedYangpyeongSegment ? "경기도 양평군에는" :
    selectedUijeongbuSegment ? "경기도 의정부시에는" :
    selectedGoyangSegment ? "경기도 고양시에는" :
    selectedAnsanSegment ? "경기도 안산시에는" :
    selectedUiwangSegment ? "경기도 의왕시에는" :
    selectedGwacheonSegment ? "경기도 과천시에는" :
    totalLabel
  const summaryCount =
    selectedBusanSegment && busanTreeCount != null ? busanTreeCount :
    selectedJeonjuSegment ? (jeonbukDetailCounts?.jeonju ?? 0) :
    selectedJeongeupSegment ? (jeonbukDetailCounts?.jeongeup ?? 0) :
    selectedWanjuSegment ? (jeonbukDetailCounts?.wanju ?? 0) :
    selectedGwangjuSegment ? (gyeonggiDetailCounts?.gwangju ?? 0) :
    selectedYonginSegment ? (gyeonggiDetailCounts?.yongin ?? 0) :
    selectedGwangmyeongSegment ? (gyeonggiDetailCounts?.gwangmyeong ?? 0) :
    selectedAnyangSegment ? (gyeonggiDetailCounts?.anyang ?? 0) :
    selectedYangpyeongSegment ? (gyeonggiDetailCounts?.yangpyeong ?? 0) :
    selectedUijeongbuSegment ? (gyeonggiDetailCounts?.uijeongbu ?? 0) :
    selectedGoyangSegment ? (gyeonggiDetailCounts?.goyang ?? 0) :
    selectedAnsanSegment ? (gyeonggiDetailCounts?.ansan ?? 0) :
    selectedUiwangSegment ? (gyeonggiDetailCounts?.uiwang ?? 0) :
    selectedGwacheonSegment ? (gyeonggiDetailCounts?.gwacheon ?? 0) :
    displayTotal
  const summaryCountFormatted = hasSegmentSelected
    ? (typeof summaryCount === "number" ? summaryCount : displayTotal).toLocaleString()
    : totalCountFormatted
  /** 전국이면 전국 수종, 지역 선택 시에도 현재는 전국 수종 사용(지역별 수종 데이터 연동 시 교체 가능) */
  const sortedSpecies = [...displaySpecies].sort((a, b) => b.count - a.count)
  const top5Species = sortedSpecies.slice(0, 5).map((s) => ({
    name: s.name,
    count: s.count,
    fill: s.color,
  }))

  const isNationalView = region === "00"
  const chartTitle = isNationalView
    ? "전국기준 수종별 (상위 5개)"
    : `${regionLabel} 수종별 (상위 5개)`

  /** 전국 수종 1위 (지역별 수종 데이터 없음 → 전국 기준만 사용) */
  const topSpeciesNational = treeData
    ? getTopSpeciesFromData(treeData)
    : getTopSpecies()
  /** 단위 면적당(그루/km²) 가장 많은/적은 시·도 — 지도 색상 기준과 동일 */
  const sidoWithDensity = sidoCounts.map((s) => ({ ...s, density: getDensity(s.count, s.id) }))
  const topSidoByDensity =
    sidoWithDensity.length > 0
      ? [...sidoWithDensity].sort((a, b) => b.density - a.density)[0]
      : null
  const bottomSidoByDensity =
    sidoWithDensity.length > 0
      ? [...sidoWithDensity].sort((a, b) => a.density - b.density)[0]
      : null

  return (
    <>
      {(mobileOpen) && (
        <button
          type="button"
          aria-label="패널 닫기"
          className="lg:hidden fixed inset-0 bg-black/50 z-[1100] backdrop-blur-[1px]"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={`
          flex flex-col overflow-hidden shrink-0
          fixed lg:relative inset-y-0 left-0
          w-[min(340px,92vw)] lg:w-[360px]
          z-[1150] lg:z-auto
          transform transition-transform duration-300 ease-out
          bg-white lg:bg-[#f0f5ee] shadow-2xl lg:shadow-none border-r border-gray-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
      {onMobileClose && (
        <div className="lg:hidden flex items-center justify-end px-4 py-2 bg-white border-b border-slate-200">
          <button
            type="button"
            aria-label="패널 닫기"
            className="p-1.5 rounded-lg hover:bg-black/5 text-gray-600"
            onClick={onMobileClose}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="p-4 bg-white lg:bg-[#f0f5ee] border-b border-slate-200 lg:border-green-600/20">
        <div
          className="group rounded-xl sm:rounded-2xl border border-white/20 bg-gradient-to-br from-emerald-600 via-emerald-600 to-green-800 px-4 py-4 sm:px-5 sm:py-5 text-white shadow-[0_4px_20px_rgba(5,46,22,0.25)] text-center cursor-default
            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(5,46,22,0.35)] hover:-translate-y-0.5 hover:border-white/30"
        >
          <p className="text-xs sm:text-sm font-bold text-white tracking-wide transition-transform duration-300 group-hover:translate-x-0.5">
            {summaryLabel} 가로수가
          </p>
          <p className="mt-1.5 sm:mt-2 flex items-baseline justify-center gap-1 sm:gap-1.5 flex-wrap">
            <span className="text-2xl sm:text-3xl font-bold text-white transition-all duration-300 group-hover:tracking-wide">총 </span>
            <span className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-white transition-all duration-500 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
              {summaryCountFormatted}
            </span>
          </p>
          <p className="mt-0.5 text-xs sm:text-sm font-medium text-white transition-opacity duration-300 group-hover:opacity-90">
            그루 식재되어 있습니다.
          </p>
        </div>
        <div className="relative mt-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
          <select
            value={region || "00"}
            onChange={(e) => onRegionChange(e.target.value)}
            className="notranslate w-full pl-10 pr-10 py-3.5 bg-white border border-gray-200 rounded-xl text-base font-medium text-gray-800 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500 appearance-none cursor-pointer shadow-sm"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.25rem' }}
          >
            {SIDO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500 mt-1.5 px-0.5">지역을 선택하면 지도에서 확인할 수 있습니다.</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-white lg:bg-transparent dashboard-scroll">
        {(selectedBusanSegment || selectedJeonjuSegment || selectedJeongeupSegment || selectedWanjuSegment || selectedGwangjuSegment || selectedYonginSegment || selectedGwangmyeongSegment || selectedAnyangSegment || selectedYangpyeongSegment || selectedUijeongbuSegment || selectedGoyangSegment || selectedAnsanSegment || selectedUiwangSegment || selectedGwacheonSegment) && (() => {
          const seg = selectedBusanSegment ?? selectedJeonjuSegment ?? selectedJeongeupSegment ?? selectedWanjuSegment ?? selectedGwangjuSegment ?? selectedYonginSegment ?? selectedGwangmyeongSegment ?? selectedAnyangSegment ?? selectedYangpyeongSegment ?? selectedUijeongbuSegment ?? selectedGoyangSegment ?? selectedAnsanSegment ?? selectedUiwangSegment ?? selectedGwacheonSegment!
          const onClear = selectedBusanSegment ? onClearBusanSegment : selectedJeonjuSegment ? onClearJeonjuSegment : selectedJeongeupSegment ? onClearJeongeupSegment : selectedWanjuSegment ? onClearWanjuSegment : selectedGwangjuSegment ? onClearGwangjuSegment : selectedYonginSegment ? onClearYonginSegment : selectedGwangmyeongSegment ? onClearGwangmyeongSegment : selectedAnyangSegment ? onClearAnyangSegment : selectedYangpyeongSegment ? onClearYangpyeongSegment : selectedUijeongbuSegment ? onClearUijeongbuSegment : selectedGoyangSegment ? onClearGoyangSegment : selectedAnsanSegment ? onClearAnsanSegment : selectedUiwangSegment ? onClearUiwangSegment : selectedGwacheonSegment ? onClearGwacheonSegment : onClearYangpyeongSegment
          const regionLabel =
            selectedBusanSegment ? `부산광역시 ${seg.gu}` :
            selectedGwangjuSegment ? `경기도 ${seg.gu}` :
            selectedYonginSegment ? `경기도 용인시 ${seg.gu}` :
            selectedGwangmyeongSegment ? `경기도 ${seg.gu}` :
            selectedAnyangSegment ? `경기도 ${seg.gu}` :
            selectedYangpyeongSegment ? `경기도 ${seg.gu}` :
            selectedUijeongbuSegment ? `경기도 ${seg.gu}` :
            selectedGoyangSegment ? `경기도 ${seg.gu}` :
            selectedAnsanSegment ? `경기도 ${seg.gu}` :
            selectedUiwangSegment ? `경기도 ${seg.gu}` :
            selectedGwacheonSegment ? `경기도 ${seg.gu}` :
            selectedJeonjuSegment ? `전북특별자치도 전주시 ${seg.gu}` :
            selectedJeongeupSegment ? `전북특별자치도 정읍시${seg.gu ? ` ${seg.gu}` : ""}` :
            selectedWanjuSegment ? `전북특별자치도 완주군${seg.gu ? ` ${seg.gu}` : ""}` :
            seg.gu
          const hasLength = seg.length > 0
          const hasSpecies = seg.species && seg.species.length > 0
          return (
            <div className="mb-4 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] overflow-hidden border border-slate-200/80 dashboard-popup-card">
              <div className="flex items-center justify-between px-4 py-3 bg-[#166534] rounded-t-2xl">
                <h3 className="text-sm font-semibold text-white">가로수 정보</h3>
                {onClear && (
                  <button
                    type="button"
                    onClick={onClear}
                    className="p-1.5 rounded-lg hover:bg-white/15 text-white transition-colors"
                    aria-label="닫기"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="p-4 bg-white rounded-b-2xl">
                <p className="text-lg font-bold text-[#166534] mb-4 truncate">{seg.name}</p>
                <ul className="space-y-2.5 text-sm text-slate-800">
                  <li className="leading-relaxed">
                    <span className="text-[#166534] font-medium">[지역]</span> {regionLabel}
                  </li>
                  <li className="leading-relaxed">
                    <span className="text-[#166534] font-medium">[도로명]</span> {seg.name}
                  </li>
                  <li className="leading-relaxed">
                    <span className="text-[#166534] font-medium">[가로수]</span> {seg.trees.toLocaleString()}그루
                  </li>
                  <li className="leading-relaxed">
                    <span className="text-[#166534] font-medium">[식재거리]</span>{" "}
                    {hasLength ? `${seg.length.toLocaleString()}m` : <span className="text-slate-400">정보 없음</span>}
                  </li>
                </ul>
                <div className="pt-3 mt-3 border-t border-slate-200">
                  <p className="text-[#166534] font-semibold text-sm mb-2">[수종별]</p>
                  {hasSpecies ? (
                    <ul className="space-y-2 text-sm max-h-[180px] overflow-y-auto pr-1 dashboard-species-list text-slate-800">
                      {seg.species!.map((s) => (
                        <li key={s.name} className="flex justify-between gap-3 items-center py-1">
                          <span className="truncate">{s.name}</span>
                          <span className="tabular-nums shrink-0 font-medium">{s.count.toLocaleString()}그루</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-400 text-sm">수종 정보 없음</p>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
        {treeData === null && !treeDataError && (
          <div className="py-3 text-base text-gray-600">
            데이터 로딩 중…
          </div>
        )}
        {treeDataError && (
          <div className="py-3 text-base font-medium text-amber-700 bg-amber-50">
            {treeDataError} (기본 데이터로 표시 중)
          </div>
        )}
        <div className="mb-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-2 flex-wrap">
            <p className="text-base font-semibold text-slate-800">{chartTitle}</p>
            <span className="text-xs text-slate-500">
              {isNationalView
                ? "단위: 그루 (전국 시도 합계)"
                : "단위: 그루 (전국 집계)"}
            </span>
          </div>
          <div className="px-4 pb-4">
            <div className="h-[200px] sm:h-[240px] w-full rounded-lg border border-slate-200 overflow-hidden bg-white">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={top5Species}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip
                    content={({ payload }) =>
                      payload?.[0] != null ? (
                        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
                          {(payload[0].value as number)?.toLocaleString()}그루
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="count" radius={[0, 2, 2, 0]}>
                    {top5Species.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-base font-semibold text-slate-800">한눈에 보는 가로수 통계</p>
            <span className="text-xs text-slate-500 shrink-0">
              {isNationalView ? "전국 기준" : `${regionLabel} 기준`}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">시·도 순위는 지도 색상과 동일하게 단위 면적당(그루/km²) 기준입니다.</p>
          <div className="space-y-4">
            {!isNationalView && (
              <div>
                <p className="text-xs text-slate-600 mb-1">이 지역 총 그루수</p>
                <p className="text-sm font-semibold text-[#166534]">
                  {displayTotal.toLocaleString()}그루
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-600 mb-1">
                최다 수종{!isNationalView ? " (전국 기준)" : ""}
              </p>
              <p className="text-sm font-semibold text-[#166534]">
                {topSpeciesNational?.name ?? "-"} {(topSpeciesNational?.ratio ?? 0)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 mb-1">단위 면적당 가장 많은 시·도</p>
              <p className="text-sm font-semibold text-[#166534]">
                {topSidoByDensity?.name ?? "-"}
                {topSidoByDensity?.density != null && topSidoByDensity.density > 0
                  ? ` ${topSidoByDensity.density.toFixed(1)} 그루/km²`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 mb-1">단위 면적당 가장 적은 시·도</p>
              <p className="text-sm font-semibold text-[#166534]">
                {bottomSidoByDensity?.name ?? "-"}
                {bottomSidoByDensity?.density != null
                  ? ` ${bottomSidoByDensity.density.toFixed(1)} 그루/km²`
                  : ""}
              </p>
            </div>
          </div>
        </div>

        {/* 다른 지도 링크 */}
        <div className="mt-8 pt-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">다른 지도</p>
          <a
            href="https://nurse-treemap.pages.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-emerald-300/70 hover:bg-emerald-50/80 hover:shadow-md transition-all duration-200"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200/80" aria-hidden>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-slate-800 group-hover:text-emerald-800">전국 보호수 현황지도</span>
              <span className="block text-xs text-slate-500 mt-0.5">새 탭에서 열기</span>
            </span>
            <svg className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        </div>
      </div>
    </aside>
    </>
  )
}
