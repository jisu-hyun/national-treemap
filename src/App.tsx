import { useState, useEffect } from "react"
import { TopHeader, type ViewMode } from "./components/TopHeader"
import { GoogleTranslateLoader } from "./components/GoogleTranslateLoader"
import { LeftPanel } from "./components/LeftPanel"
import { MapPanel } from "./components/MapPanel"
import { RightPanel } from "./components/RightPanel"
import { LearnPage } from "./components/LearnPage"
import { DatasetPage } from "./components/DatasetPage"
import { loadCityTreeData, type CityTreeData } from "./data/cityTreeData"
import type { BusanSegment } from "./data/busanSegment"
import { SEOUL_TREE_COUNT_FROM_SITE } from "./data/mock"
import { getApiBase } from "./config"

function getSeoulTreeCountUrl() {
  const base = getApiBase()
  return base ? `${base}/api/seoul-tree-count` : "/api/seoul-tree-count"
}

function App() {
  const [region, setRegion] = useState("00")
  const [treeData, setTreeData] = useState<CityTreeData | null>(null)
  const [treeDataError, setTreeDataError] = useState<string | null>(null)
  const [seoulTreeCount, setSeoulTreeCount] = useState<number | null>(null)
  const [busanTreeCount, setBusanTreeCount] = useState<number | null>(null)
  /** 전북(전주·정읍·완주) 구축 데이터 합계 — MapPanel에서 합산 후 전달 */
  const [jeonbukTreeCount, setJeonbukTreeCount] = useState<number | null>(null)
  const [leftOpen, setLeftOpen] = useState(false)
  const [rightOpen, setRightOpen] = useState(false)
  const [view, setView] = useState<ViewMode>("map")
  const [selectedBusanSegment, setSelectedBusanSegment] = useState<BusanSegment | null>(null)
  const [selectedJeonjuSegment, setSelectedJeonjuSegment] = useState<BusanSegment | null>(null)
  const [selectedJeongeupSegment, setSelectedJeongeupSegment] = useState<BusanSegment | null>(null)
  const [selectedWanjuSegment, setSelectedWanjuSegment] = useState<BusanSegment | null>(null)
  const [selectedGwangjuSegment, setSelectedGwangjuSegment] = useState<BusanSegment | null>(null)

  const handleRegionChange = (value: string) => {
    setRegion(value)
    if (value !== "26") setSelectedBusanSegment(null)
    if (value !== "45") {
      setSelectedJeonjuSegment(null)
      setSelectedJeongeupSegment(null)
      setSelectedWanjuSegment(null)
    }
    if (value !== "41") setSelectedGwangjuSegment(null)
  }

  useEffect(() => {
    loadCityTreeData()
      .then(setTreeData)
      .catch((e) => setTreeDataError(e instanceof Error ? e.message : "로드 실패"))
  }, [])

  useEffect(() => {
    fetch(getSeoulTreeCountUrl())
      .then((r) => r.json())
      .then((data: { count?: number | null }) => {
        if (typeof data?.count === "number" && data.count > 0) {
          setSeoulTreeCount(data.count)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <GoogleTranslateLoader />
      <TopHeader activeView={view} onViewChange={setView} />
      {view === "learn" ? (
        <LearnPage
          onGoToMap={() => setView("map")}
          onGoToMapWithRegion={(region) => {
            setRegion(region)
            setView("map")
          }}
        />
      ) : view === "dataset" ? (
        <DatasetPage onGoToMap={() => setView("map")} />
      ) : (
        <div className="flex flex-1 min-h-0 relative">
          <LeftPanel
            region={region}
            onRegionChange={handleRegionChange}
            treeData={treeData}
            treeDataError={treeDataError}
            seoulTreeCount={seoulTreeCount ?? SEOUL_TREE_COUNT_FROM_SITE}
            busanTreeCount={busanTreeCount}
            jeonbukTreeCount={jeonbukTreeCount}
            mobileOpen={leftOpen}
            onMobileClose={() => setLeftOpen(false)}
            selectedBusanSegment={selectedBusanSegment}
            onClearBusanSegment={() => setSelectedBusanSegment(null)}
            selectedJeonjuSegment={selectedJeonjuSegment}
            onClearJeonjuSegment={() => setSelectedJeonjuSegment(null)}
            selectedJeongeupSegment={selectedJeongeupSegment}
            onClearJeongeupSegment={() => setSelectedJeongeupSegment(null)}
            selectedWanjuSegment={selectedWanjuSegment}
            onClearWanjuSegment={() => setSelectedWanjuSegment(null)}
            selectedGwangjuSegment={selectedGwangjuSegment}
            onClearGwangjuSegment={() => setSelectedGwangjuSegment(null)}
          />
          <MapPanel
            region={region}
            onRegionChange={handleRegionChange}
            treeData={treeData}
            seoulTreeCount={seoulTreeCount ?? SEOUL_TREE_COUNT_FROM_SITE}
            onBusanTreeCountLoad={setBusanTreeCount}
            onJeonbukTreeCountLoad={setJeonbukTreeCount}
            onOpenLeft={() => setLeftOpen(true)}
            onOpenRight={() => setRightOpen(true)}
            selectedBusanSegment={selectedBusanSegment}
            onBusanSegmentSelect={(s) => {
              setSelectedBusanSegment(s)
              setSelectedGwangjuSegment(null)
            }}
            selectedJeonjuSegment={selectedJeonjuSegment}
            onJeonjuSegmentSelect={(s) => {
              setSelectedJeonjuSegment(s)
              setSelectedJeongeupSegment(null)
              setSelectedWanjuSegment(null)
              setSelectedGwangjuSegment(null)
            }}
            selectedJeongeupSegment={selectedJeongeupSegment}
            onJeongeupSegmentSelect={(s) => {
              setSelectedJeongeupSegment(s)
              setSelectedJeonjuSegment(null)
              setSelectedWanjuSegment(null)
              setSelectedGwangjuSegment(null)
            }}
            selectedWanjuSegment={selectedWanjuSegment}
            onWanjuSegmentSelect={(s) => {
              setSelectedWanjuSegment(s)
              setSelectedJeonjuSegment(null)
              setSelectedJeongeupSegment(null)
              setSelectedGwangjuSegment(null)
            }}
            selectedGwangjuSegment={selectedGwangjuSegment}
            onGwangjuSegmentSelect={(s) => {
              setSelectedGwangjuSegment(s)
              setSelectedJeonjuSegment(null)
              setSelectedJeongeupSegment(null)
              setSelectedWanjuSegment(null)
            }}
          />
          <RightPanel mobileOpen={rightOpen} onMobileClose={() => setRightOpen(false)} />
        </div>
      )}
    </div>
  )
}

export default App
