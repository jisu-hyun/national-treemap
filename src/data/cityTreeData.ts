import type { SidoItem, SpeciesItem } from "./mock"
import { SIDO_TREE_COUNTS } from "./mock"

const COL_SIGUNGU = 0
const COL_SPECIES = 4

const SIDO_NAMES = [...SIDO_TREE_COUNTS]
  .map((s) => s.name)
  .sort((a, b) => b.length - a.length)

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && c === ",") {
      out.push(cur.trim())
      cur = ""
      continue
    }
    cur += c
  }
  out.push(cur.trim())
  return out
}

function sigunguToSido(sigungu: string): string | null {
  const t = sigungu.trim().replace(/^\uFEFF/, "")
  for (const name of SIDO_NAMES) {
    if (t.startsWith(name)) return name
  }
  return null
}

const SPECIES_COLORS: Record<string, string> = {
  은행나무: "#F4D03F",
  양버즘나무: "#8B4513",
  느티나무: "#D4A84B",
  왕벚나무: "#E8D5D5",
  벚나무: "#E8D5D5",
  벚나무류: "#E8D5D5",
  메타세콰이어: "#1E8449",
  이팝나무: "#48C9B0",
  플라타너스: "#A9CCE3",
  소나무: "#2E86AB",
  가죽나무: "#6E2C00",
  회화나무: "#7DCEA0",
  무궁화: "#E74C3C",
  목련: "#F8B500",
  기타: "#BDC3C7",
}

export interface CityTreeData {
  total: number
  sidoCounts: SidoItem[]
  species: SpeciesItem[]
}

export function parseCityTreeCsv(csvText: string): CityTreeData {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean)
  const sidoSum: Record<string, number> = {}
  const speciesSum: Record<string, number> = {}
  let total = 0

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i])
    if (row.length <= Math.max(COL_SIGUNGU, COL_SPECIES)) continue
    const sigungu = row[COL_SIGUNGU]?.trim() ?? ""
    const speciesName = (row[COL_SPECIES]?.trim() || "기타").replace(/^"|"$/g, "")
    const sido = sigunguToSido(sigungu)
    if (!sido) continue

    sidoSum[sido] = (sidoSum[sido] ?? 0) + 1
    speciesSum[speciesName] = (speciesSum[speciesName] ?? 0) + 1
    total += 1
  }

  const sidoCounts: SidoItem[] = SIDO_TREE_COUNTS.map((s) => ({
    id: s.id,
    name: s.name,
    count: sidoSum[s.name] ?? 0,
  }))

  const species: SpeciesItem[] = Object.entries(speciesSum)
    .map(([name, count]) => ({
      name,
      count,
      ratio: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      color: SPECIES_COLORS[name] ?? "#BDC3C7",
    }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)

  return { total, sidoCounts, species }
}

let cached: CityTreeData | null = null

const SUMMARY_JSON_URL = `${import.meta.env.BASE_URL}data/city-tree-summary.json`

export async function loadCityTreeData(): Promise<CityTreeData> {
  if (cached) return cached
  const res = await fetch(SUMMARY_JSON_URL)
  if (!res.ok) throw new Error("도시숲 가로수 데이터를 불러올 수 없어요.")
  const raw = (await res.json()) as CityTreeData
  cached = {
    total: raw.total,
    sidoCounts: raw.sidoCounts ?? [],
    species: raw.species ?? [],
  }
  return cached
}

export function getTopSidoFromData(data: CityTreeData): SidoItem | null {
  const sorted = [...data.sidoCounts].filter((s) => s.count > 0).sort((a, b) => b.count - a.count)
  return sorted[0] ?? null
}

export function getTopSpeciesFromData(data: CityTreeData): SpeciesItem | null {
  return data.species[0] ?? null
}
