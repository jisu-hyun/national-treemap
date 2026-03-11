/**
 * 지역별_면적 CSV에서 2024년 시·도별 면적(㎢)을 읽어 src/data/sidoAreas.ts 를 갱신.
 * 사용: node scripts/update-sido-areas-from-csv.mjs
 * CSV 경로: public/data/csv/지역별_면적_*.csv 또는 dist/data/csv/지역별_면적_*.csv (첫 매칭 사용)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

const NAME_TO_ID = {
  서울특별시: "11",
  부산광역시: "26",
  대구광역시: "27",
  인천광역시: "28",
  광주광역시: "29",
  대전광역시: "30",
  울산광역시: "31",
  세종특별자치시: "36",
  경기도: "41",
  강원특별자치도: "42",
  충청북도: "43",
  충청남도: "44",
  전라북도: "45",
  전라남도: "46",
  경상북도: "47",
  경상남도: "48",
  제주특별자치도: "50",
}

function findCsvPath() {
  const arg = process.argv[2]
  if (arg) {
    const p = join(process.cwd(), arg)
    if (existsSync(p)) return p
    if (existsSync(arg)) return arg
  }
  const dirs = [
    join(root, "public", "data", "csv"),
    join(root, "dist", "data", "csv"),
  ]
  for (const dir of dirs) {
    if (!existsSync(dir)) continue
    const files = readdirSync(dir).filter((f) => f.includes("지역별") && f.includes("면적") && f.endsWith(".csv"))
    if (files.length) return join(dir, files.sort().reverse()[0])
  }
  return null
}

function parseCsv(content) {
  const lines = content.trim().split(/\r?\n/)
  if (lines.length < 3) return {}
  const rows = lines.slice(2)
  const out = {}
  for (const line of rows) {
    const cells = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim())
    const name = cells[0]
    const id = NAME_TO_ID[name]
    if (!id) continue
    const rest = cells.slice(1).map((c) => (c === "-" || c === "" ? NaN : Number(c)))
    const yearCount = 19
    const col2024Area = (yearCount - 1) * 2
    const area = rest[col2024Area]
    if (Number.isFinite(area) && area > 0) out[id] = Math.round(area)
  }
  return out
}

function generateTs(areas) {
  const order = ["11", "26", "27", "28", "29", "30", "31", "36", "41", "42", "43", "44", "45", "46", "47", "48", "50"]
  const names = {
    "11": "서울특별시",
    "26": "부산광역시",
    "27": "대구광역시",
    "28": "인천광역시",
    "29": "광주광역시",
    "30": "대전광역시",
    "31": "울산광역시",
    "36": "세종특별자치시",
    "41": "경기도",
    "42": "강원특별자치도",
    "43": "충청북도",
    "44": "충청남도",
    "45": "전북특별자치도",
    "46": "전라남도",
    "47": "경상북도",
    "48": "경상남도",
    "50": "제주특별자치도",
  }
  const lines = [
    "/**",
    " * 시·도별 행정구역 면적(km²).",
    " *",
    " * 출처: public/data/csv/지역별_면적_*.csv (또는 dist/data/csv/) 의 2024년 면적(㎢) 컬럼.",
    " * 갱신: node scripts/update-sido-areas-from-csv.mjs [CSV경로(선택)]",
    " *",
    " * 지도 색상 계산식:",
    " *   밀도(그루/km²) = 해당 시·도의 가로수 그루 수 ÷ 해당 시·도의 행정구역 면적(km²)",
    " *",
    " * 색 구간: 17개 시·도의 밀도 값을 오름차순 정렬한 뒤",
    " * 25%, 50%, 75% 백분위를 구간 경계로 쓰고, 각 구간에 연한 녹색~진한 녹색을 대응.",
    " */",
    'export const SIDO_AREAS_KM2: Record<string, number> = {',
    ...order.map((id) => `  "${id}": ${areas[id] ?? "0"},   // ${names[id]}`),
    "}",
    "",
    "/** 밀도(그루/km²) = count ÷ 면적(km²). 면적이 없거나 0이면 0 반환. */",
    "export function getDensity(count: number, sidoId: string): number {",
    "  const area = SIDO_AREAS_KM2[sidoId] ?? 1",
    "  return area > 0 ? count / area : 0",
    "}",
  ]
  return lines.join("\n")
}

const csvPath = findCsvPath()
if (!csvPath) {
  console.error("지역별_면적_*.csv 파일을 public/data/csv/ 또는 dist/data/csv/ 에 넣어 주세요.")
  process.exit(1)
}
const content = readFileSync(csvPath, "utf-8")
const areas = parseCsv(content)
if (Object.keys(areas).length !== 17) {
  console.warn("경고: 17개 시·도가 아닙니다.", Object.keys(areas).length, "개 파싱됨.")
}
const outPath = join(root, "src", "data", "sidoAreas.ts")
writeFileSync(outPath, generateTs(areas), "utf-8")
console.log("갱신 완료:", outPath, Object.keys(areas).length, "개 시·도 (2024년 면적)")
