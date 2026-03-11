import { useState, useEffect } from "react"
import { getApiBase, isStaticHost } from "../config"

const NAVER_NEWS_LINK = "https://search.naver.com/search.naver?where=news&query=가로수&sort=date&nso=so%3Ad%2Cp%3Aall%2Ca%3Aall"

function getNewsApiUrl() {
  const base = getApiBase()
  return base ? `${base}/api/news` : "/api/news"
}

interface NewsItem {
  title: string
  link: string
  originallink?: string
  description: string
  pubDate: string
}

interface NaverNewsResponse {
  items?: NewsItem[]
  error?: string
  errorMessage?: string
  errorCode?: string
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

function formatDate(pubDate: string): string {
  try {
    const d = new Date(pubDate)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    if (hours < 1) return "방금 전"
    if (hours < 24) return `${hours}시간 전`
    if (days < 7) return `${days}일 전`
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
  } catch {
    return ""
  }
}

interface NewsDashboardProps {
  refreshKey?: number
}

export function NewsDashboard({ refreshKey = 0 }: NewsDashboardProps) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  const fetchNews = () => {
    const apiUrl = getNewsApiUrl()
    const base = getApiBase()
    if (typeof window !== "undefined" && isStaticHost() && !base) {
      setLoading(false)
      setError(null)
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    fetch(`${apiUrl}?query=가로수&display=10&sort=date`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text()
          let errMsg = res.status === 503 ? "API 미설정" : "로드 실패"
          try {
            const json = JSON.parse(text)
            if (json?.error) errMsg = json.error
            else if (json?.errorMessage) errMsg = json.errorMessage
          } catch {}
          throw new Error(errMsg)
        }
        return res.json()
      })
      .then((data: NaverNewsResponse) => {
        if (data.error) throw new Error(data.error)
        if (data.errorMessage) throw new Error(data.errorMessage)
        setItems(data.items ?? [])
      })
      .catch((e) => {
        setError(e.message ?? "뉴스를 불러올 수 없습니다.")
        setItems([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchNews()
  }, [retry, refreshKey])

  if (loading) {
    return (
      <div className="border-t border-slate-100 pt-0">
        <p className="text-xs text-slate-500">뉴스 불러오는 중…</p>
      </div>
    )
  }

  if (error || items.length === 0) {
    return (
      <div className="border-t border-slate-100 pt-0">
          <a
            href={NAVER_NEWS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm
              transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
              hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(5,46,22,0.15)] hover:border-emerald-200 hover:bg-slate-50"
          >
          <span className="text-emerald-600">📰</span>
          가로수 최신 뉴스 보기
          <span className="text-slate-400 text-xs">(네이버 뉴스)</span>
        </a>
        {error && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-slate-500">
              {error === "API 미설정"
                ? "API 키 설정 후 개발 서버를 재시작하세요."
                : error === "로드 실패" && isStaticHost() && !getApiBase()
                  ? "API가 설정되지 않았습니다. 네이버 뉴스에서 확인할 수 있습니다."
                  : "연결에 실패했습니다. 다시 시도해 보세요."}
            </p>
            {(!isStaticHost() || getApiBase()) && (
              <button
                type="button"
                onClick={() => setRetry((r) => r + 1)}
                className="text-xs text-emerald-600 hover:underline font-medium"
              >
                다시 시도
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border-t border-slate-100 pt-0">
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i}>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl border-2 border-emerald-200 bg-white px-4 py-3 shadow-sm
                transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(5,46,22,0.2)] hover:border-emerald-300"
            >
              <p className="text-sm font-bold text-slate-800 line-clamp-2 group-hover:text-slate-900 leading-snug transition-colors duration-300">
                {stripHtml(item.title)}
              </p>
              <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed group-hover:text-slate-600 transition-colors duration-300">
                {stripHtml(item.description)}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                <svg className="w-3.5 h-3.5 shrink-0 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDate(item.pubDate)}
              </p>
            </a>
          </li>
        ))}
      </ul>
      <a
        href={NAVER_NEWS_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="group mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm
          transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(5,46,22,0.15)] hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-700"
      >
        가로수 뉴스 더보기
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  )
}
