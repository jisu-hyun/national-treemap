import { useState, useEffect } from "react"
import { LeftPanel } from "./components/LeftPanel"
import { MapPanel } from "./components/MapPanel"
import { RightPanel } from "./components/RightPanel"
import { loadCityTreeData, type CityTreeData } from "./data/cityTreeData"
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

  const handleRegionChange = (value: string) => {
    setRegion(value)
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
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-1 min-h-0">
        <LeftPanel
          region={region}
          onRegionChange={handleRegionChange}
          treeData={treeData}
          treeDataError={treeDataError}
          seoulTreeCount={seoulTreeCount ?? SEOUL_TREE_COUNT_FROM_SITE}
        />
        <MapPanel
          region={region}
          onRegionChange={handleRegionChange}
          treeData={treeData}
          seoulTreeCount={seoulTreeCount ?? SEOUL_TREE_COUNT_FROM_SITE}
        />
        <RightPanel />
      </div>
    </div>
  )
}

export default App
