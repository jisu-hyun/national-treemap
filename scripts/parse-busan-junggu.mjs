/**
 * 부산 중구 가로수 CSV → JSON (지도 마커용)
 *
 * CSV에 위경도 컬럼이 없어서 "위치(도로명 주소)"를 지오코딩하여 대표 좌표를 생성합니다.
 * 실행: node scripts/parse-busan-junggu.mjs
 * (네트워크 필요. 결과는 public/data/busan-junggu-trees.json에 저장)
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

const csvPath =
  process.argv[2] ||
  path.join(root, "public/data/csv/부산광역시_중구_가로수 현황_20260219.csv")

const outPath = path.join(root, "public/data/busan-junggu-trees.json")
const cacheDir = path.join(root, "scripts/.geocode-cache")
const cachePath = path.join(cacheDir, "busan-junggu.json")

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

function normAddr(addr) {
  return String(addr || "")
    .replace(/\s+/g, " ")
    .replace(/^부산광역시\s*중구\s*/i, "부산광역시 중구 ")
    .trim()
}

function expandQueries(addr, start, end) {
  const q = normAddr(addr)
  const out = []
  if (q) out.push(q)

  // 숫자 붙은 케이스 공백 보정: "...로123번길" → "...로 123번길"
  out.push(q.replace(/([가-힣])(\d)/g, "$1 $2"))

  const prefix = "부산광역시 중구 "
  if (start) out.push(prefix + String(start).trim())
  if (end) out.push(prefix + String(end).trim())

  return [...new Set(out.map((s) => s.trim()).filter(Boolean))]
}

async function geocodeNominatim(query) {
  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(query)}`
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
  const first = data?.[0]
  if (!first?.lat || !first?.lon) return null
  const lat = Number(first.lat)
  const lng = Number(first.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
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

const text = fs.readFileSync(csvPath, "utf-8")
const lines = text.trim().split(/\r?\n/).filter(Boolean)
if (lines.length < 2) {
  console.error("CSV에 데이터가 없습니다.")
  process.exit(1)
}

const header = parseCsvLine(lines[0]).map((h) => h.trim())
const idxRoute = header.indexOf("노선")
const idxAddr = header.indexOf("위치(도로명 주소)")
const idxStart = header.indexOf("구간시점")
const idxEnd = header.indexOf("구간종점")
const idxDist = header.indexOf("식재거리(m)")

if (idxAddr < 0 || idxDist < 0) {
  console.error("CSV 헤더가 예상과 다릅니다:", header.join(","))
  process.exit(1)
}

const speciesCols = header.slice(idxDist + 1)
const cache = loadCache()

const markers = []
let geocoded = 0
let cached = 0
let failed = 0
const failedQueries = []

for (let i = 1; i < lines.length; i++) {
  if (i % 10 === 0) {
    console.log(`[${i}/${lines.length - 1}] markers=${markers.length} cached=${cached} geocoded=${geocoded} failed=${failed}`)
  }
  const row = parseCsvLine(lines[i])
  const route = idxRoute >= 0 ? (row[idxRoute] || "").trim() : ""
  const addr = normAddr(row[idxAddr] || "")
  const start = idxStart >= 0 ? (row[idxStart] || "").trim() : ""
  const end = idxEnd >= 0 ? (row[idxEnd] || "").trim() : ""
  const dist = parseInt(row[idxDist] || "0", 10) || 0

  const species = []
  let trees = 0
  for (let s = 0; s < speciesCols.length; s++) {
    const count = parseInt(row[idxDist + 1 + s] || "0", 10) || 0
    if (count > 0) {
      species.push({ name: speciesCols[s], count })
      trees += count
    }
  }
  species.sort((a, b) => b.count - a.count)

  if (!addr || trees <= 0) continue

  const queries = expandQueries(addr, start, end)
  let coords = null
  let usedQuery = null

  for (const q of queries) {
    if (cache[q]) {
      coords = cache[q]
      usedQuery = q
      cached++
      break
    }
  }

  if (!coords) {
    for (const q of queries) {
      try {
        const got = await geocodeNominatim(q)
        await sleep(1100)
        if (got) {
          coords = got
          usedQuery = q
          cache[q] = got
          geocoded++
          saveCache(cache)
          break
        }
      } catch {
        await sleep(1100)
      }
    }
  }

  if (!coords) {
    failed++
    failedQueries.push({ addr, queries, start, end })
    continue
  }

  const name = addr.replace(/^부산광역시\s*중구\s*/i, "").trim() || addr
  markers.push({
    name,
    lat: coords.lat,
    lng: coords.lng,
    trees,
    length: dist,
    gu: "중구",
    species: species.length > 0 ? species : undefined,
    meta: { route, start, end },
    geocodeQuery: usedQuery,
  })
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(markers, null, 2), "utf-8")
console.log("Wrote", outPath, "| markers:", markers.length)
console.log("Geocode:", { cached, geocoded, failed })
if (failedQueries.length > 0) console.log("Failed queries:", failedQueries)

