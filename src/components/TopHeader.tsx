import { LanguageTranslate } from "./LanguageTranslate"

const NAV_ITEMS = [
  { id: "map", label: "지도" },
  { id: "learn", label: "가로수 알아보기" },
  { id: "dataset", label: "활용 데이터" },
] as const

export type ViewMode = "map" | "learn" | "dataset"

interface TopHeaderProps {
  activeView?: ViewMode
  onViewChange?: (view: ViewMode) => void
}

export function TopHeader({ activeView = "map", onViewChange }: TopHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2 sm:gap-4 pl-6 pr-3 sm:pl-10 sm:pr-6 h-14 sm:h-16 bg-white border-b border-slate-200/80 shadow-sm shrink-0">
      <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-1">
        {/* 로고·타이틀: 왼쪽 여백으로 전체를 오른쪽으로 배치 */}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center justify-center gap-1.5 sm:gap-2 shrink-0 hover:opacity-80 transition-opacity text-left min-h-[44px] min-w-[44px] ml-6 sm:ml-8"
          aria-label="새로고침"
        >
          <img
            src={`${import.meta.env.BASE_URL}data/logo.png`}
            alt=""
            className="h-7 sm:h-9 w-auto object-contain"
          />
          <h1 className="text-sm sm:text-lg font-bold text-slate-800 tracking-tight truncate max-w-[140px] sm:max-w-none">
            전국 가로수 현황 지도
          </h1>
        </button>
        {/* 지도·가로수 알아보기·활용 데이터: 타이틀 오른쪽에 배치 */}
        <nav className="flex items-center gap-0 ml-16 sm:ml-24 shrink-0">
          {NAV_ITEMS.map((item, i) => (
            <span key={item.id} className="flex items-center">
              {i > 0 && <span className="w-px h-4 bg-slate-200 mx-2" aria-hidden />}
              <button
                type="button"
                onClick={() => onViewChange?.(item.id)}
                className={`text-sm font-medium px-3 py-2 sm:px-2 sm:py-1 rounded-lg transition-colors min-h-[44px] sm:min-h-0 flex items-center justify-center ${
                  activeView === item.id ? "text-emerald-600" : "text-slate-500 hover:text-emerald-600"
                }`}
              >
                {item.label}
              </button>
            </span>
          ))}
        </nav>
      </div>
      <div className="shrink-0">
        <LanguageTranslate variant="default" />
      </div>
    </header>
  )
}
