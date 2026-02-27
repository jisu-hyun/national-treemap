/**
 * 가로수 뉴스 API (네이버 검색 API 프록시)
 * 환경변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 * 실행: node server/index.mjs
 * GET /api/news?query=가로수&display=5&sort=date
 */
import express from "express"
import "dotenv/config"

const app = express()
const PORT = Number(process.env.NEWS_API_PORT) || 3001

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET

app.get("/api/news", async (req, res) => {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return res.status(503).json({
      error: "뉴스 API를 사용하려면 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 환경변수를 설정하세요.",
    })
  }

  const query = req.query.query || "가로수"
  const display = Math.min(100, Math.max(1, Number(req.query.display) || 5))
  const sort = req.query.sort === "sim" ? "sim" : "date"

  const url = new URL("https://openapi.naver.com/v1/search/news.json")
  url.searchParams.set("query", query)
  url.searchParams.set("display", String(display))
  url.searchParams.set("sort", sort)

  try {
    const apiRes = await fetch(url.toString(), {
      headers: {
        "X-Naver-Client-Id": NAVER_CLIENT_ID,
        "X-Naver-Client-Secret": NAVER_CLIENT_SECRET,
      },
    })

    if (!apiRes.ok) {
      const text = await apiRes.text()
      return res.status(apiRes.status).json({ error: text || "네이버 API 오류" })
    }

    const data = await apiRes.json()
    res.set("Cache-Control", "public, max-age=300")
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message || "서버 오류" })
  }
})

app.listen(PORT, () => {
  console.log(`News API: http://localhost:${PORT}/api/news`)
})
