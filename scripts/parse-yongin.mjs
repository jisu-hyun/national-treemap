/**
 * 경기도 용인시 가로수 CSV → JSON (지도 마커용)
 * - 컬럼: 시도명, 시군구명, 도로구분, 수종별 그루수(은행나무,벚나무,...), 데이터기준일자
 * - 위경도 없음 → 구별 대표 좌표 + 도로구분별 지터로 마커 분리
 * - 인코딩: UTF-8 / EUC-KR / CP949 자동 감지
 * 실행: node scripts/parse-yongin.mjs [csv경로]
 * 결과: public/data/yongin-trees.json
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import iconv from "iconv-lite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

function findYonginCsv() {
  const candidates = [
    path.join(root, "public/data/csv", "경기도 용인시_가로수_20250618.csv"),
    path.join(root, "public/data/csv", "경기도_용인시_가로수_20250618.csv"),
    path.join(root, "dist/data/csv", "경기도 용인시_가로수_20250618.csv"),
    path.join(root, "dist/data/csv", "경기도_용인시_가로수_20250618.csv"),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  for (const dir of [path.join(root, "public/data/csv"), path.join(root, "dist/data/csv")]) {
    if (!fs.existsSync(dir)) continue
    const f = fs.readdirSync(dir).find((x) => x.includes("용인") && x.includes("가로수") && x.endsWith(".csv"))
    if (f) return path.join(dir, f)
  }
  return null
}

const csvPath = process.argv.find((a) => a.endsWith(".csv")) || findYonginCsv()
if (!csvPath) {
  console.error("용인시 가로수 CSV를 찾을 수 없습니다. public/data/csv 또는 dist/data/csv에 넣거나 경로를 인자로 주세요.")
  process.exit(1)
}
console.log("CSV 경로:", csvPath)

const outPath = path.join(root, "public/data/yongin-trees.json")

/** 용인시 구별 대략 중심 좌표 */
const GU_CENTROID = {
  처인구: { lat: 37.234, lng: 127.201 },
  기흥구: { lat: 37.28, lng: 127.114 },
  수지구: { lat: 37.322, lng: 127.079 },
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
  return firstLine && (firstLine.includes("시도명") || firstLine.includes("시군구")) && firstLine.includes("도로")
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

function jitterFromCenter(gu, roadType) {
  const base = GU_CENTROID[gu] || { lat: 37.28, lng: 127.13 }
  const u = hashKey(gu + roadType)
  const v = hashKey(roadType + gu)
  const radius = 0.012 * (0.3 + 0.7 * u)
  const angle = 2 * Math.PI * v
  return {
    lat: base.lat + radius * Math.cos(angle) * 0.8,
    lng: base.lng + radius * Math.sin(angle),
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
const idx시군구 = header.findIndex((h) => h && (h.trim() === "시군구명" || h.includes("시군구")))
const idx도로구분 = header.findIndex((h) => h && (h.trim() === "도로구분" || h.includes("도로구분")))
if (idx시군구 < 0 || idx도로구분 < 0) {
  console.error("필수 컬럼 없음. 헤더:", header)
  process.exit(1)
}

const speciesCols = ["은행나무", "벚나무", "느티나무", "이팝나무", "버즘나무", "메타나무", "기타나무"]
const markers = []

for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i])
  const gu = (row[idx시군구] || "").trim()
  const roadType = (row[idx도로구분] || "").trim() || "기타"
  if (!gu || !GU_CENTROID[gu]) continue

  let trees = 0
  const species = []
  for (let colName of speciesCols) {
    const idx = header.indexOf(colName)
    if (idx < 0) continue
    const count = parseInt(row[idx] || "0", 10) || 0
    if (count > 0) {
      trees += count
      species.push({ name: colName, count })
    }
  }
  species.sort((a, b) => b.count - a.count)

  if (trees <= 0) continue

  const coords = jitterFromCenter(gu, roadType)
  const name = `${gu} ${roadType}`

  markers.push({
    name,
    lat: coords.lat,
    lng: coords.lng,
    trees,
    length: 0,
    gu,
    species: species.length > 0 ? species : undefined,
  })
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(markers, null, 2), "utf-8")
const totalTrees = markers.reduce((s, m) => s + m.trees, 0)
console.log("Wrote", outPath, "| segments:", markers.length, "| total trees:", totalTrees)
