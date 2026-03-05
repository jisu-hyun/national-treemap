/**
 * CSV 파일을 EUC-KR/CP949에서 UTF-8로 변환 (덮어쓰기)
 * 사용: node scripts/csv-to-utf8.mjs [파일경로]
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import iconv from "iconv-lite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")

const csvPath =
  process.argv[2] ||
  path.join(root, "dist/data/csv", "전북특별자치도 전주시_가로수_20250205.csv")

if (!fs.existsSync(csvPath)) {
  console.error("파일 없음:", csvPath)
  process.exit(1)
}

/** 한글 CSV 헤더인지 확인 (전주: 연번·노선명 / 정읍: 노선·본수 / 완주: 시도·시군구·행정동) */
function isKoreanCsvHeader(line) {
  if (!line || line.length < 4) return false
  const has전주 = line.includes("연번") && line.includes("노선명")
  const has정읍 = line.includes("노선") && (line.includes("본수") || line.includes("시점"))
  const has완주 = line.includes("시도") && line.includes("시군구") && line.includes("행정동")
  return has전주 || has정읍 || has완주
}

const buf = fs.readFileSync(csvPath)
const utf8 = buf.toString("utf-8")
const firstLine = utf8.split(/\r?\n/)[0] || ""

if (isKoreanCsvHeader(firstLine)) {
  console.log("이미 UTF-8:", csvPath)
  process.exit(0)
}

let decoded
try {
  decoded = iconv.decode(buf, "euc-kr")
} catch {
  decoded = iconv.decode(buf, "cp949")
}

if (!isKoreanCsvHeader(decoded.split(/\r?\n/)[0] || "")) {
  console.error("인코딩 변환 후에도 헤더 한글 확인 실패")
  process.exit(1)
}

fs.writeFileSync(csvPath, decoded, "utf-8")
console.log("UTF-8로 변환 완료:", csvPath)
