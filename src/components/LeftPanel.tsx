import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts"
import {
  SIDO_TREE_COUNTS,
  SPECIES_DATA,
  TOTAL_TREES,
  getTopSido,
  getTopSpecies,
} from "../data/mock"
import {
  getTopSidoFromData,
  getTopSpeciesFromData,
  type CityTreeData,
} from "../data/cityTreeData"
const SIDO_OPTIONS: { value: string; label: string }[] = [
  { value: "00", label: "전국" },
  ...SIDO_TREE_COUNTS.map((s) => ({ value: s.id, label: s.name })),
]

interface LeftPanelProps {
  region: string
  onRegionChange: (value: string) => void
  treeData: CityTreeData | null
  treeDataError: string | null
  seoulTreeCount: number
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function LeftPanel({ region, onRegionChange, treeData, treeDataError, seoulTreeCount, mobileOpen = false, onMobileClose }: LeftPanelProps) {
  const sidoCounts = treeData?.sidoCounts ?? SIDO_TREE_COUNTS
  const species = treeData?.species ?? SPECIES_DATA
  const totalTrees = treeData?.total ?? TOTAL_TREES

  const displayTotal =
    region === "00"
      ? totalTrees
      : region === "11"
        ? seoulTreeCount
        : sidoCounts.find((s) => s.id === region)?.count ?? 0
  const displaySpecies = species
  const regionLabel = SIDO_OPTIONS.find((o) => o.value === region)?.label ?? "전국"
  const totalLabel = region === "00" ? "전국에는" : `${regionLabel}에는`
  const totalCountFormatted = displayTotal.toLocaleString()
  const sortedSpecies = [...displaySpecies].sort((a, b) => b.count - a.count)
  const top5Species = sortedSpecies.slice(0, 5).map((s) => ({
    name: s.name,
    count: s.count,
    fill: s.color,
  }))

  const topSpeciesNational = treeData
    ? getTopSpeciesFromData(treeData)
    : getTopSpecies()
  const topSido = treeData
    ? getTopSidoFromData(treeData)
    : getTopSido()
  const topSidoRatio =
    topSido && totalTrees > 0 ? (topSido.count / totalTrees * 100).toFixed(1) : "0"

  const bottomSido =
    sidoCounts.length > 0
      ? [...sidoCounts].sort((a, b) => a.count - b.count)[0]
      : null
  const bottomSidoRatio =
    bottomSido && totalTrees > 0
      ? (bottomSido.count / totalTrees * 100).toFixed(1)
      : "0"

  return (
    <>
      {/* 백드롭: 모바일에서 패널 열렸을 때 */}
      {(mobileOpen) && (
        <button
          type="button"
          aria-label="패널 닫기"
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={`
          flex flex-col bg-[#f0f5ee] border-r border-gray-200 overflow-hidden
          w-[min(320px,85vw)] lg:w-[360px] shrink-0
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          transform transition-transform duration-300 ease-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
      <div className="relative flex items-center justify-center h-10 pl-4 pr-4 bg-[#f0f5ee] border-b border-green-600/30">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center justify-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <img
            src={`${import.meta.env.BASE_URL}data/logo.png`}
            alt=""
            className="h-6 sm:h-7 w-auto object-contain block shrink-0"
          />
          <span className="text-sm sm:text-base font-bold text-gray-900 tracking-tight whitespace-nowrap">
            전국 가로수 현황 지도
          </span>
        </button>
        {onMobileClose && (
          <button
            type="button"
            aria-label="패널 닫기"
            className="lg:hidden absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-black/5"
            onClick={onMobileClose}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-4 bg-[#f0f5ee] border-b border-green-600/20">
        <div className="rounded-xl sm:rounded-2xl border border-white/20 bg-gradient-to-br from-emerald-600 via-emerald-600 to-green-800 px-4 py-4 sm:px-5 sm:py-5 text-white shadow-[0_4px_20px_rgba(5,46,22,0.25)] text-center">
          <p className="text-xs sm:text-sm font-bold text-white tracking-wide">
            {totalLabel} 가로수가
          </p>
          <p className="mt-1.5 sm:mt-2 flex items-baseline justify-center gap-1 sm:gap-1.5 flex-wrap">
            <span className="text-2xl sm:text-3xl font-bold text-white">총 </span>
            <span className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-white">{totalCountFormatted}</span>
            <span className="text-xs sm:text-sm font-medium text-white">그루 식재되어 있습니다.</span>
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
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full pl-10 pr-10 py-3.5 bg-white border border-gray-200 rounded-xl text-base font-medium text-gray-800 focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none cursor-pointer shadow-sm"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1.25rem' }}
          >
            {SIDO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500 mt-1.5 px-0.5">지역을 선택하면 지도에서 확인할 수 있어요</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4">
        {treeData === null && !treeDataError && (
          <div className="py-3 text-base text-gray-600">
            데이터 불러오는 중…
          </div>
        )}
        {treeDataError && (
          <div className="py-3 text-base font-medium text-amber-700 bg-amber-50">
            {treeDataError} (목업 데이터로 표시 중)
          </div>
        )}
        <div className="p-4 bg-white rounded-lg mb-4">
        <div>
          <p className="text-base font-semibold text-gray-800 mb-2">수종별 (상위 5개)</p>
          <div className="h-[180px] sm:h-[220px] w-full rounded-lg border border-gray-200 overflow-hidden bg-white">
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

        <div className="mt-5">
          <p className="text-base font-semibold text-gray-800 mb-3">한눈에 보는 가로수 통계</p>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-600 mb-1">
                {regionLabel}에서 가장 많은 가로수
              </p>
              <p className="text-sm font-medium text-gray-800">
                {topSpeciesNational?.name ?? "-"}{" "}
                <span className="text-gray-500">{(topSpeciesNational?.ratio ?? 0)}%</span>
              </p>
              <div className="mt-1.5 h-2 w-full rounded-full bg-green-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${Math.min(100, topSpeciesNational?.ratio ?? 0)}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">나무가 가장 많은 시·도</p>
              <p className="text-sm font-medium text-gray-800">
                {topSido?.name ?? "-"}{" "}
                <span className="text-gray-500">{topSidoRatio}%</span>
              </p>
              <div className="mt-1.5 h-2 w-full rounded-full bg-violet-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all"
                  style={{ width: `${Math.min(100, parseFloat(topSidoRatio))}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-600 mb-1">나무가 가장 적은 시·도</p>
              <p className="text-sm font-medium text-gray-800">
                {bottomSido?.name ?? "-"}{" "}
                <span className="text-gray-500">{bottomSidoRatio}%</span>
              </p>
              <div className="mt-1.5 h-2 w-full rounded-full bg-amber-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min(100, parseFloat(bottomSidoRatio))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </aside>
    </>
  )
}
