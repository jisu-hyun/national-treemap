/**
 * 경기도 의정부시 가로수정보 CSV → JSON (지도 마커용)
 * - 컬럼: 관리번호, 수목명, ..., 수목위도, 수목경도, 행정동 등 (행당 1그루)
 * - 행마다 위·경도 그대로 1그루씩 마커 출력
 * 실행: node scripts/parse-uijeongbu.mjs [csv경로]
 * 결과: public/data/uijeongbu-trees.json
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import iconv from "iconv-lite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

function findUijeongbuCsv() {
  const candidates = [
    path.join(root, "public/data/csv", "경기도 의정부시_가로수정보_20211130.csv"),
    path.join(root, "dist/data/csv", "경기도 의정부시_가로수정보_20211130.csv"),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  for (const dir of [path.join(root, "public/data/csv"), path.join(root, "dist/data/csv")]) {
    if (!fs.existsSync(dir)) continue
    const f = fs.readdirSync(dir).find((x) => x.includes("의정부") && x.includes("가로수") && x.endsWith(".csv"))
    if (f) return path.join(dir, f)
  }
  return null
}

const csvPath = process.argv.find((a) => a.endsWith(".csv")) || findUijeongbuCsv()
if (!csvPath) {
  console.error("의정부시 가로수 CSV를 찾을 수 없습니다. public/data/csv 또는 dist/data/csv에 넣거나 경로를 인자로 주세요.")
  process.exit(1)
}
console.log("CSV 경로:", csvPath)

const outPath = path.join(root, "public/data/uijeongbu-trees.json")
const GU_LABEL = "의정부시"

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
    (firstLine.includes("관리번호") || firstLine.includes("수목위도")) &&
    (firstLine.includes("수목위도") || firstLine.includes("수목경도"))
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
const idx위도 = header.findIndex((h) => h === "수목위도")
const idx경도 = header.findIndex((h) => h === "수목경도")
const idx수목명 = header.findIndex((h) => h === "수목명")
const idx도로명 = header.findIndex((h) => h === "도로명")
const idx행정동 = header.findIndex((h) => h === "행정동")

if (idx위도 < 0 || idx경도 < 0) {
  console.error("필수 컬럼 없음(수목위도, 수목경도). 헤더:", header)
  process.exit(1)
}

const markers = []
for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i])
  const lat = parseFloat(row[idx위도])
  const lng = parseFloat(row[idx경도])
  if (isNaN(lat) || isNaN(lng)) continue

  const speciesName = idx수목명 >= 0 && row[idx수목명] ? String(row[idx수목명]).trim() : "기타"
  const roadName = idx도로명 >= 0 && row[idx도로명] ? String(row[idx도로명]).trim() : ""
  const dong = idx행정동 >= 0 && row[idx행정동] ? String(row[idx행정동]).trim() : ""
  const name = roadName || dong || "의정부"

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
