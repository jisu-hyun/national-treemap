import { useState, useEffect } from "react"
import { getApiBase } from "../config"

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

export function NewsDashboard() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  const fetchNews = () => {
    const apiUrl = getNewsApiUrl()
    if (typeof window !== "undefined" && window.location.hostname.endsWith(".github.io") && !getApiBase()) {
      setLoading(false)
      setError(null)
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    fetch(`${apiUrl}?query=가로수&display=10&sort=date`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 503 ? "API 미설정" : "로드 실패")
        return res.json()
      })
      .then((data: NaverNewsResponse) => {
        if (data.error) throw new Error(data.error)
        setItems(data.items ?? [])
      })
      .catch((e) => {
        setError(e.message ?? "뉴스를 불러올 수 없어요.")
        setItems([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchNews()
  }, [retry])

  const refreshButton = (
    <button
      type="button"
      onClick={() => setRetry((r) => r + 1)}
      disabled={loading}
      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 transition-colors"
      title="새로고침"
      aria-label="뉴스 새로고침"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
  )

  const sectionHeader = (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-base font-semibold text-slate-800">가로수 뉴스</h3>
      {refreshButton}
    </div>
  )

  if (loading) {
    return (
      <div className="border-t border-slate-100 pt-0">
        {sectionHeader}
        <p className="text-xs text-slate-500">뉴스 불러오는 중…</p>
      </div>
    )
  }

  if (error || items.length === 0) {
    return (
      <div className="border-t border-slate-100 pt-0">
        {sectionHeader}
        <a
          href={NAVER_NEWS_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:border-emerald-200 hover:bg-slate-50 transition-colors"
        >
          <span className="text-emerald-600">📰</span>
          가로수 최신 뉴스 보기
          <span className="text-slate-400 text-xs">(네이버 뉴스)</span>
        </a>
        {error && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-slate-500">
              {error === "API 미설정"
                ? ".env에 네이버 API 키를 넣었다면 개발 서버(npm run dev)를 재시작한 뒤 아래 버튼을 눌러 보세요."
                : error === "로드 실패" &&
                  window.location.hostname.endsWith(".github.io") &&
                  !getApiBase()
                  ? "Cloudflare Worker 배포 후 VITE_CF_API_URL을 설정하고 다시 빌드하세요. 아래 버튼에서 네이버 뉴스로 이동할 수 있어요."
                  : "연결에 실패했어요. 아래에서 다시 시도해 보세요."}
            </p>
            {(!window.location.hostname.endsWith(".github.io") || getApiBase()) && (
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
      {sectionHeader}
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i}>
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all duration-200"
            >
              <p className="text-[13px] font-semibold text-slate-800 line-clamp-2 group-hover:text-slate-900">
                {stripHtml(item.title)}
              </p>
              <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
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
        className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-700 transition-colors"
      >
        가로수 뉴스 더보기
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    </div>
  )
}
