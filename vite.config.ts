import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function newsApiPlugin() {
  return {
    name: 'news-api',
    configureServer(server: import('vite').ViteDevServer) {
      const env = loadEnv(process.env.MODE || 'development', process.cwd(), '')
      const naverId = env.NAVER_CLIENT_ID || process.env.NAVER_CLIENT_ID
      const naverSecret = env.NAVER_CLIENT_SECRET || process.env.NAVER_CLIENT_SECRET

      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/seoul-tree-count' || req.url?.startsWith('/api/seoul-tree-count')) {
          const STTREE_URL = 'https://map.seoul.go.kr/smgis2/qry/STTREE_V2'
          const body = new URLSearchParams({
            cmd: 'getGarosuGeo',
            minx: '126.76',
            miny: '37.42',
            maxx: '127.18',
            maxy: '37.70',
            cluster: '0',
          })
          try {
            const r = await fetch(STTREE_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
              body: body.toString(),
            })
            if (!r.ok) throw new Error(`STTREE_V2 HTTP ${r.status}`)
            const json = (await r.json()) as {
              header?: { process?: string }
              body?: { totalCount?: number; cnt?: number; count?: number; list?: unknown[] }
            }
            if (json?.header?.process != null && json.header.process !== 'success') {
              throw new Error(`STTREE_V2 process=${json.header.process}`)
            }
            const maybeTotal =
              json?.body?.totalCount ?? json?.body?.cnt ?? json?.body?.count ?? null
            const count =
              typeof maybeTotal === 'number'
                ? maybeTotal
                : Array.isArray(json?.body?.list)
                  ? json.body.list.length
                  : 0
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'public, max-age=3600')
            res.end(JSON.stringify({ count }))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: (e as Error).message, count: null }))
          }
          return
        }
        if (req.url?.startsWith('/api/news')) {
          if (!naverId || !naverSecret || naverId === 'your_client_id') {
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 503
            res.end(JSON.stringify({ error: 'NAVER_CLIENT_ID, NAVER_CLIENT_SECRET을 .env에 설정하세요.' }))
            return
          }
          const url = new URL(req.url, 'http://localhost')
          const query = url.searchParams.get('query') || '가로수'
          const display = Math.min(100, Math.max(1, Number(url.searchParams.get('display')) || 5))
          const sort = url.searchParams.get('sort') === 'sim' ? 'sim' : 'date'
          const apiUrl = `https://openapi.naver.com/v1/search/news.json?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`
          try {
            const r = await fetch(apiUrl, {
              headers: { 'X-Naver-Client-Id': naverId, 'X-Naver-Client-Secret': naverSecret },
            })
            const data = await r.json()
            res.setHeader('Content-Type', 'application/json')
            res.setHeader('Cache-Control', 'public, max-age=300')
            res.end(JSON.stringify(data))
          } catch (e) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: (e as Error).message }))
          }
          return
        }
        next()
      })
    },
  }
}

const isGhPages =
  process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY
const base = isGhPages ? `/${process.env.GITHUB_REPOSITORY!.split('/')[1]}/` : '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), newsApiPlugin()],
  server: {
    port: 8000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
