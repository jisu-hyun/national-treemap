/**
 * 경기도 과천시 공간정보(도로부속물) ZIP 내 RDL_TREE_PS Shapefile → BusanSegment 형식 JSON
 * - ZIP에서 RDL_TREE_PS.* 만 추출 후 사용 (unzip -j "*RDL_TREE_PS*" -d gwacheon_trees)
 * - SHP: 좌표(EPSG:5186 → WGS84), DBF: 속성(CP949)
 * - DBF 필드: TRE_CDE(수종), BJD_CDE, RDL_IDN(도로ID) — RDL_IDN별 또는 그리드별 집계
 * 실행: node scripts/parse-gwacheon.mjs [Shapefile폴더경로]
 * 결과: public/data/gwacheon-trees.json
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import shapefile from "shapefile"
import proj4 from "proj4"
import { DBFFile } from "dbffile"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

proj4.defs(
  "EPSG:5186",
  "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
)

const OUT_PATH = path.join(root, "public/data/gwacheon-trees.json")
const GU_LABEL = "과천시"
const GRID_PRECISION = 5

function findShpDir(cliPath) {
  if (cliPath) {
    const resolved = path.isAbsolute(cliPath) ? cliPath : path.join(process.cwd(), cliPath)
    if (fs.existsSync(path.join(resolved, "RDL_TREE_PS.shp")) || fs.existsSync(path.join(resolved, "RDL_TREE_PS.SHP"))) return resolved
    const withRoot = path.join(root, cliPath)
    if (fs.existsSync(path.join(withRoot, "RDL_TREE_PS.shp")) || fs.existsSync(path.join(withRoot, "RDL_TREE_PS.SHP"))) return withRoot
  }
  const candidates = [
    path.join(root, "dist/data/csv/gwacheon_trees"),
    path.join(root, "public/data/csv/gwacheon_trees"),
  ]
  for (const p of candidates) {
    if (fs.existsSync(path.join(p, "RDL_TREE_PS.shp")) || fs.existsSync(path.join(p, "RDL_TREE_PS.SHP"))) return p
  }
  const distCsv = path.join(root, "dist/data/csv")
  if (fs.existsSync(distCsv)) {
    for (const name of fs.readdirSync(distCsv)) {
      const full = path.join(distCsv, name)
      if (fs.statSync(full).isDirectory() && (fs.existsSync(path.join(full, "RDL_TREE_PS.shp")) || fs.existsSync(path.join(full, "RDL_TREE_PS.SHP"))))
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

const TRE_CDE_MAP = {
  TRE000: "미상",
  TRE001: "은행나무",
  TRE002: "느티나무",
  TRE005: "단풍나무",
  TRE006: "벚나무",
  TRE999: "기타",
}

async function run() {
  const cliPath = process.argv[2] || null
  const shpDir = findShpDir(cliPath)
  if (!shpDir) {
    console.warn("과천시 RDL_TREE_PS.shp를 찾을 수 없습니다. ZIP에서 RDL_TREE_PS만 추출해 dist/data/csv/gwacheon_trees 에 두세요.")
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
    fs.writeFileSync(OUT_PATH, "[]", "utf-8")
    console.log("빈 배열로", OUT_PATH, "생성")
    return
  }

  console.log("Shapefile 폴더:", shpDir)

  const dbfPath = path.join(shpDir, "RDL_TREE_PS.dbf")
  const shpPath = path.join(shpDir, "RDL_TREE_PS")
  if (!fs.existsSync(dbfPath)) {
    const dbfUpper = path.join(shpDir, "RDL_TREE_PS.DBF")
    if (fs.existsSync(dbfUpper)) {
      // DBFFile.open expects exact path; copy or use uppercase path
    }
  }

  const dbf = await DBFFile.open(dbfPath, { encoding: "CP949" })
  const records = await dbf.readRecords(dbf.recordCount)

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

  const points = []
  const n = Math.min(coords.length, records.length)
  for (let i = 0; i < n; i++) {
    const [x, y] = coords[i]
    const r = records[i]
    const { lat, lng } = toWgs84(x, y)
    const RDL_IDN = r.RDL_IDN != null ? String(r.RDL_IDN).trim() : ""
    const TRE_CDE = r.TRE_CDE != null ? String(r.TRE_CDE).trim() : "TRE000"
    points.push({ lat, lng, RDL_IDN, TRE_CDE })
  }

  const byKey = new Map()
  for (const p of points) {
    let key, name
    if (p.RDL_IDN) {
      key = `rdl_${p.RDL_IDN}`
      name = `도로 ${p.RDL_IDN}`
    } else {
      key = `grid_${gridKey(p.lat, p.lng)}`
      name = "과천시 가로수"
    }
    if (!byKey.has(key)) byKey.set(key, { points: [], name })
    byKey.get(key).points.push(p)
  }

  const segments = []
  for (const [, seg] of byKey) {
    const num = seg.points.length
    const lat = seg.points.reduce((s, p) => s + p.lat, 0) / num
    const lng = seg.points.reduce((s, p) => s + p.lng, 0) / num
    const name = (seg.name || GU_LABEL + " 가로수").slice(0, 100)

    const speciesCount = {}
    for (const p of seg.points) {
      const code = p.TRE_CDE || "TRE000"
      const speciesName = TRE_CDE_MAP[code] || code
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
      trees: num,
      length: 0,
      gu: GU_LABEL,
      species: species.length > 0 ? species : undefined,
    })
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, JSON.stringify(segments, null, 2), "utf-8")
  const totalTrees = segments.reduce((s, m) => s + m.trees, 0)
  console.log("Wrote", OUT_PATH, "| segments:", segments.length, "| total trees:", totalTrees)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
