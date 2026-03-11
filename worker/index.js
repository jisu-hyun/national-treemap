const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...headers },
  })
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS })
    }

    const url = new URL(request.url)
    if (url.pathname === "/api/news") {
      const naverId = env.NAVER_CLIENT_ID
      const naverSecret = env.NAVER_CLIENT_SECRET
      if (!naverId || !naverSecret) {
        return json(
          { error: "NAVER_CLIENT_ID, NAVER_CLIENT_SECRET을 Worker Secrets에 설정하세요." },
          503
        )
      }
      const query = url.searchParams.get("query") || "가로수"
      const display = Math.min(100, Math.max(1, Number(url.searchParams.get("display")) || 10))
      const sort = url.searchParams.get("sort") === "sim" ? "sim" : "date"
      const apiUrl = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`
      try {
        const r = await fetch(apiUrl, {
          headers: { "X-Naver-Client-Id": naverId, "X-Naver-Client-Secret": naverSecret },
        })
        const data = await r.json()
        return json(data, 200, { "Cache-Control": "public, max-age=60" })
      } catch (e) {
        return json({ error: (e && e.message) || "요청 실패" }, 500)
      }
    }

    if (url.pathname === "/api/seoul-tree-count") {
      const body = new URLSearchParams({
        cmd: "getGarosuGeo",
        minx: "126.76",
        miny: "37.42",
        maxx: "127.18",
        maxy: "37.70",
        cluster: "0",
      })
      try {
        const r = await fetch("https://map.seoul.go.kr/smgis2/qry/STTREE_V2", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
          body: body.toString(),
        })
        if (!r.ok) throw new Error(`STTREE_V2 HTTP ${r.status}`)
        const data = await r.json()
        if (data?.header?.process != null && data.header.process !== "success") {
          throw new Error(`STTREE_V2 process=${data.header.process}`)
        }
        const maybeTotal =
          data?.body?.totalCount ?? data?.body?.cnt ?? data?.body?.count ?? null
        const count =
          typeof maybeTotal === "number"
            ? maybeTotal
            : Array.isArray(data?.body?.list)
              ? data.body.list.length
              : 0
        return json({ count }, 200, { "Cache-Control": "public, max-age=3600" })
      } catch (e) {
        return json({ error: (e && e.message) || "요청 실패", count: null }, 500)
      }
    }

    return json({ error: "Not Found" }, 404)
  },
}
