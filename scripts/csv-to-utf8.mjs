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

/** 한글 CSV 헤더인지 확인 (전주: 연번·노선명 / 정읍: 노선·본수 / 완주: 시도·시군구·행정동 / 광명 등: 관리번호·행정동·가로수) */
function isKoreanCsvHeader(line) {
  if (!line || line.length < 4) return false
  const has전주 = line.includes("연번") && line.includes("노선명")
  const has정읍 = line.includes("노선") && (line.includes("본수") || line.includes("시점"))
  const has완주 = line.includes("시도") && line.includes("시군구") && line.includes("행정동")
  const has광명등 = (line.includes("관리번호") || line.includes("행정동")) && (line.includes("가로수") || line.includes("위도") || line.includes("경도"))
  const has용인등 = (line.includes("시도명") || line.includes("시군구명")) && (line.includes("도로구분") || line.includes("은행나무"))
  const has양평등 = (line.includes("지역") || line.includes("노선")) && (line.includes("은행") || line.includes("벚나무") || line.includes("가로수"))
  const has의정부등 = line.includes("가로수정보") || (line.includes("관리번호") && line.includes("위도") && line.includes("경도"))
  const has고양등 = (line.includes("구분") && (line.includes("느티나무") || line.includes("은행나무") || line.includes("왕벚나무")))
  const has안산등 = (line.includes("시군명") || line.includes("노선명")) && (line.includes("행정동") || line.includes("가로수본수") || line.includes("수종"))
  const has의왕등 = (line.includes("공간지리식별번호") || line.includes("관리번호")) && (line.includes("위도") && line.includes("경도") && line.includes("수종코드"))
  return has전주 || has정읍 || has완주 || has광명등 || has용인등 || has양평등 || has의정부등 || has고양등 || has안산등 || has의왕등
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
