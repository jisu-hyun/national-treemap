/**
 * 원본 CSV를 EUC-KR에서 UTF-8로 변환 (원본 덮어쓰기)
 * 한글이 깨져 보일 때 실행 → IDE/에디터에서 정상 표시
 * 실행: node scripts/convert-csv-to-utf8.mjs [경로]
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import iconv from "iconv-lite"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const csvDir = path.join(root, "public/data/csv")

const csvPath =
  process.argv[2] ||
  (() => {
    const files = fs.readdirSync(csvDir).filter(
      (f) => f.includes("도시숲가로수관리") && f.endsWith(".csv")
    )
    return files[0] ? path.join(csvDir, files[0]) : null
  })()

if (!csvPath || !fs.existsSync(csvPath)) {
  console.error("CSV 파일을 찾을 수 없습니다.")
  console.error("사용법: node scripts/convert-csv-to-utf8.mjs [경로]")
  process.exit(1)
}

const buf = fs.readFileSync(csvPath)
const utf8Preview = buf.toString("utf-8")
const isAlreadyUtf8 = utf8Preview.includes("시군구명")

if (isAlreadyUtf8) {
  console.log("이미 UTF-8 인코딩입니다. 변환 불필요.")
  process.exit(0)
}

const utf8Text = iconv.decode(buf, "euc-kr")
fs.writeFileSync(csvPath, utf8Text, "utf-8")
console.log("변환 완료:", csvPath)
console.log("→ EUC-KR → UTF-8 변환됨. 이제 한글이 정상 표시됩니다.")
