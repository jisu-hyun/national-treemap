/**
 * 경기도 양평군 관내 가로수 데이터 CSV → JSON (지도 마커용)
 * - 컬럼: 읍면, 노선명, 벚나무, 은행나무, 이팝나무, 살구나무, 산수유, 느티나무, 소나무, 반송, 매실나무, 고로쇠, 연장, 비고
 * - 위·경도 없음 → 양평군 중심 + (읍면·노선명)별 지터로 좌표 부여
 * - 읍면 비어 있으면 이전 행의 읍면 유지
 * 실행: node scripts/parse-yangpyeong.mjs [csv경로]
 * 결과: public/data/yangpyeong-trees.json
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import iconv from "iconv-lite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

function findYangpyeongCsv() {
  const candidates = [
    path.join(root, "public/data/csv", "경기도 양평군_관내 가로수 데이터_20231231.csv"),
    path.join(root, "dist/data/csv", "경기도 양평군_관내 가로수 데이터_20231231.csv"),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  for (const dir of [path.join(root, "public/data/csv"), path.join(root, "dist/data/csv")]) {
    if (!fs.existsSync(dir)) continue
    const f = fs.readdirSync(dir).find((x) => x.includes("양평") && x.includes("가로수") && x.endsWith(".csv"))
    if (f) return path.join(dir, f)
  }
  return null
}

const csvPath = process.argv.find((a) => a.endsWith(".csv")) || findYangpyeongCsv()
if (!csvPath) {
  console.error("양평군 가로수 CSV를 찾을 수 없습니다. public/data/csv 또는 dist/data/csv에 넣거나 경로를 인자로 주세요.")
  process.exit(1)
}
console.log("CSV 경로:", csvPath)

const outPath = path.join(root, "public/data/yangpyeong-trees.json")
const GU_LABEL = "양평군"
const YANGPYEONG_CENTER = { lat: 37.49, lng: 127.49 }

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
  return (
    firstLine &&
    (firstLine.includes("읍면") || firstLine.includes("노선명")) &&
    (firstLine.includes("은행나무") || firstLine.includes("벚나무"))
  )
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
  console.log("CSV 인코딩: CP949 시도")
  return iconv.decode(buf, "cp949")
}

function hashKey(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return (h % 10000) / 10000
}

function jitterFromCenter(읍면, 노선명) {
  const u = hashKey(읍면 + 노선명)
  const v = hashKey(노선명 + 읍면)
  const radius = 0.04 * (0.3 + 0.7 * u)
  const angle = 2 * Math.PI * v
  return {
    lat: YANGPYEONG_CENTER.lat + radius * Math.cos(angle) * 0.8,
    lng: YANGPYEONG_CENTER.lng + radius * Math.sin(angle),
  }
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
const idx읍면 = header.findIndex((h) => h === "읍면")
const idx노선명 = header.findIndex((h) => h === "노선명")
const speciesCols = ["벚나무", "은행나무", "이팝나무", "살구나무", "산수유", "느티나무", "소나무", "반송", "매실나무", "고로쇠"]
const speciesIndices = speciesCols.map((name) => header.indexOf(name)).filter((i) => i >= 0)

if (idx읍면 < 0 || idx노선명 < 0) {
  console.error("필수 컬럼 없음 (읍면, 노선명). 헤더:", header)
  process.exit(1)
}

const markers = []
let current읍면 = ""

for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i])
  const 읍면 = (row[idx읍면] || "").trim() || current읍면
  const 노선명 = (row[idx노선명] || "").trim()
  if (읍면) current읍면 = 읍면
  if (!노선명) continue

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

  const coords = jitterFromCenter(current읍면, 노선명)
  const name = `${current읍면} ${노선명}`.trim()

  markers.push({
    name,
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
