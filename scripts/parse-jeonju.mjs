/**
 * 전북 전주시 가로수 CSV → JSON (지도 마커용)
 * - 인코딩: UTF-8 → EUC-KR → CP949 순으로 자동 감지 (헤더 연번·노선명 기준)
 * - CSV에 위경도 없음 → Nominatim 지오코딩 (대한민국 + 전주시 구·노선명, 전주시 범위 우선)
 * 실행: node scripts/parse-jeonju.mjs          # 지오코딩 수행 (네트워크 필요)
 *       node scripts/parse-jeonju.mjs --no-geocode  # 구별 대표 좌표만 사용
 * 결과: public/data/jeonju-trees.json
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import iconv from "iconv-lite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

const noGeocode = process.argv.includes("--no-geocode")

function findJeonjuCsv() {
  const candidates = [
    path.join(root, "public/data/csv", "전북특별자치도_전주시_가로수_20250205.csv"),
    path.join(root, "public/data/csv", "전북특별자치도 전주시_가로수_20250205.csv"),
    path.join(root, "dist/data/csv", "전북특별자치도_전주시_가로수_20250205.csv"),
    path.join(root, "dist/data/csv", "전북특별자치도 전주시_가로수_20250205.csv"),
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  const pubDir = path.join(root, "public/data/csv")
  const distDir = path.join(root, "dist/data/csv")
  for (const dir of [pubDir, distDir]) {
    if (!fs.existsSync(dir)) continue
    const files = fs.readdirSync(dir)
    const match = files.find((f) => f.includes("전주") && f.includes("가로수") && f.endsWith(".csv"))
    if (match) return path.join(dir, match)
  }
  return null
}

const csvPath = process.argv.find((a) => a.endsWith(".csv")) || findJeonjuCsv()
if (!csvPath) {
  console.error("전주시 가로수 CSV를 찾을 수 없습니다. public/data/csv 또는 dist/data/csv에 CSV 파일을 넣거나 경로를 인자로 주세요.")
  process.exit(1)
}
console.log("CSV 경로:", csvPath)

const outPath = path.join(root, "public/data/jeonju-trees.json")
const cacheDir = path.join(root, "scripts/.geocode-cache")
const cachePath = path.join(cacheDir, "jeonju.json")

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

/** 전주시 중심 범위(대략) — 이 밖이면 결과 보정용 */
const JEONJU_CENTER = { lat: 35.82, lng: 127.15 }
const JEONJU_RADIUS = 0.08

function isInJeonju(lat, lng) {
  const dlat = lat - JEONJU_CENTER.lat
  const dlng = lng - JEONJU_CENTER.lng
  return dlat * dlat + dlng * dlng <= JEONJU_RADIUS * JEONJU_RADIUS
}

