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
    <header className="flex items-center justify-between gap-2 sm:gap-4 pl-3 pr-3 sm:pl-10 sm:pr-6 min-h-14 sm:h-16 py-2 sm:py-0 bg-white border-b border-slate-200/80 shadow-sm shrink-0">
      <div className="flex items-center gap-1 sm:gap-6 min-w-0 flex-1 overflow-x-auto overflow-y-hidden sm:overflow-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-1 sm:gap-2 shrink-0 hover:opacity-80 transition-opacity text-left min-h-[44px] min-w-0 sm:min-w-[44px] ml-1 sm:ml-8"
          aria-label="새로고침"
        >
          <img
            src={`${import.meta.env.BASE_URL}data/logo.png`}
            alt=""
            className="h-6 sm:h-9 w-auto object-contain shrink-0"
          />
          <h1 className="text-xs sm:text-lg font-bold text-slate-800 tracking-tight max-w-[10em] sm:max-w-none whitespace-normal sm:whitespace-nowrap leading-tight">
            전국 가로수 현황지도
          </h1>
        </button>
        <nav className="flex items-center gap-0 ml-2 sm:ml-24 shrink-0" aria-label="메인 메뉴">
          {NAV_ITEMS.map((item, i) => (
            <span key={item.id} className="flex items-center shrink-0">
              {i > 0 && <span className="w-px h-4 bg-slate-200 mx-1 sm:mx-2" aria-hidden />}
              <button
                type="button"
                onClick={() => onViewChange?.(item.id)}
                title={item.label}
                className={`text-xs sm:text-sm font-medium px-2 sm:px-2 py-2 sm:py-1 rounded-lg transition-colors min-h-[44px] sm:min-h-0 flex items-center justify-center whitespace-nowrap ${
                  activeView === item.id ? "text-emerald-600" : "text-slate-500 hover:text-emerald-600"
                }`}
              >
                {item.id === "map" && item.label}
                {item.id === "learn" && (
                  <>
                    <span className="sm:hidden">가로수</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </>
                )}
                {item.id === "dataset" && (
                  <>
                    <span className="sm:hidden">데이터</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </>
                )}
              </button>
            </span>
          ))}
        </nav>
      </div>
      <div className="shrink-0 ml-1 flex items-center min-w-[44px] justify-end">
        <LanguageTranslate variant="default" />
      </div>
    </header>
  )
}
