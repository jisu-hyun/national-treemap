/**
 * 부산진구 가로수 CSV → JSON (지도 마커용)
 * 실행: node scripts/parse-busan-jingu.mjs
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const csvPath = fs.existsSync(path.join(root, "public/data/csv/부산광역시_부산진구_가로수현황_20251211.csv"))
  ? path.join(root, "public/data/csv/부산광역시_부산진구_가로수현황_20251211.csv")
  : path.join(root, "dist/data/csv/부산광역시_부산진구_가로수현황_20251211.csv")
const outPath = path.join(root, "public/data/busan-jingu-trees.json")

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

const text = fs.readFileSync(csvPath, "utf-8")
const lines = text.trim().split(/\r?\n/).filter(Boolean)
if (lines.length < 2) {
  console.error("CSV에 데이터가 없습니다.")
  process.exit(1)
}

const SPECIES_COLUMNS = [
  "왕벚나무", "은행나무", "느티나무", "양버즘", "이팝나무", "메타세콰이아",
  "칠엽수", "튤립나무", "벽오동", "후박나무", "먼나무", "가시나무", "녹나무",
]

const markers = []
for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i])
  const locationName = (row[0] || "").trim()
  const lat = parseFloat(row[1])
  const lng = parseFloat(row[2])
  const length = parseInt(row[5], 10) || 0
  const trees = parseInt(row[6], 10) || 0
  const gu = (row[20] || "").trim() || "부산진구"
  if (!locationName || isNaN(lat) || isNaN(lng)) continue
  const name = locationName.replace(/^부산광역시\s*부산진구\s*/i, "").trim() || locationName

  const species = []
  for (let s = 0; s < SPECIES_COLUMNS.length; s++) {
    const count = parseInt(row[7 + s], 10) || 0
    if (count > 0) {
      species.push({ name: SPECIES_COLUMNS[s], count })
    }
  }
  species.sort((a, b) => b.count - a.count)

  markers.push({
    name,
    lat,
    lng,
    trees,
    length,
    gu,
    species: species.length > 0 ? species : undefined,
  })
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(markers, null, 2), "utf-8")
console.log("Wrote", outPath, "| markers:", markers.length)
