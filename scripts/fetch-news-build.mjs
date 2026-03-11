/**
 * 빌드 시점에 네이버 뉴스 API로 가로수 뉴스를 가져와 public/data/news.json 에 저장.
 * Cloudflare Pages 등 정적 배포에서도 뉴스 카드를 보여주기 위함.
 * 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET (.env 또는 빌드 환경)
 * 미설정 시 빈 목록으로 저장해 빌드는 계속 진행.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const envPath = join(root, ".env")
if (existsSync(envPath)) {
  const env = readFileSync(envPath, "utf-8")
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim()
  }
}

const outPath = join(root, "public", "data", "news.json")
const NAVER_API = "https://openapi.naver.com/v1/search/news.json"
const id = process.env.NAVER_CLIENT_ID || ""
const secret = process.env.NAVER_CLIENT_SECRET || ""

async function fetchNews() {
  if (!id || !secret) {
    console.warn("[fetch-news-build] NAVER_CLIENT_ID/SECRET 미설정 → 빈 뉴스로 저장")
    return { items: [] }
  }
  const url = new URL(NAVER_API)
  url.searchParams.set("query", "가로수")
  url.searchParams.set("display", "15")
  url.searchParams.set("sort", "date")
  const res = await fetch(url.toString(), {
    headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
  })
  if (!res.ok) {
    console.warn("[fetch-news-build] Naver API 실패", res.status, await res.text())
    return { items: [] }
  }
  const data = await res.json()
  const items = (data.items || []).map((item) => ({
    title: item.title,
    link: item.link,
    originallink: item.originallink,
    description: item.description,
    pubDate: item.pubDate,
  }))
  return { items }
}

try {
  const payload = await fetchNews()
  const dir = dirname(outPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(outPath, JSON.stringify(payload, null, 0), "utf-8")
  console.log("[fetch-news-build] public/data/news.json 저장 완료, 뉴스", payload.items.length, "건")
} catch (e) {
  console.warn("[fetch-news-build] 실패, 빈 목록 저장:", e.message)
  const dir = dirname(outPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(outPath, JSON.stringify({ items: [] }), "utf-8")
}
