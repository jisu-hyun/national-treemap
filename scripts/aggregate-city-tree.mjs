/**
 * 도시숲 CSV를 읽어 시도별·수종별 집계 JSON 생성
 * 실행: node scripts/aggregate-city-tree.mjs
 *
 * 입력 (우선순위):
 *   1) public/data/csv/sido/*.csv (시도별 분할, Git 커밋 가능)
 *   2) public/data/csv/ 도시숲 가로수 현황 원본 CSV (100MB+, .gitignore)
 * 출력: public/data/city-tree-summary.json
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import iconv from "iconv-lite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const sidoDir = path.join(root, "public/data/csv/sido")
const csvDir = path.join(root, "public/data/csv")
const outPath = path.join(root, "public/data/city-tree-summary.json")

const SIDO_TREE_COUNTS = [
  { id: "11", name: "서울특별시" },
  { id: "26", name: "부산광역시" },
  { id: "27", name: "대구광역시" },
  { id: "28", name: "인천광역시" },
  { id: "29", name: "광주광역시" },
  { id: "30", name: "대전광역시" },
  { id: "31", name: "울산광역시" },
  { id: "36", name: "세종특별자치시" },
  { id: "41", name: "경기도" },
  { id: "42", name: "강원특별자치도" },
  { id: "43", name: "충청북도" },
  { id: "44", name: "충청남도" },
  { id: "45", name: "전북특별자치도" },
  { id: "46", name: "전라남도" },
  { id: "47", name: "경상북도" },
  { id: "48", name: "경상남도" },
  { id: "50", name: "제주특별자치도" },
]

/** CSV 시군구 접두사 → 앱 시도명 (강원도·전북 등 구명 매칭) */
const SIGUNGU_TO_SIDO = {
  강원도: "강원특별자치도",
  전라북도: "전북특별자치도",
}
const SIDO_NAMES = [...SIDO_TREE_COUNTS.map((s) => s.name)].sort((a, b) => b.length - a.length)
const COL_SIGUNGU = 0
const COL_SPECIES = 4

const SPECIES_COLORS = {
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

function parseCsvLine(line) {
  const out = []
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

function sigunguToSido(sigungu) {
  const t = sigungu.trim().replace(/^\uFEFF/, "")
  for (const [alias, canonical] of Object.entries(SIGUNGU_TO_SIDO)) {
    if (t.startsWith(alias)) return canonical
  }
  for (const name of SIDO_NAMES) {
    if (t.startsWith(name)) return name
  }
  return null
}

function gatherCsvLines() {
  if (fs.existsSync(sidoDir)) {
    const files = fs.readdirSync(sidoDir).filter((f) => f.endsWith(".csv"))
    if (files.length > 0) {
      console.log("Reading 시도별 CSV from", sidoDir)
      let header = null
      const allLines = []
      for (const f of files.sort()) {
        const p = path.join(sidoDir, f)
        const text = fs.readFileSync(p, "utf-8")
        const fileLines = text.trim().split(/\r?\n/).filter(Boolean)
        if (fileLines.length < 2) continue
        if (!header) header = fileLines[0]
        allLines.push(...fileLines.slice(1))
      }
      return header ? [header, ...allLines] : []
    }
  }
  if (!fs.existsSync(csvDir)) throw new Error("public/data/csv 폴더 없음")
  // 산림청 '도시숲가로수관리 가로수 현황' 원본 파일 (시도별 분할 전)
  const legacyFiles = fs.readdirSync(csvDir).filter((f) => f.includes("도시숲가로수관리") && f.endsWith(".csv"))
  if (legacyFiles.length > 0) {
    const csvPath = path.join(csvDir, legacyFiles[0])
    console.log("Reading legacy CSV:", csvPath)
    const csvBuffer = fs.readFileSync(csvPath)
    return iconv.decode(csvBuffer, "euc-kr").trim().split(/\r?\n/).filter(Boolean)
  }
  throw new Error("CSV 없음. 시도별 분할: node scripts/split-by-sido.mjs <원본CSV>")
}

const lines = gatherCsvLines()
const sidoSum = {}
const speciesSum = {}
let total = 0

for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i])
  if (row.length <= Math.max(COL_SIGUNGU, COL_SPECIES)) continue
  const sigungu = (row[COL_SIGUNGU] || "").trim()
  const speciesName = (row[COL_SPECIES] || "").trim().replace(/^"|"$/g, "") || "기타"
  const sido = sigunguToSido(sigungu)
  if (!sido) continue
  sidoSum[sido] = (sidoSum[sido] || 0) + 1
  speciesSum[speciesName] = (speciesSum[speciesName] || 0) + 1
  total += 1
}

const sidoCounts = SIDO_TREE_COUNTS.map((s) => ({
  id: s.id,
  name: s.name,
  count: sidoSum[s.name] ?? 0,
}))

const species = Object.entries(speciesSum)
  .map(([name, count]) => ({
    name,
    count,
    ratio: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    color: SPECIES_COLORS[name] ?? "#BDC3C7",
  }))
  .filter((s) => s.count > 0)
  .sort((a, b) => b.count - a.count)

const result = { total, sidoCounts, species }
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf-8")
console.log("Wrote", outPath, "| total:", total, "| sidoCounts:", sidoCounts.length, "| species:", species.length)
