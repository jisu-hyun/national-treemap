/**
 * 부산 사하구 가로수 CSV → JSON (지도 마커용)
 *
 * 주의: 사하구 CSV에는 위경도 컬럼이 없어 도로명주소를 지오코딩해서 대표 좌표를 생성합니다.
 * 실행: node scripts/parse-busan-saha.mjs
 * (네트워크 필요. 결과는 public/data/busan-saha-trees.json에 저장)
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

const csvPath =
  process.argv[2] ||
  path.join(root, "public/data/csv/부산광역시_사하구_가로수현황_20251222.csv")

const outPath = path.join(root, "public/data/busan-saha-trees.json")
const cacheDir = path.join(root, "scripts/.geocode-cache")
const cachePath = path.join(cacheDir, "busan-saha.json")

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
  return (addr || "")
    .replace(/\s+/g, " ")
    .replace(/^부산광역시\s*사하구\s*/i, "부산광역시 사하구 ")
    .trim()
}

function expandQueries(addr, start, end) {
  const q = normAddr(addr)
  const out = []
  if (q) out.push(q)

  // "…로291번길" → "…로 291번길"
  out.push(q.replace(/([가-힣])(\d)/g, "$1 $2"))

  // "A·B" → "A", "B", "A B"
  if (q.includes("·")) {
    const parts = q.split("·").map((s) => s.trim()).filter(Boolean)
    for (const p of parts) out.push(p)
    out.push(parts.join(" "))
  }

  // 보조 쿼리: 시점/종점(POI)로 재시도
  const prefix = "부산광역시 사하구 "
  if (start) out.push(prefix + String(start).trim())
  if (end) out.push(prefix + String(end).trim())

  // 중복 제거 + 빈값 제거
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
const idxOrg = header.indexOf("기관명")
const idxAddr = header.indexOf("도로명주소")
const idxStart = header.indexOf("시점")
const idxEnd = header.indexOf("종점")
const idxDist = header.indexOf("식재거리")
const idxDate = header.indexOf("데이터기준일자")

if (idxAddr < 0 || idxDist < 0 || idxDate < 0) {
  console.error("CSV 헤더가 예상과 다릅니다:", header.join(","))
  process.exit(1)
}

const speciesCols = header.slice(idxDist + 1, idxDate)
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
  const addrRaw = row[idxAddr] || ""
  const addr = normAddr(addrRaw)
  const dist = parseInt(row[idxDist] || "0", 10) || 0
  const org = idxOrg >= 0 ? (row[idxOrg] || "").trim() : "부산광역시 사하구"
  const start = idxStart >= 0 ? (row[idxStart] || "").trim() : ""
  const end = idxEnd >= 0 ? (row[idxEnd] || "").trim() : ""
  const date = (row[idxDate] || "").trim()

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

  // 캐시 우선
  for (const q of queries) {
    if (cache[q]) {
      coords = cache[q]
      usedQuery = q
      cached++
      break
    }
  }

  // 네트워크 지오코딩 (필요한 경우만)
  if (!coords) {
    for (const q of queries) {
      try {
        const got = await geocodeNominatim(q)
        // Nominatim 예의상 딜레이 (요청당)
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
        // 다음 쿼리로
        await sleep(1100)
      }
    }
  }

  if (!coords) {
    failed++
    failedQueries.push({ addr, queries, start, end })
    continue
  }

  const name = addr.replace(/^부산광역시\s*사하구\s*/i, "").trim() || addr
  markers.push({
    name,
    lat: coords.lat,
    lng: coords.lng,
    trees,
    length: dist,
    gu: "사하구",
    species: species.length > 0 ? species : undefined,
    // 참고용 필드 (앱은 무시해도 됨)
    meta: { org, start, end, date },
    geocodeQuery: usedQuery,
  })
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(markers, null, 2), "utf-8")
console.log("Wrote", outPath, "| markers:", markers.length)
console.log("Geocode:", { cached, geocoded, failed })
if (failedQueries.length > 0) {
  console.log("Failed queries:", failedQueries)
}

