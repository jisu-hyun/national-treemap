import { NewsDashboard } from "./NewsDashboard"

export function RightPanel() {
  return (
    <aside className="w-[360px] shrink-0 flex flex-col bg-[#f0f5ee] border-l border-gray-200 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        <NewsDashboard />
      </div>
    </aside>
  )
}
