/**
 * 활용 데이터 페이지: 전국 가로수 현황 지도에 사용한 데이터 출처와 구축 방법 안내
 * 모든 데이터는 공공데이터포털(data.go.kr)에서 제공하는 자료를 활용했습니다.
 */

import { useRef, useState, useEffect } from "react"

/** 공공데이터포털 활용 데이터 목록 (제공 링크 기준) */
const DATA_SOURCES = [
  { name: "산림청_도시숲가로수관리 가로수 현황", url: "https://www.data.go.kr/data/15120900/fileData.do?recommendDataYn=Y" },
  { name: "부산광역시_부산진구_가로수현황", url: "https://www.data.go.kr/data/15037889/fileData.do" },
  { name: "부산광역시_사하구_가로수현황", url: "https://www.data.go.kr/data/3079307/fileData.do" },
  { name: "부산광역시_중구_가로수 현황", url: "https://www.data.go.kr/data/15026347/fileData.do" },
  { name: "부산광역시_동래구_가로수현황", url: "https://www.data.go.kr/data/3079676/fileData.do" },
  { name: "부산광역시 영도구_가로수", url: "https://www.data.go.kr/data/15064294/fileData.do" },
  { name: "전북특별자치도 전주시_가로수", url: "https://www.data.go.kr/data/15080618/fileData.do" },
  { name: "전북특별자치도 정읍시_가로수 노선별 현황", url: "https://www.data.go.kr/data/15055342/fileData.do" },
  { name: "전북특별자치도 완주군_가로수현황", url: "https://www.data.go.kr/data/15065129/fileData.do" },
  { name: "경기도 광주시_가로수(공간정보)", url: "https://www.data.go.kr/data/15120830/fileData.do" },
  { name: "경기도 용인시_가로수", url: "https://www.data.go.kr/data/15014206/fileData.do" },
  { name: "경기도 광명시 가로수 현황", url: "https://www.data.go.kr/data/15025510/fileData.do" },
  { name: "경기도 안양시_공간정보시스템_가로수 현황", url: "https://www.data.go.kr/data/15042420/fileData.do" },
  { name: "경기도 양평군_관내 가로수 데이터", url: "https://www.data.go.kr/data/15097915/fileData.do" },
  { name: "경기도 의정부시_가로수정보", url: "https://www.data.go.kr/data/15095497/fileData.do" },
  { name: "경기도 고양시_가로수 현황", url: "https://www.data.go.kr/data/15109151/fileData.do" },
  { name: "경기도 안산시_노선별 가로수 현황", url: "https://www.data.go.kr/data/15124349/fileData.do" },
  { name: "경기도 의왕시_가로수 현황(보행안전지수)", url: "https://www.data.go.kr/data/15108918/fileData.do" },
  { name: "경기도 과천시_공간정보(도로부속물)", url: "https://www.data.go.kr/data/15129912/fileData.do" },
] as const

const IconExternal = () => (
  <svg className="w-4 h-4 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
)

/** 맨 아래 제작자 표시 */
const CREATOR_NAME = "현지구"

interface DatasetPageProps {
  onGoToMap?: () => void
  creatorName?: string
}

/** 구축 요약: 지도에서 어떻게 쓰이는지 구역별 설명 */
const SECTIONS = [
  { id: "base", title: "전국 기준", summary: "산림청 도시숲 가로수 현황으로 시도별 집계, 지도 색상·전국 통계에 반영" },
  { id: "seoul", title: "서울", summary: "서울시 트리맵 데이터로 전국 집계의 서울 값을 대체" },
  { id: "busan", title: "부산 (진구·사하·중구·동래·영도)", summary: "구별 CSV/지오코딩으로 마커 표시, 전국 합계에 반영" },
  { id: "jeonbuk", title: "전북 (전주·정읍·완주)", summary: "시군별 CSV 파싱 후 마커 표시, 전국 합계에 반영" },
  { id: "gyeonggi", title: "경기 (광주·용인·광명·안양·양평·의정부·고양·안산·의왕·과천)", summary: "CSV·Shapefile 파싱 및 좌표 변환 후 마커 표시, 경기 합계에 반영" },
] as const