async function geocodeNominatim(query) {
  const q = query.includes("대한민국") ? query : `대한민국 ${query}`
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=3&addressdetails=1&q=${encodeURIComponent(q)}`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)
  const r = await fetch(url, {
    headers: {
      "User-Agent": "national-treemap/0.0.0 (local dev)",
      "Accept-Language": "ko",
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout))
  if (!r.ok) throw new Error(`Geocode failed: ${r.status}`)
  const data = await r.json()
  if (!Array.isArray(data) || data.length === 0) return null
  for (const item of data) {
    const lat = Number(item.lat)
    const lng = Number(item.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (isInJeonju(lat, lng)) return { lat, lng }
  }
  const first = data[0]
  return { lat: Number(first.lat), lng: Number(first.lon) }
}

/** CSV 인코딩 검사: UTF-8이면 헤더에 연번·노선명이 보임 */
function isUtf8ValidHeader(firstLine) {
  return typeof firstLine === "string" && firstLine.includes("연번") && firstLine.includes("노선명")
}

function readCsv(p) {
  const buf = fs.readFileSync(p)
  const utf8 = buf.toString("utf-8")
  const firstLineUtf8 = utf8.split(/\r?\n/)[0] || ""
  if (isUtf8ValidHeader(firstLineUtf8)) {
    console.log("CSV 인코딩: UTF-8")
    return utf8
  }
  const euckr = iconv.decode(buf, "euc-kr")
  if (isUtf8ValidHeader(euckr.split(/\r?\n/)[0] || "")) {
    console.log("CSV 인코딩: EUC-KR")
    return euckr
  }
  const cp949 = iconv.decode(buf, "cp949")
  if (isUtf8ValidHeader(cp949.split(/\r?\n/)[0] || "")) {
    console.log("CSV 인코딩: CP949")
    return cp949
  }
  console.log("CSV 인코딩: EUC-KR (fallback)")
  return euckr
}

let raw = ""
try {
  raw = readCsv(csvPath)
} catch (e) {
  console.error("CSV 읽기 실패:", csvPath, e.message)
  process.exit(1)
}

const lines = raw.trim().split(/\r?\n/).filter(Boolean)
if (lines.length < 2) {
  console.error("CSV에 데이터가 없습니다.")
  process.exit(1)
}

const header = parseCsvLine(lines[0]).map((h) => h.trim())
const idxGu = header.indexOf("구")
const idxName = header.indexOf("노선명")
const idxTrees = header.indexOf("가로수 그루수")
const idxEndpoints = header.indexOf("시점종점")
if (idxGu < 0 || idxName < 0 || idxTrees < 0) {
  console.error("필수 컬럼 없음 (구, 노선명, 가로수 그루수):", header.slice(0, 10))
  process.exit(1)
}

const speciesCols = header.slice(5)
const cache = loadCache()

/** 구별 대표 좌표 (--no-geocode 시 사용) */
const GU_COORDS = {
  완산구: { lat: 35.806, lng: 127.12 },
  덕진구: { lat: 35.829, lng: 127.14 },
}

/** 노선명+구 기준 결정론적 해시 → 0..1 */
function hashKey(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return (h % 10000) / 10000
}

/** --no-geocode 시 구 중심에서 노선별로 살짝 다른 위치 부여 (한 점에 몰리지 않게) */
function jitterFromGu(gu, routeName) {
  const base = GU_COORDS[gu] || GU_COORDS["완산구"]
  const u = hashKey(gu + "\0" + routeName)
  const v = hashKey(routeName + "\0" + gu)
  const radius = 0.012 * (0.3 + 0.7 * u)
  const angle = 2 * Math.PI * v
  return {
    lat: base.lat + radius * Math.cos(angle) * 0.8,
    lng: base.lng + radius * Math.sin(angle),
  }
}

const markers = []
let geocoded = 0
let cached = 0
let failed = 0

for (let i = 1; i < lines.length; i++) {
  if (!noGeocode && i % 15 === 0) {
    console.log(`[${i}/${lines.length - 1}] markers=${markers.length} cached=${cached} geocoded=${geocoded} failed=${failed}`)
  }
  const row = parseCsvLine(lines[i])
  const gu = (row[idxGu] || "").trim()
  const routeName = (row[idxName] || "").trim()
  const endpoints = idxEndpoints >= 0 ? (row[idxEndpoints] || "").trim().replace(/\s*~\s*/, " ") : ""
  const trees = parseInt(row[idxTrees] || "0", 10) || 0
  if (!gu || !routeName || trees <= 0) continue

  const species = []
  for (let s = 0; s < speciesCols.length; s++) {
    const count = parseInt(row[5 + s] || "0", 10) || 0
    if (count > 0 && speciesCols[s]) {
      species.push({ name: speciesCols[s], count })
    }
  }
  species.sort((a, b) => b.count - a.count)

  let coords = null
  if (noGeocode) {
    coords = jitterFromGu(gu, routeName)
  } else {
    const queries = [
      `전북특별자치도 전주시 ${gu} ${routeName}`,
      `전라북도 전주시 ${gu} ${routeName}`,
      `전주시 ${gu} ${routeName}`,
      `전북 전주시 ${gu} ${routeName}`,
    ]
    if (endpoints) {
      queries.push(`전주시 ${gu} ${routeName} ${endpoints}`)
    }
    const fallbacks = [`전북 전주시 ${gu}`, `전주시 ${gu}`]
    for (const q of queries) {
      if (cache[q]) {
        coords = cache[q]
        cached++
        break
      }
    }
    if (!coords) {
      for (const q of queries) {
        try {
          coords = await geocodeNominatim(q)
          if (coords) {
            cache[q] = coords
            geocoded++
            saveCache(cache)
            break
          }
        } catch {
          // next
        }
        await sleep(1100)
      }
    }
    if (!coords) {
      for (const q of fallbacks) {
        if (cache[q]) {
          coords = cache[q]
          cached++
          break
        }
      }
    }
    if (!coords) {
      for (const q of fallbacks) {
        try {
          coords = await geocodeNominatim(q)
          if (coords) {
            cache[q] = coords
            geocoded++
            saveCache(cache)
            break
          }
        } catch {
          // next
        }
        await sleep(1100)
      }
    }
    if (!coords) {
      failed++
      continue
    }
  }

  markers.push({
    name: routeName,
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
console.log("Wrote", outPath, "| markers:", markers.length)
console.log("Geocode:", { cached, geocoded, failed })
