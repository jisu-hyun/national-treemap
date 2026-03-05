/**
 * 경기도 안산시 노선별 가로수 현황 CSV → JSON (지도 마커용)
 * - 컬럼: 시군명, 노선명, 행정동, 구간, 구간길이, 수종, 가로수본수, 비고, 데이터기준일
 * - 위·경도 없음 → 안산시 중심 + (노선명·행정동)별 지터로 좌표 부여
 * - 동일 노선·행정동·구간은 수종별 행을 합쳐 하나의 구간으로 집계
 * 실행: node scripts/parse-ansan.mjs [csv경로]
 * 결과: public/data/ansan-trees.json
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import iconv from "iconv-lite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

function findAnsanCsv() {
  const candidates = [
    path.join(root, "public/data/csv", "경기도 안산시_노선별 가로수 현황_20260129.csv"),
    path.join(root, "dist/data/csv", "경기도 안산시_노선별 가로수 현황_20260129.csv"),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  for (const dir of [path.join(root, "public/data/csv"), path.join(root, "dist/data/csv")]) {
    if (!fs.existsSync(dir)) continue
    const f = fs.readdirSync(dir).find((x) => x.includes("안산") && x.includes("가로수") && x.endsWith(".csv"))
    if (f) return path.join(dir, f)
  }
  return null
}

const csvPath = process.argv.find((a) => a.endsWith(".csv")) || findAnsanCsv()
if (!csvPath) {
  console.error("안산시 가로수 CSV를 찾을 수 없습니다. public/data/csv 또는 dist/data/csv에 넣거나 경로를 인자로 주세요.")
  process.exit(1)
}
console.log("CSV 경로:", csvPath)

const outPath = path.join(root, "public/data/ansan-trees.json")
const GU_LABEL = "안산시"
const ANSAN_CENTER = { lat: 37.32, lng: 126.83 }

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
    (firstLine.includes("시군명") || firstLine.includes("노선명")) &&
    (firstLine.includes("행정동") || firstLine.includes("가로수본수") || firstLine.includes("수종"))
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
  return iconv.decode(buf, "cp949")
}

function hashKey(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return (h % 10000) / 10000
}

function jitterFromCenter(노선명, 행정동) {
  const u = hashKey(노선명 + 행정동)
  const v = hashKey(행정동 + 노선명)
  const radius = 0.035 * (0.3 + 0.7 * u)
  const angle = 2 * Math.PI * v
  return {
    lat: ANSAN_CENTER.lat + radius * Math.cos(angle) * 0.8,
    lng: ANSAN_CENTER.lng + radius * Math.sin(angle),
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
const idx노선명 = header.findIndex((h) => h === "노선명")
const idx행정동 = header.findIndex((h) => h === "행정동")
const idx구간 = header.findIndex((h) => h === "구간")
const idx구간길이 = header.findIndex((h) => h && (h.trim() === "구간길이" || h.startsWith("구간길이")))
const idx수종 = header.findIndex((h) => h === "수종")
const idx본수 = header.findIndex((h) => h === "가로수본수")

if (idx노선명 < 0 || idx본수 < 0) {
  console.error("필수 컬럼 없음(노선명, 가로수본수). 헤더:", header)
  process.exit(1)
}

/** key: "노선명|행정동|구간" → { trees, length, species: [{ name, count }] } */
const bySegment = new Map()

for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i])
  const 노선명 = (row[idx노선명] || "").trim() || "미상"
  const 행정동 = idx행정동 >= 0 ? (row[idx행정동] || "").trim() || "미상" : "미상"
  const 구간 = idx구간 >= 0 ? (row[idx구간] || "").trim() || "" : ""
  const key = `${노선명}|${행정동}|${구간}`

  const lenVal = idx구간길이 >= 0 ? parseFloat(String(row[idx구간길이]).replace(/\s/g, "")) : 0
  const length = isNaN(lenVal) ? 0 : lenVal
  const 수종 = idx수종 >= 0 ? (row[idx수종] || "").trim() || "기타" : "기타"
  const 본수 = parseInt(row[idx본수] || "0", 10) || 0
  if (본수 <= 0) continue

  if (!bySegment.has(key)) {
    bySegment.set(key, { 노선명, 행정동, 구간, trees: 0, length, species: [] })
  }
  const seg = bySegment.get(key)
  seg.trees += 본수
  if (length > 0 && seg.length === 0) seg.length = length
  const existing = seg.species.find((s) => s.name === 수종)
  if (existing) existing.count += 본수
  else seg.species.push({ name: 수종, count: 본수 })
}

const markers = []
for (const [, seg] of bySegment) {
  seg.species.sort((a, b) => b.count - a.count)
  const coords = jitterFromCenter(seg.노선명, seg.행정동)
  const name = seg.행정동 !== "미상" ? `${seg.노선명} (${seg.행정동})` : seg.노선명
  markers.push({
    name,
    lat: coords.lat,
    lng: coords.lng,
    trees: seg.trees,
    length: seg.length || 0,
    gu: GU_LABEL,
    species: seg.species.length > 0 ? seg.species : undefined,
  })
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(markers, null, 2), "utf-8")
const totalTrees = markers.reduce((s, m) => s + m.trees, 0)
console.log("Wrote", outPath, "| segments:", markers.length, "| total trees:", totalTrees)
