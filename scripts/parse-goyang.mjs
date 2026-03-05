/**
 * 경기도 고양시 가로수 현황 CSV → JSON (지도 마커용)
 * - 컬럼: 구분, 느티나무, 왕벚나무, 은행나무, 이팝나무, 중국단풍, 버즘나무, 메타세콰이아, 기타
 * - 위경도 없음 → 구별 대표 좌표 사용 (덕양구, 일산동구, 일산서구)
 * 실행: node scripts/parse-goyang.mjs [csv경로]
 * 결과: public/data/goyang-trees.json
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import iconv from "iconv-lite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

function findGoyangCsv() {
  const candidates = [
    path.join(root, "public/data/csv", "경기도 고양시_가로수 현황_20240601.csv"),
    path.join(root, "dist/data/csv", "경기도 고양시_가로수 현황_20240601.csv"),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  for (const dir of [path.join(root, "public/data/csv"), path.join(root, "dist/data/csv")]) {
    if (!fs.existsSync(dir)) continue
    const f = fs.readdirSync(dir).find((x) => x.includes("고양") && x.includes("가로수") && x.endsWith(".csv"))
    if (f) return path.join(dir, f)
  }
  return null
}

const csvPath = process.argv.find((a) => a.endsWith(".csv")) || findGoyangCsv()
if (!csvPath) {
  console.error("고양시 가로수 CSV를 찾을 수 없습니다. public/data/csv 또는 dist/data/csv에 넣거나 경로를 인자로 주세요.")
  process.exit(1)
}
console.log("CSV 경로:", csvPath)

const outPath = path.join(root, "public/data/goyang-trees.json")
const GU_LABEL = "고양시"

/** 고양시 구별 대략 중심 좌표 */
const GU_CENTROID = {
  덕양구: { lat: 37.63, lng: 126.83 },
  일산동구: { lat: 37.66, lng: 126.77 },
  일산서구: { lat: 37.68, lng: 126.75 },
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

function isKoreanCsvHeader(firstLine) {
  return firstLine && firstLine.includes("구분") && (firstLine.includes("느티나무") || firstLine.includes("은행나무"))
}

function readCsv(p) {
  const buf = fs.readFileSync(p)
  const utf8 = buf.toString("utf-8")
  const first = utf8.split(/\r?\n/)[0] || ""
  if (isKoreanCsvHeader(first)) {
    console.log("CSV 인코딩: UTF-8")
    return utf8
  }
  const decoded = iconv.decode(buf, "euc-kr")
  if (isKoreanCsvHeader(decoded.split(/\r?\n/)[0] || "")) {
    console.log("CSV 인코딩: EUC-KR")
    return decoded
  }
  return iconv.decode(buf, "cp949")
}

let raw
try {
  raw = readCsv(csvPath)
} catch (e) {
  console.error("CSV 읽기 실패:", e.message)
  process.exit(1)
}

const lines = raw.trim().split(/\r?\n/).filter(Boolean)
if (lines.length < 2) {
  console.error("데이터 행 없음")
  process.exit(1)
}

const header = parseCsvLine(lines[0]).map((h) => h.trim())
const idx구분 = header.findIndex((h) => h === "구분")
if (idx구분 < 0) {
  console.error("'구분' 컬럼 없음. 헤더:", header)
  process.exit(1)
}

const speciesCols = ["느티나무", "왕벚나무", "은행나무", "이팝나무", "중국단풍", "버즘나무", "메타세콰이아", "기타"]
const speciesIndices = speciesCols.map((name) => header.indexOf(name)).filter((i) => i >= 0)

function extractGuName(구분값) {
  const s = String(구분값 || "").trim()
  if (s.includes("덕양구")) return "덕양구"
  if (s.includes("일산동구")) return "일산동구"
  if (s.includes("일산서구")) return "일산서구"
  return null
}

const markers = []
for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i])
  const gu = extractGuName(row[idx구분])
  if (!gu || !GU_CENTROID[gu]) continue

  let trees = 0
  const species = []
  for (let s = 0; s < speciesIndices.length; s++) {
    const idx = speciesIndices[s]
    const colName = header[idx]
    const count = parseInt(row[idx] || "0", 10) || 0
    if (count > 0 && colName) {
      trees += count
      species.push({ name: colName, count })
    }
  }
  species.sort((a, b) => b.count - a.count)

  if (trees <= 0) continue

  const coords = GU_CENTROID[gu]
  markers.push({
    name: gu,
    lat: coords.lat,
    lng: coords.lng,
    trees,
    length: 0,
    gu: GU_LABEL,
    species: species.length > 0 ? species : undefined,
  })
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(markers, null, 2), "utf-8")
const totalTrees = markers.reduce((s, m) => s + m.trees, 0)
console.log("Wrote", outPath, "| segments:", markers.length, "| total trees:", totalTrees)
