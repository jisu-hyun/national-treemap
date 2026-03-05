/**
 * 경기도 의왕시 가로수 현황(보행안전지수) CSV → JSON (지도 마커용)
 * - 컬럼: 관리번호, 행정동읍면코드, 도로구간번호, 수종코드, 위도, 경도 (행당 1그루)
 * - 위도·경도는 EPSG:5186(Korea 2000) 투영좌표 → proj4로 WGS84 변환
 * 실행: node scripts/parse-uiwang.mjs [csv경로]
 * 결과: public/data/uiwang-trees.json
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import proj4 from "proj4"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

proj4.defs(
  "EPSG:5186",
  "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
)

function findUiwangCsv() {
  const candidates = [
    path.join(root, "public/data/csv", "경기도 의왕시_가로수 현황(보행안전지수)_20221202.csv"),
    path.join(root, "dist/data/csv", "경기도 의왕시_가로수 현황(보행안전지수)_20221202.csv"),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  for (const dir of [path.join(root, "public/data/csv"), path.join(root, "dist/data/csv")]) {
    if (!fs.existsSync(dir)) continue
    const f = fs.readdirSync(dir).find((x) => x.includes("의왕") && x.includes("가로수") && x.endsWith(".csv"))
    if (f) return path.join(dir, f)
  }
  return null
}

const csvPath = process.argv.find((a) => a.endsWith(".csv")) || findUiwangCsv()
if (!csvPath) {
  console.error("의왕시 가로수 CSV를 찾을 수 없습니다. public/data/csv 또는 dist/data/csv에 넣거나 경로를 인자로 주세요.")
  process.exit(1)
}
console.log("CSV 경로:", csvPath)

const outPath = path.join(root, "public/data/uiwang-trees.json")
const GU_LABEL = "의왕시"

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

/** CSV 위도/경도 컬럼값은 EPSG:5186 (x, y) → WGS84 [lng, lat] */
function toWgs84(x, y) {
  const [lng, lat] = proj4("EPSG:5186", "WGS84", [Number(x), Number(y)])
  return { lat, lng }
}

const raw = fs.readFileSync(csvPath, "utf-8")
const lines = raw.trim().split(/\r?\n/).filter(Boolean)
if (lines.length < 2) {
  console.error("데이터 행 없음")
  process.exit(1)
}

const header = parseCsvLine(lines[0]).map((h) => h.trim())
const idx위도 = header.findIndex((h) => h === "위도")
const idx경도 = header.findIndex((h) => h === "경도")
const idx수종코드 = header.findIndex((h) => h === "수종코드")
const idx도로구간 = header.findIndex((h) => h === "도로구간번호")
const idx행정동코드 = header.findIndex((h) => h === "행정동읍면코드")

if (idx위도 < 0 || idx경도 < 0) {
  console.error("필수 컬럼 없음(위도, 경도). 헤더:", header)
  process.exit(1)
}

/** 수종코드 → 한글명 (일부만 매핑, 없으면 코드 그대로) */
const 수종코드명 = {
  TRE000: "미상",
  TRE001: "은행나무",
  TRE002: "느티나무",
  TRE005: "단풍나무",
  TRE006: "벚나무",
  TRE999: "기타",
}

const markers = []
for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i])
  const x = parseFloat(row[idx위도])
  const y = parseFloat(row[idx경도])
  if (isNaN(x) || isNaN(y) || x === 0 || y === 0) continue

  const { lat, lng } = toWgs84(x, y)
  if (lat < 33 || lat > 44 || lng < 124 || lng > 132) continue

  const code = idx수종코드 >= 0 ? (row[idx수종코드] || "").trim() : ""
  const speciesName = 수종코드명[code] || code || "기타"
  const segmentNo = idx도로구간 >= 0 ? (row[idx도로구간] || "").trim() : ""
  const name = segmentNo ? `도로구간 ${segmentNo}` : "의왕"

  markers.push({
    name,
    lat,
    lng,
    trees: 1,
    length: 0,
    gu: GU_LABEL,
    species: [{ name: speciesName, count: 1 }],
  })
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(markers, null, 2), "utf-8")
const totalTrees = markers.reduce((s, m) => s + m.trees, 0)
console.log("Wrote", outPath, "| segments:", markers.length, "| total trees:", totalTrees)
