import type { ReactElement } from "react"

export function Header(): ReactElement {
  return (
    <header className="flex items-center justify-center h-10 px-4 bg-[#f0f5ee] border-b border-green-600/30 shrink-0">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
      >
        <img
          src={`${import.meta.env.BASE_URL}data/logo.png`}
          alt=""
          className="h-7 w-auto object-contain block shrink-0"
        />
        <span className="text-base font-bold text-gray-900 tracking-tight whitespace-nowrap">
          전국 가로수 현황 지도
        </span>
      </button>
    </header>
  )
}
