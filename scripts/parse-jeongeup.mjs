/**
 * 전북 정읍시 가로수 노선별 현황 CSV → JSON (지도 마커용)
 * - 컬럼: 노선, 시점, 종점, 조성년도, 연장, 수종, 본수, 데이터기준일자
 * - CSV에 위경도 없음 → Nominatim 지오코딩 또는 --no-geocode 시 정읍시 중심 지터
 * 실행: node scripts/parse-jeongeup.mjs [csv경로]
 *       node scripts/parse-jeongeup.mjs --no-geocode
 * 결과: public/data/jeongeup-trees.json
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import iconv from "iconv-lite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

const noGeocode = process.argv.includes("--no-geocode")

function findJeongeupCsv() {
  const candidates = [
    path.join(root, "dist/data/csv", "전북특별자치도 정읍시_가로수 노선별 현황_20240101.csv"),
    path.join(root, "public/data/csv", "전북특별자치도 정읍시_가로수 노선별 현황_20240101.csv"),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  const distDir = path.join(root, "dist/data/csv")
  const pubDir = path.join(root, "public/data/csv")
  for (const dir of [distDir, pubDir]) {
    if (!fs.existsSync(dir)) continue
    const files = fs.readdirSync(dir)
    const match = files.find((f) => f.includes("정읍") && f.includes("가로수") && f.endsWith(".csv"))
    if (match) return path.join(dir, match)
  }
  return null
}

const csvPath = process.argv.find((a) => a.endsWith(".csv")) || findJeongeupCsv()
if (!csvPath) {
  console.error("정읍시 가로수 CSV를 찾을 수 없습니다.")
  process.exit(1)
}
console.log("CSV 경로:", csvPath)

const outPath = path.join(root, "public/data/jeongeup-trees.json")
const cacheDir = path.join(root, "scripts/.geocode-cache")
const cachePath = path.join(cacheDir, "jeongeup.json")

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
  return line && (line.includes("노선") && (line.includes("본수") || line.includes("연장")))
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

/** 수종 문자열(예: "단풍나무+왕벚나무", "왕벚나무, 단풍") → [{ name, count }] */
function parseSpecies(speciesStr, totalTrees) {
  if (!speciesStr || totalTrees <= 0) return []
  const parts = speciesStr
    .split(/[+,]/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 0) return []
  const per = Math.floor(totalTrees / parts.length)
  const remainder = totalTrees - per * parts.length
  return parts.map((name, i) => ({
    name,
    count: i === 0 ? per + remainder : per,
  }))
}

const GU = "정읍시"
const JEONGEUP_CENTER = { lat: 35.56, lng: 126.86 }

function hashKey(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return (h % 10000) / 10000
}

function jitterFromCenter(routeName) {
  const u = hashKey(routeName)
  const v = hashKey(routeName + "x")
  const radius = 0.015 * (0.3 + 0.7 * u)
  const angle = 2 * Math.PI * v
  return {
    lat: JEONGEUP_CENTER.lat + radius * Math.cos(angle) * 0.8,
    lng: JEONGEUP_CENTER.lng + radius * Math.sin(angle),
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function loadCache() {
  try {
    if (!fs.existsSync(cachePath)) return {}
    return JSON.parse(fs.readFileSync(cachePath, "utf-8")) || {}
  } catch {
    return {}
  }
}

function saveCache(cache) {
  fs.mkdirSync(cacheDir, { recursive: true })
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8")
}

async function geocodeNominatim(query) {
  const q = query.includes("대한민국") ? query : `대한민국 ${query}`
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  const r = await fetch(url, {
    headers: { "User-Agent": "national-treemap/0.0.0 (local dev)", "Accept-Language": "ko" },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout))
  if (!r.ok) return null
  const data = await r.json()
  const first = data?.[0]
  if (!first?.lat || !first?.lon) return null
  return { lat: Number(first.lat), lng: Number(first.lon) }
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
const idx노선 = header.indexOf("노선")
const idx연장 = header.indexOf("연장")
const idx수종 = header.indexOf("수종")
const idx본수 = header.indexOf("본수")
if (idx노선 < 0 || idx본수 < 0) {
  console.error("필수 컬럼 없음 (노선, 본수):", header)
  process.exit(1)
}

const cache = loadCache()
const markers = []

for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i])
  const name = (row[idx노선] || "").trim()
  const trees = parseInt(row[idx본수] || "0", 10) || 0
  if (!name || trees <= 0) continue

  const lengthKm = idx연장 >= 0 ? parseFloat(row[idx연장] || "0") || 0 : 0
  const lengthM = Math.round(lengthKm * 1000)
  const speciesStr = idx수종 >= 0 ? (row[idx수종] || "").trim() : ""
  const species = parseSpecies(speciesStr, trees)

  let coords
  if (noGeocode) {
    coords = jitterFromCenter(name)
  } else {
    const query = `전북 정읍시 ${name}`
    coords = cache[query]
    if (!coords) {
      try {
        coords = await geocodeNominatim(query)
        if (coords) {
          cache[query] = coords
          saveCache(cache)
        }
      } catch {
        // skip
      }
      await sleep(1100)
    }
    if (!coords) coords = jitterFromCenter(name)
  }

  markers.push({
    name,
    lat: coords.lat,
    lng: coords.lng,
    trees,
    length: lengthM,
    gu: GU,
    species: species.length > 0 ? species : undefined,
  })
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(markers, null, 2), "utf-8")
console.log("Wrote", outPath, "| markers:", markers.length)
