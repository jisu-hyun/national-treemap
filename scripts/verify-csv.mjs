/**
 * 원본 CSV 데이터셋 검증
 * 실행: node scripts/verify-csv.mjs [CSV경로]
 * 기본: public/data/csv/도시숲가로수관리*.csv
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import iconv from "iconv-lite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const csvDir = path.join(root, "public/data/csv")
const csvPath = process.argv[2] || (() => {
  const files = fs.readdirSync(csvDir).filter(f => f.includes("도시숲가로수관리") && f.endsWith(".csv"))
  return files[0] ? path.join(csvDir, files[0]) : null
})()

if (!csvPath || !fs.existsSync(csvPath)) {
  console.error("CSV 파일을 찾을 수 없습니다.")
  console.error("사용법: node scripts/verify-csv.mjs [경로]")
  process.exit(1)
}

const buf = fs.readFileSync(csvPath)
const utf8 = buf.toString("utf-8")
const eucKr = iconv.decode(buf, "euc-kr")

const useEucKr = !utf8.includes("시군구명")
const text = useEucKr ? eucKr : utf8
const encoding = useEucKr ? "EUC-KR" : "UTF-8"

const lines = text.split(/\r?\n/)
const nonEmpty = lines.filter(Boolean)
const dataRows = nonEmpty.slice(1)

console.log("=".repeat(50))
console.log("원본 CSV 데이터셋 검증")
console.log("=".repeat(50))
console.log("파일:", csvPath)
console.log("파일 크기:", (buf.length / 1024 / 1024).toFixed(2), "MB")
console.log("인코딩:", encoding)
console.log("")
console.log("【행 수】")
console.log("  split 직후 라인 수:", lines.length)
console.log("  빈 줄 제외:", nonEmpty.length)
console.log("  헤더: 1행")
console.log("  데이터 행:", dataRows.length)
console.log("")
console.log("【헤더】")
console.log("  ", nonEmpty[0]?.substring(0, 100) + "...")
console.log("")
console.log("【데이터 행 1】")
console.log("  ", dataRows[0]?.substring(0, 100) + "...")
console.log("")
console.log("【데이터 행 마지막】")
console.log("  ", dataRows[dataRows.length - 1]?.substring(0, 100) + "...")
console.log("=".repeat(50))