export function DatasetPage({ onGoToMap, creatorName }: DatasetPageProps) {
  const summaryRef = useRef<HTMLElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const [summaryVisible, setSummaryVisible] = useState(false)
  const [scrollAtTop, setScrollAtTop] = useState(true)
  const [scrollAtBottom, setScrollAtBottom] = useState(false)

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const check = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const threshold = 8
      setScrollAtTop(scrollTop <= threshold)
      setScrollAtBottom(scrollTop + clientHeight >= scrollHeight - threshold)
    }
    check()
    el.addEventListener("scroll", check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", check)
      ro.disconnect()
    }
  }, [])

  useEffect(() => {
    const el = summaryRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => setSummaryVisible(e.isIntersecting))
      },
      { rootMargin: "0px 0px -40px 0px", threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto bg-white relative">
      {/* Hero - 가로수 알아보기와 동일한 패딩·너비 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-4 sm:px-6 lg:px-8 pt-28 sm:pt-40 pb-14 sm:pb-20 min-h-[25rem] sm:min-h-[30rem] flex flex-col">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-10 right-20 w-48 h-48 rounded-full bg-emerald-300/20 blur-3xl" />
        </div>
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 flex flex-col justify-center">
          <p className="text-emerald-400/90 text-xs font-medium tracking-wider uppercase mb-3">
            데이터 출처
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            활용 데이터
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            모든 데이터는{" "}
            <a
              href="https://www.data.go.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-200 font-medium underline underline-offset-2 hover:text-emerald-300 transition-colors"
            >
              공공데이터포털(data.go.kr)
            </a>
            에서 제공하는 자료를 활용했습니다.
          </p>
        </div>
      </section>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-12 pb-16 relative">
        {/* 지도 구축 요약 — 먼저 표시 */}
        <section ref={summaryRef} className="mt-16 mb-28">
          <div className="mb-8">
            <div className="inline-block">
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mb-3">
                지도 구축 요약
              </h2>
              <div className="w-full h-0.5 bg-emerald-500/80 rounded-full" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            {SECTIONS.map((section) => (
              <article
                key={section.id}
                className={`dataset-summary-card group w-full text-center p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300/80 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-400 ease-out flex flex-col items-center justify-center ${summaryVisible ? "is-visible" : ""}`}
              >
                <div className="flex flex-col items-center gap-0 w-full">
                  <h3 className="font-semibold text-slate-800 text-xl sm:text-[1.25rem] tracking-tight mb-3 group-hover:text-slate-900 transition-colors duration-400">
                    {section.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                    {section.summary}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 지도로 이동 버튼 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 mb-28">
          {onGoToMap && (
            <button
              type="button"
              onClick={onGoToMap}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 active:scale-[0.98] transition-all duration-200 shadow-sm"
            >
              지도로 이동
            </button>
          )}
        </div>

        {/* 활용 데이터 목록 — 위와 동일한 제목·설명 스타일 */}
        <section className="mb-28">
          <div className="mb-8">
            <div className="inline-block">
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mb-3">
                활용 데이터 목록
              </h2>
              <div className="w-full h-0.5 bg-emerald-500/80 rounded-full" />
            </div>
            <p className="text-slate-500 text-sm mt-3">
              공공데이터포털 제공 자료 · 클릭 시 원본 페이지로 이동
            </p>
          </div>
          <div className="rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <ul className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
            {DATA_SOURCES.map((item) => (
              <li key={item.url}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3.5 text-sm text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-800 transition-colors group"
                >
                  <span className="truncate font-medium">{item.name}</span>
                  <span className="text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" aria-label="바로가기">
                    <IconExternal />
                  </span>
                </a>
              </li>
            ))}
          </ul>
          </div>
        </section>

        <footer className="mt-32 pt-12 pb-8 border-t border-slate-200/80">
          {/* 구글 광고 영역 — 회색 선과 본문 사이 */}
          <div
            id="footer-ad-slot"
            className="min-h-[90px] w-full mb-6 flex items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200/80"
            aria-label="광고"
          >
            {/* 구글 애드센스 등 스크립트 삽입 시 이 영역에 배치 */}
          </div>
          <div className="space-y-8">
            {/* 서비스명 + 한줄 소개 */}
            <div>
              <p className="text-sm font-medium text-slate-700">
                전국 가로수 현황 지도
              </p>
              <p className="text-xs text-slate-500 mt-1 whitespace-nowrap">
                공공데이터를 활용한 참고용 서비스입니다. 지도와 수치는 공개 자료 기준이며, 정확한 내용은 각 제공 기관을 확인해 주세요.
              </p>
            </div>
            {/* 관련 링크 */}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">바로가기</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                {onGoToMap && (
                  <>
                    <button
                      type="button"
                      onClick={onGoToMap}
                      className="hover:text-emerald-600 transition-colors underline underline-offset-2"
                    >
                      지도로 이동
                    </button>
                    <span className="text-slate-300 select-none" aria-hidden>·</span>
                  </>
                )}
                <a
                  href="https://www.data.go.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-600 transition-colors underline underline-offset-2"
                >
                  공공데이터포털
                </a>
                <span className="text-slate-300 select-none" aria-hidden>·</span>
                <a
                  href="https://map.seoul.go.kr/smgis2/extMap/sttree"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-600 transition-colors underline underline-offset-2"
                >
                  서울시 가로수 트리맵
                </a>
              </div>
            </div>
            {/* 안내 문구 */}
            <p className="text-[11px] text-slate-400">
              본 서비스는 참고용이며, 공식 통계·행정 자료와 다를 수 있습니다. 데이터 이용 시 공공데이터포털 및 각 제공 기관 안내를 확인해 주세요.
            </p>
            {/* 제작 크레딧 (오른쪽 끝) */}
            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-xs text-slate-500 pt-2">
              <span className="shrink-0">
                제작 <span className="text-slate-300 select-none" aria-hidden>|</span> {creatorName ?? CREATOR_NAME}
              </span>
            </div>
          </div>
        </footer>
      </div>
      {/* 위로 가기 / 아래로 가기 — 각각 고정 위치, 맨 위/맨 아래일 때만 숨김 */}
      <button
        type="button"
        onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="맨 위로"
        className={`scroll-fab fixed right-6 z-40 w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/70 shadow-lg shadow-slate-200/50 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300/60 hover:text-emerald-700 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 transition-opacity duration-200 ${scrollAtTop ? "pointer-events-none opacity-0" : "bottom-[4.75rem]"}`}
      >
        <svg className="w-5 h-5 scroll-fab-up" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
      </button>
      <button
        type="button"
        onClick={() => mainRef.current?.scrollTo({ top: (mainRef.current?.scrollHeight ?? 0) - (mainRef.current?.clientHeight ?? 0), behavior: "smooth" })}
        aria-label="맨 아래로"
        className={`scroll-fab fixed bottom-6 right-6 z-40 w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/70 shadow-lg shadow-slate-200/50 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300/60 hover:text-emerald-700 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 focus-visible:ring-offset-2 transition-opacity duration-200 ${scrollAtBottom ? "pointer-events-none opacity-0" : ""}`}
      >
        <svg className="w-5 h-5 scroll-fab-down" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
    </main>
  )
}
