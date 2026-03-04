/**
 * 부산 도시공간정보시스템 가로수 CSV → 구별 JSON (지도 마커용)
 *
 * - 그루 단위 CSV를 도로구간별로 집계, 구마다 파일 분리 (배포 용량 분산)
 * - 전용 CSV 있는 5개 구(진구·사하·중구·동래·영도) 제외, 나머지 11개 구만 처리
 *
 * 실행: node scripts/parse-busan-ugis.mjs [CSV경로] [구이름]
 *   구이름 생략 시 11개 구 모두 처리. 지정 시 해당 구만 처리 (예: node parse-busan-ugis.mjs "" 강서구)
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

const csvPath =
  process.argv[2] ||
  path.join(root, "public/data/csv/부산광역시_도시공간정보시스템_도로관리(가로수)_20250724.csv")
const onlyGu = process.argv[3] || null

const outDir = path.join(root, "public/data/busan-ugis")
const cacheDir = path.join(root, "scripts/.geocode-cache")
const cachePath = path.join(cacheDir, "busan-ugis.json")

const GU_HAVE_DEDICATED = new Set(["부산진구", "사하구", "중구", "동래구", "영도구"])
const GU_TO_FILE = {
  강서구: "gangseo",
  기장군: "gijang",
  해운대구: "haeundae",
  북구: "buk",
  금정구: "geumjeong",
  사상구: "sasang",
  남구: "nam",
  연제구: "yeonje",
  수영구: "suyeong",
  동구: "dong",
  서구: "seo",
}
const UGIS_GU_LIST = Object.keys(GU_TO_FILE)

/** 지오코딩 실패 시 구별 대략 중심 좌표 (부산 범위 내) */
const GU_CENTROID = {
  강서구: { lat: 35.21, lng: 128.98 },
  기장군: { lat: 35.24, lng: 129.22 },
  해운대구: { lat: 35.16, lng: 129.16 },
  북구: { lat: 35.2, lng: 129.03 },
  금정구: { lat: 35.24, lng: 129.09 },
  사상구: { lat: 35.16, lng: 129.07 },
  남구: { lat: 35.14, lng: 129.09 },
  연제구: { lat: 35.18, lng: 129.08 },
  수영구: { lat: 35.15, lng: 129.11 },
  동구: { lat: 35.13, lng: 129.06 },
  서구: { lat: 35.08, lng: 129.02 },
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
  return { lat: Number(first.lat), lng: Number(first.lon) }
}

function expandQueries(gu, roadName, sampleAddr) {
  const base = `부산광역시 ${gu} ${roadName}`.replace(/\s+/g, " ").trim()
  const out = [base]
  out.push(base.replace(/([가-힣])(\d)/g, "$1 $2"))
  if (sampleAddr && String(sampleAddr).trim()) {
    const a = String(sampleAddr).trim()
    if (!out.includes(a)) out.push(a)
  }
  return [...new Set(out.filter(Boolean))]
}

if (!fs.existsSync(csvPath)) {
  console.error("CSV 파일이 없습니다:", csvPath)
  process.exit(1)
}

const text = fs.readFileSync(csvPath, "utf-8")
const lines = text.trim().split(/\r?\n/).filter(Boolean)
const header = parseCsvLine(lines[0]).map((h) => h.trim())
const idxGu = header.indexOf("등록구")
const idxRoad = header.indexOf("도로구간명")
const idxAddr = header.indexOf("식재위치")
const idxSpecies = header.indexOf("수종")

if (idxGu < 0 || idxRoad < 0 || idxSpecies < 0) {
  console.error("CSV 헤더 확인:", header.join(" | "))
  process.exit(1)
}

const groupByKey = new Map()
for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i])
  const gu = (row[idxGu] || "").trim()
  if (!gu || GU_HAVE_DEDICATED.has(gu)) continue
  if (!UGIS_GU_LIST.includes(gu)) continue
  if (onlyGu && gu !== onlyGu) continue

  const road = (row[idxRoad] || "").trim() || "(미상)"
  const key = `${gu}\t${road}`
  const addr = (row[idxAddr] || "").trim()
  const species = (row[idxSpecies] || "").trim() || "기타"

  if (!groupByKey.has(key)) {
    groupByKey.set(key, { gu, road, trees: 0, speciesSum: {}, sampleAddr: addr || null })
  }
  const g = groupByKey.get(key)
  g.trees += 1
  g.speciesSum[species] = (g.speciesSum[species] || 0) + 1
  if (!g.sampleAddr && addr) g.sampleAddr = addr
}

const byGu = new Map()
for (const [, v] of groupByKey) {
  if (!byGu.has(v.gu)) byGu.set(v.gu, [])
  byGu.get(v.gu).push(v)
}

const listToProcess = onlyGu ? (UGIS_GU_LIST.includes(onlyGu) ? [onlyGu] : []) : UGIS_GU_LIST.filter((g) => byGu.has(g))
const cache = loadCache()
let totalGeocoded = 0
let totalCached = 0
let totalFailed = 0

for (const gu of listToProcess) {
  const segments = byGu.get(gu) || []
  const fileId = GU_TO_FILE[gu]
  console.log(`[${gu}] 구간 수: ${segments.length} → data/busan-ugis/${fileId}.json`)

  const markers = []
  for (let i = 0; i < segments.length; i++) {
    if (i > 0 && i % 50 === 0) {
      console.log(`  ${gu} geocode: ${i}/${segments.length} (cached=${totalCached}, geocoded=${totalGeocoded}, failed=${totalFailed})`)
    }
    const seg = segments[i]
    const species = Object.entries(seg.speciesSum)
      .filter(([, c]) => c > 0)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const queries = expandQueries(seg.gu, seg.road, seg.sampleAddr)
    let coords = null
    for (const q of queries) {
      if (cache[q]) {
        coords = cache[q]
        totalCached++
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
            cache[q] = got
            totalGeocoded++
            saveCache(cache)
            break
          }
        } catch {
          await sleep(1100)
        }
      }
    }
    if (!coords) {
      const fallback = GU_CENTROID[seg.gu]
      if (fallback) coords = fallback
      else {
        totalFailed++
        continue
      }
    }

    markers.push({
      name: seg.road,
      lat: coords.lat,
      lng: coords.lng,
      trees: seg.trees,
      length: 0,
      gu: seg.gu,
      species: species.length > 0 ? species : undefined,
    })
  }

  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `${fileId}.json`)
  fs.writeFileSync(outPath, JSON.stringify(markers, null, 2), "utf-8")
  console.log(`  Wrote ${outPath} (${markers.length} markers)`)
}

console.log("Done. Geocode stats: cached=%d geocoded=%d failed=%d", totalCached, totalGeocoded, totalFailed)
