/**
 * 부산 영도구 가로수 CSV → JSON (지도 마커용)
 * CSV에 위도·경도 컬럼 있음. 실행: node scripts/parse-busan-yeongdo.mjs
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

const csvPath =
  process.argv[2] ||
  path.join(root, "public/data/csv/부산광역시 영도구_가로수_20260219.csv")
const outPath = path.join(root, "public/data/busan-yeongdo-trees.json")

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

const header = parseCsvLine(lines[0]).map((h) => h.trim())
const idxLocation = header.indexOf("위치명")
const idxLat = header.indexOf("위도")
const idxLng = header.indexOf("경도")
const idxDistKm = header.indexOf("식재거리(km)")
const idxTotal = header.indexOf("총합계")
const idxGu = header.indexOf("구군명")

if (idxLocation < 0 || idxLat < 0 || idxLng < 0 || idxTotal < 0) {
  console.error("CSV 헤더가 예상과 다릅니다:", header.join(","))
  process.exit(1)
}

const speciesCols = header.slice(idxTotal + 1, idxGu).filter(Boolean)

const markers = []
for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i])
  const locationName = (row[idxLocation] || "").trim()
  const lat = parseFloat(row[idxLat])
  const lng = parseFloat(row[idxLng])
  const distVal = parseFloat(row[idxDistKm] || "0") || 0
  const length = distVal >= 100 ? Math.round(distVal) : Math.round(distVal * 1000)
  const trees = parseInt(row[idxTotal] || "0", 10) || 0
  const gu = "영도구"
  if (!locationName || isNaN(lat) || isNaN(lng)) continue

  const name = locationName.replace(/^부산광역시\s*영도구\s*/i, "").trim() || locationName

  const species = []
  for (let s = 0; s < speciesCols.length; s++) {
    const count = parseInt(row[idxTotal + 1 + s] || "0", 10) || 0
    if (count > 0) {
      species.push({ name: speciesCols[s], count })
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
