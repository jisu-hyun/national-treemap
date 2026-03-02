import { NewsDashboard } from "./NewsDashboard"

interface RightPanelProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function RightPanel({ mobileOpen = false, onMobileClose }: RightPanelProps) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="패널 닫기"
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={`
          flex flex-col bg-[#f0f5ee] border-l border-gray-200 overflow-hidden
          w-[min(320px,85vw)] lg:w-[360px] shrink-0
          fixed lg:relative inset-y-0 right-0 z-50 lg:z-auto
          transform transition-transform duration-300 ease-out
          ${mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="relative flex items-center justify-center h-10 shrink-0 border-b border-gray-200/80 bg-[#f0f5ee]">
          <span className="text-sm font-semibold text-gray-700">뉴스</span>
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
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          <NewsDashboard />
        </div>
      </aside>
    </>
  )
}
