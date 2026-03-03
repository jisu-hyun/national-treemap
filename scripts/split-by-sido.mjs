/**
 * 큰 CSV를 시도별로 분할
 * 실행: node scripts/split-by-sido.mjs <입력CSV경로>
 * 출력: public/data/csv/sido/<시도명>.csv (각 파일이 Git 제한 아래로 작게)
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import iconv from "iconv-lite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const csvPath = process.argv[2]
const outDir = path.join(root, "public/data/csv/sido")

const SIDO_TREE_COUNTS = [
  { id: "11", name: "서울특별시" },
  { id: "26", name: "부산광역시" },
  { id: "27", name: "대구광역시" },
  { id: "28", name: "인천광역시" },
  { id: "29", name: "광주광역시" },
  { id: "30", name: "대전광역시" },
  { id: "31", name: "울산광역시" },
  { id: "36", name: "세종특별자치시" },
  { id: "41", name: "경기도" },
  { id: "42", name: "강원특별자치도" },
  { id: "43", name: "충청북도" },
  { id: "44", name: "충청남도" },
  { id: "45", name: "전북특별자치도" },
  { id: "46", name: "전라남도" },
  { id: "47", name: "경상북도" },
  { id: "48", name: "경상남도" },
  { id: "50", name: "제주특별자치도" },
]

/** CSV 시군구 접두사 → 앱 시도명 (강원도·전북 등 구명 매칭) */
const SIGUNGU_TO_SIDO = {
  강원도: "강원특별자치도",
  전라북도: "전북특별자치도",
}
const SIDO_NAMES = [...SIDO_TREE_COUNTS.map((s) => s.name)].sort((a, b) => b.length - a.length)

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

function sigunguToSido(sigungu) {
  const t = sigungu.trim().replace(/^\uFEFF/, "")
  for (const [alias, canonical] of Object.entries(SIGUNGU_TO_SIDO)) {
    if (t.startsWith(alias)) return canonical
  }
  for (const name of SIDO_NAMES) {
    if (t.startsWith(name)) return name
  }
  return null
}

if (!csvPath || !fs.existsSync(csvPath)) {
  console.error("CSV 경로를 지정하세요.")
  console.error("사용법: node scripts/split-by-sido.mjs <입력CSV경로>")
  console.error("예: node scripts/split-by-sido.mjs public/data/csv/도시숲가로수관리_가로수현황.csv")
  process.exit(1)
}

console.log("Reading CSV:", csvPath)
const csvBuffer = fs.readFileSync(csvPath)
const csvText = iconv.decode(csvBuffer, "euc-kr")
const lines = csvText.trim().split(/\r?\n/).filter(Boolean)
const header = lines[0]

const sidoLines = {}
for (const s of SIDO_TREE_COUNTS) {
  sidoLines[s.name] = [header]
}

let skipped = 0
for (let i = 1; i < lines.length; i++) {
  const row = parseCsvLine(lines[i])
  if (row.length < 1) continue
  const sigungu = (row[0] || "").trim()
  const sido = sigunguToSido(sigungu)
  if (!sido) {
    skipped++
    continue
  }
  sidoLines[sido].push(lines[i])
}

fs.mkdirSync(outDir, { recursive: true })

let totalRows = 0
for (const [sido, rows] of Object.entries(sidoLines)) {
  const dataRows = rows.length - 1
  if (dataRows === 0) continue
  const outPath = path.join(outDir, `${sido}.csv`)
  const content = rows.join("\n")
  fs.writeFileSync(outPath, content, "utf-8")
  const size = Buffer.byteLength(content, "utf-8")
  console.log(`  ${sido}: ${dataRows.toLocaleString()} rows, ${(size / 1024 / 1024).toFixed(2)} MB`)
  totalRows += dataRows
}

console.log("\nWrote", outDir)
console.log("Total rows:", totalRows.toLocaleString(), "| Skipped:", skipped)
console.log("\n다음 단계: node scripts/aggregate-city-tree.mjs")
