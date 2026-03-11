import { useState } from "react"
import { NewsDashboard } from "./NewsDashboard"

interface RightPanelProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function RightPanel({ mobileOpen = false, onMobileClose }: RightPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  return (
    <>
      {mobileOpen && (
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
          fixed lg:relative inset-y-0 right-0
          w-[min(340px,92vw)] lg:w-[360px]
          z-[1150] lg:z-auto
          transform transition-transform duration-300 ease-out
          bg-white lg:bg-[#f0f5ee] shadow-2xl lg:shadow-none border-l border-gray-200
          ${mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}
      >
        <div
          className="group/header relative flex items-center min-h-10 shrink-0 border-b border-gray-200/80 bg-white lg:bg-[#f0f5ee] p-4 cursor-default
            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            hover:shadow-[0_4px_20px_rgba(5,46,22,0.08)] hover:-translate-y-px"
        >
          <span className="absolute left-0 right-0 text-center text-base font-semibold text-gray-800 pointer-events-none transition-all duration-300 group-hover/header:text-gray-900">
            가로수 뉴스
          </span>
          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="새로고침"
              aria-label="뉴스 새로고침"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {onMobileClose && (
              <button
                type="button"
                aria-label="패널 닫기"
                className="lg:hidden p-1.5 rounded-lg hover:bg-black/5 text-gray-600"
                onClick={onMobileClose}
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-white lg:bg-transparent dashboard-scroll">
          <NewsDashboard refreshKey={refreshKey} />
        </div>
      </aside>
    </>
  )
}
