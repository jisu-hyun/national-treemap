/**
 * 경기도 안양시 공간정보시스템 가로수 현황 CSV → JSON (지도 마커용)
 * - 컬럼: 관리번호, 가로수직경, 관할지역, 식재일자 (행당 1그루, 위·경도 없음)
 * - 관할지역(동)별로 집계 후 안양시 중심 + 동별 지터로 좌표 부여
 * - 인코딩: UTF-8 / EUC-KR / CP949 자동 감지
 * 실행: node scripts/parse-anyang.mjs [csv경로]
 * 결과: public/data/anyang-trees.json
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import iconv from "iconv-lite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

function findAnyangCsv() {
  const candidates = [
    path.join(root, "public/data/csv", "경기도 안양시_공간정보시스템_가로수 현황_20240628.csv"),
    path.join(root, "dist/data/csv", "경기도 안양시_공간정보시스템_가로수 현황_20240628.csv"),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  for (const dir of [path.join(root, "public/data/csv"), path.join(root, "dist/data/csv")]) {
    if (!fs.existsSync(dir)) continue
    const f = fs.readdirSync(dir).find((x) => x.includes("안양") && x.includes("가로수") && x.endsWith(".csv"))
    if (f) return path.join(dir, f)
  }
  return null
}

const csvPath = process.argv.find((a) => a.endsWith(".csv")) || findAnyangCsv()
if (!csvPath) {
  console.error("안양시 가로수 CSV를 찾을 수 없습니다. public/data/csv 또는 dist/data/csv에 넣거나 경로를 인자로 주세요.")
  process.exit(1)
}
console.log("CSV 경로:", csvPath)

const outPath = path.join(root, "public/data/anyang-trees.json")
const GU_LABEL = "안양시"
const ANYANG_CENTER = { lat: 37.394, lng: 126.956 }

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
    (firstLine.includes("관리번호") || firstLine.includes("관할지역")) &&
    (firstLine.includes("관할지역") || firstLine.includes("식재"))
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

function jitterFromCenter(name) {
  const u = hashKey(name)
  const v = hashKey(name + "a")
  const radius = 0.015 * (0.3 + 0.7 * u)
  const angle = 2 * Math.PI * v
  return {
    lat: ANYANG_CENTER.lat + radius * Math.cos(angle) * 0.8,
    lng: ANYANG_CENTER.lng + radius * Math.sin(angle),
  }
}

/** 헤더·시명·코드 등 유효한 동이 아닌 값 제외 */
function isValidDong(dong) {
  if (!dong || dong.length < 2) return false
  if (dong === "관할지역" || dong === "안양시") return false
  if (/^\d+$/.test(dong)) return false
  return true
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
const idx관할지역 = header.findIndex((h) => h === "관할지역" || (h && h.includes("관할지역")))
if (idx관할지역 < 0) {
  console.error("필수 컬럼 없음 (관할지역). 헤더:", header)
  process.exit(1)
}

/** 관할지역별 그루 수 */
const byDong = new Map()
for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i])
  const dong = (row[idx관할지역] || "").trim()
  if (!isValidDong(dong)) continue
  byDong.set(dong, (byDong.get(dong) || 0) + 1)
}

const markers = []
for (const [dong, trees] of byDong) {
  if (trees <= 0) continue
  const coords = jitterFromCenter(dong)
  markers.push({
    name: dong,
    lat: coords.lat,
    lng: coords.lng,
    trees,
    length: 0,
    gu: GU_LABEL,
    species: undefined,
  })
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(markers, null, 2), "utf-8")
const totalTrees = markers.reduce((s, m) => s + m.trees, 0)
console.log("Wrote", outPath, "| segments:", markers.length, "| total trees:", totalTrees)
