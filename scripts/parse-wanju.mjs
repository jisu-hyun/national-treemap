/**
 * 전북 완주군 가로수현황 CSV → JSON (지도 마커용)
 * - 컬럼: 시도, 시군구, 행정동, 수종별 그루수..., 데이터기준일
 * - 행당 1개 행정동, 그루수는 수종 컬럼 합산. 위경도 없음 → 완주군 중심 + 행정동별 지터
 * 실행: node scripts/parse-wanju.mjs [csv경로]
 *       node scripts/parse-wanju.mjs --no-geocode
 * 결과: public/data/wanju-trees.json
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import iconv from "iconv-lite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

const csvPath =
  process.argv.find((a) => a.endsWith(".csv")) ||
  (() => {
    const candidates = [
      path.join(root, "dist/data/csv", "전북특별자치도 완주군_가로수현황_20240807.csv"),
      path.join(root, "public/data/csv", "전북특별자치도 완주군_가로수현황_20240807.csv"),
    ]
    for (const p of candidates) {
      if (fs.existsSync(p)) return p
    }
    const dirs = [path.join(root, "dist/data/csv"), path.join(root, "public/data/csv")]
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue
      const f = fs.readdirSync(dir).find((x) => x.includes("완주") && x.includes("가로수") && x.endsWith(".csv"))
      if (f) return path.join(dir, f)
    }
    return null
  })()

if (!csvPath) {
  console.error("완주군 가로수 CSV를 찾을 수 없습니다.")
  process.exit(1)
}
console.log("CSV 경로:", csvPath)

const outPath = path.join(root, "public/data/wanju-trees.json")
const GU = "완주군"
const WANJU_CENTER = { lat: 35.82, lng: 127.12 }

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

function isKoreanCsvHeader(line) {
  return line && line.includes("시도") && line.includes("행정동")
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

function jitterFromCenter(name) {
  const u = hashKey(name)
  const v = hashKey(name + "w")
  const radius = 0.018 * (0.3 + 0.7 * u)
  const angle = 2 * Math.PI * v
  return {
    lat: WANJU_CENTER.lat + radius * Math.cos(angle) * 0.8,
    lng: WANJU_CENTER.lng + radius * Math.sin(angle),
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
const idx행정동 = header.indexOf("행정동")
const idx데이터기준일 = header.indexOf("데이터기준일")
const speciesStart = 3
const speciesEnd = idx데이터기준일 >= 0 ? idx데이터기준일 : header.length
const speciesCols = header.slice(speciesStart, speciesEnd)

if (idx행정동 < 0) {
  console.error("필수 컬럼 없음 (행정동):", header)
  process.exit(1)
}

const markers = []

for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i])
  const name = (row[idx행정동] || "").trim()
  if (!name) continue

  let trees = 0
  const species = []
  for (let s = 0; s < speciesCols.length; s++) {
    const count = parseInt(row[speciesStart + s] || "0", 10) || 0
    if (count > 0 && speciesCols[s]) {
      trees += count
      species.push({ name: speciesCols[s], count })
    }
  }
  species.sort((a, b) => b.count - a.count)

  if (trees <= 0) continue

  const coords = jitterFromCenter(name)

  markers.push({
    name,
    lat: coords.lat,
    lng: coords.lng,
    trees,
    length: 0,
    gu: GU,
    species: species.length > 0 ? species : undefined,
  })
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(markers, null, 2), "utf-8")
console.log("Wrote", outPath, "| markers:", markers.length)
