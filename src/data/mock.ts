export interface SidoItem {
  id: string
  name: string
  count: number
}

export interface SpeciesItem {
  name: string
  count: number
  ratio: number
  color: string
}

/** city-tree-summary.json 로드 실패 시 서울 API 대체값 */
export const SEOUL_TREE_COUNT_FROM_SITE = 288_878

/** city-tree-summary.json 로드 실패 시 fallback (지도·패널) */
export const SIDO_TREE_COUNTS: SidoItem[] = [
  { id: "11", name: "서울특별시", count: 294668 },
  { id: "26", name: "부산광역시", count: 142300 },
  { id: "27", name: "대구광역시", count: 98500 },
  { id: "28", name: "인천광역시", count: 156200 },
  { id: "29", name: "광주광역시", count: 67200 },
  { id: "30", name: "대전광역시", count: 89100 },
  { id: "31", name: "울산광역시", count: 45300 },
  { id: "36", name: "세종특별자치시", count: 32100 },
  { id: "41", name: "경기도", count: 512400 },
  { id: "42", name: "강원특별자치도", count: 187600 },
  { id: "43", name: "충청북도", count: 134200 },
  { id: "44", name: "충청남도", count: 198500 },
  { id: "45", name: "전북특별자치도", count: 165300 },
  { id: "46", name: "전라남도", count: 223100 },
  { id: "47", name: "경상북도", count: 256800 },
  { id: "48", name: "경상남도", count: 189400 },
  { id: "50", name: "제주특별자치도", count: 87600 },
]

export const SPECIES_DATA: SpeciesItem[] = [
  { name: "은행나무", count: 312000, ratio: 28.2, color: "#F4D03F" },
  { name: "양버즘나무", count: 198000, ratio: 17.9, color: "#8B4513" },
  { name: "느티나무", count: 185000, ratio: 16.7, color: "#D4A84B" },
  { name: "벚나무류", count: 142000, ratio: 12.8, color: "#E8D5D5" },
  { name: "이팝나무", count: 118000, ratio: 10.7, color: "#48C9B0" },
  { name: "플라타너스", count: 89000, ratio: 8.0, color: "#A9CCE3" },
  { name: "기타", count: 78000, ratio: 7.0, color: "#BDC3C7" },
]

export const TOTAL_TREES = SIDO_TREE_COUNTS.reduce((sum, s) => sum + s.count, 0)

export function getTopSido(): SidoItem {
  return [...SIDO_TREE_COUNTS].sort((a, b) => b.count - a.count)[0]
}

export function getTopSpecies(): SpeciesItem {
  return SPECIES_DATA[0]
}
