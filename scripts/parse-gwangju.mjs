/**
 * 경기도 광주시 가로수 Shapefile → BusanSegment 형식 JSON (지도 마커용)
 * - SHP: 좌표(EPSG:5186 → WGS84), DBF: 속성(CP949 인코딩으로 한글 정상 처리)
 * - 코드값정보(가로수).xlsx에서 TRE_CODE(수종) 매핑 로드 후 구간별 수종 집계
 * 실행: node scripts/parse-gwangju.mjs [Shapefile폴더경로]
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import shapefile from "shapefile"
import proj4 from "proj4"
import { DBFFile } from "dbffile"
import XLSX from "xlsx"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

// EPSG:5186 KGD2002 / Central Belt 2010 (공식: false_northing=600000, y_0=500000이면 약 100km 남쪽 오차)
proj4.defs(
  "EPSG:5186",
  "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
)

const OUT_PATH = path.join(root, "public/data/gwangju-trees.json")
const GRID_PRECISION = 5

function findShpDir(cliPath) {
  if (cliPath) {
    const resolved = path.isAbsolute(cliPath) ? cliPath : path.join(process.cwd(), cliPath)
    if (fs.existsSync(path.join(resolved, "RDL_TREE_PS.shp"))) return resolved
    const withRoot = path.join(root, cliPath)
    if (fs.existsSync(path.join(withRoot, "RDL_TREE_PS.shp"))) return withRoot
  }
  const candidates = [
    path.join(root, "public/data/csv/경기도 광주시_가로수(공간정보)_20251120"),
    path.join(root, "dist/data/csv/경기도 광주시_가로수(공간정보)_20251120"),
  ]
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "RDL_TREE_PS.shp"))) return dir
  }
  const csvParent = path.join(root, "public/data/csv")
  if (fs.existsSync(csvParent)) {
    for (const name of fs.readdirSync(csvParent)) {
      const full = path.join(csvParent, name)
      if (fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "RDL_TREE_PS.shp")))
        return full
    }
  }
  const distCsv = path.join(root, "dist/data/csv")
  if (fs.existsSync(distCsv)) {
    for (const name of fs.readdirSync(distCsv)) {
      const full = path.join(distCsv, name)
      if (fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "RDL_TREE_PS.shp")))
        return full
    }
  }
  return null
}

function toWgs84(x, y) {
  const [lng, lat] = proj4("EPSG:5186", "WGS84", [x, y])
  return { lat, lng }
}

function gridKey(lat, lng) {
  const r = (v, p) => Math.round(v * Math.pow(10, p)) / Math.pow(10, p)
  return `${r(lat, GRID_PRECISION)}_${r(lng, GRID_PRECISION)}`
}

/** 코드값정보(가로수).xlsx에서 TRE_CODE(가로수수종) 매핑 로드 */
function loadTreeCodeMap(shpDir) {
  const xlsxPath = path.join(shpDir, "코드값정보(가로수).xlsx")
  if (!fs.existsSync(xlsxPath)) return {}
  const wb = XLSX.readFile(xlsxPath)
  const codeSheet = wb.Sheets["코드정보"]
  if (!codeSheet) return {}
  const rows = XLSX.utils.sheet_to_json(codeSheet, { header: 1, defval: "" })
  const map = {}
  let inTreeCode = false
  for (const row of rows) {
    const first = row && row[0] != null ? String(row[0]).trim() : ""
    const code = row && row[2] != null ? String(row[2]).trim() : ""
    const value = row && row[3] != null ? String(row[3]).trim() : ""
    if (first === "TRE_CODE") inTreeCode = true
    else if (first && first !== "TRE_CODE") inTreeCode = false
    if (inTreeCode && code && value) map[code] = value
  }
  return map
}

async function run() {
  const cliPath = process.argv[2] || null
  const shpDir = findShpDir(cliPath)
  if (!shpDir) {
    console.warn("RDL_TREE_PS.shp를 찾을 수 없습니다.")
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
    fs.writeFileSync(OUT_PATH, "[]", "utf-8")
    console.log("빈 배열로", OUT_PATH, "생성")
    return
  }

  console.log("Shapefile 폴더:", shpDir)
  const treeCodeMap = loadTreeCodeMap(shpDir)

  // 1) DBF를 CP949로 읽어 속성만 배열로
  const dbfPath = path.join(shpDir, "RDL_TREE_PS.dbf")
  const dbf = await DBFFile.open(dbfPath, { encoding: "CP949" })
  const records = await dbf.readRecords(dbf.recordCount)

  // 2) SHP에서 좌표만 순서대로 수집
  const shpPath = path.join(shpDir, "RDL_TREE_PS")
  const source = await shapefile.open(shpPath)
  const coords = []
  let result = await source.read()
  while (!result.done) {
    const f = result.value
    if (f?.geometry?.type === "Point" && Array.isArray(f.geometry.coordinates)) {
      coords.push(f.geometry.coordinates)
    }
    result = await source.read()
  }

  if (coords.length !== records.length) {
    console.warn("SHP 포인트 수와 DBF 레코드 수가 다릅니다:", coords.length, records.length)
  }

  // 3) 인덱스별로 병합 후 WGS84 변환
  const points = []
  const n = Math.min(coords.length, records.length)
  for (let i = 0; i < n; i++) {
    const [x, y] = coords[i]
    const r = records[i]
    const { lat, lng } = toWgs84(x, y)
    const SEC_IDN = r.SEC_IDN != null ? String(r.SEC_IDN).trim() : ""
    const LOC_DES = (r.LOC_DES != null ? String(r.LOC_DES).trim() : "") || ""
    const TRE_CDE = r.TRE_CDE != null ? String(r.TRE_CDE).trim() : ""
    points.push({ lat, lng, SEC_IDN, LOC_DES, BJD_CDE: r.BJD_CDE != null ? String(r.BJD_CDE).trim() : "", TRE_CDE })
  }

  // 4) 구간별 집계 (키: SEC_IDN → LOC_DES → 그리드), 수종별 개수 합산
  const byKey = new Map()
  for (const p of points) {
    let key, name
    if (p.SEC_IDN) {
      key = `sec_${p.SEC_IDN}`
      name = p.LOC_DES || `구간 ${p.SEC_IDN}`
    } else if (p.LOC_DES) {
      key = `loc_${p.LOC_DES}`
      name = p.LOC_DES
    } else {
      key = `grid_${gridKey(p.lat, p.lng)}`
      name = "광주시 가로수"
    }
    if (!byKey.has(key)) byKey.set(key, { points: [], name })
    const seg = byKey.get(key)
    seg.points.push(p)
    if (p.LOC_DES && !seg.name) seg.name = p.LOC_DES
  }

  const segments = []
  for (const [, seg] of byKey) {
    const n = seg.points.length
    const lat = seg.points.reduce((s, p) => s + p.lat, 0) / n
    const lng = seg.points.reduce((s, p) => s + p.lng, 0) / n
    const name = (seg.name || "광주시 가로수").slice(0, 100)

    const speciesCount = {}
    for (const p of seg.points) {
      const code = p.TRE_CDE || "TRE000"
      const speciesName = treeCodeMap[code] || code
      speciesCount[speciesName] = (speciesCount[speciesName] || 0) + 1
    }
    const species = Object.entries(speciesCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    segments.push({
      name,
      lat,
      lng,
      trees: n,
      length: 0,
      gu: "광주시",
      species: species.length > 0 ? species : undefined,
    })
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify(segments, null, 2), "utf-8")
  console.log("Wrote", OUT_PATH, "| segments:", segments.length, "| total trees:", points.length)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
