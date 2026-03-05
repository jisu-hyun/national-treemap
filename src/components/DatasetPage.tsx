/**
 * 활용 데이터 페이지: 전국 가로수 현황지도에 사용한 데이터 출처와 구축 방법 안내
 * 모든 데이터는 공공데이터포털(data.go.kr)에서 제공하는 자료를 활용했습니다.
 */

const DATA_GO_KR = "https://www.data.go.kr"

/** 공공데이터포털 활용 데이터 목록 (제공받은 링크 기준) */
const DATA_SOURCES = [
  { name: "산림청_도시숲가로수관리 가로수 현황", url: `${DATA_GO_KR}/data/15120900/fileData.do` },
  { name: "부산광역시_부산진구_가로수현황", url: `${DATA_GO_KR}/data/15037889/fileData.do` },
  { name: "부산광역시_사하구_가로수현황", url: `${DATA_GO_KR}/data/3079307/fileData.do` },
  { name: "부산광역시_중구_가로수 현황", url: `${DATA_GO_KR}/data/15026347/fileData.do` },
  { name: "부산광역시_동래구_가로수현황", url: `${DATA_GO_KR}/data/3079676/fileData.do` },
  { name: "부산광역시 영도구_가로수", url: `${DATA_GO_KR}/data/15064294/fileData.do` },
  { name: "전북특별자치도 전주시_가로수", url: `${DATA_GO_KR}/data/15080618/fileData.do` },
  { name: "전북특별자치도 정읍시_가로수 노선별 현황", url: `${DATA_GO_KR}/data/15055342/fileData.do` },
  { name: "전북특별자치도 완주군_가로수현황", url: `${DATA_GO_KR}/data/15065129/fileData.do` },
  { name: "경기도 광주시_가로수(공간정보)", url: `${DATA_GO_KR}/data/15120830/fileData.do` },
] as const

const IconExternal = () => (
  <svg className="w-4 h-4 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
)

interface DatasetPageProps {
  onGoToMap?: () => void
}

const SECTIONS = [
  { id: "base", title: "전국 기준", summary: "산림청 도시숲 가로수 현황, 시도별 집계해 지도 색상·통계에 반영" },
  { id: "seoul", title: "서울", summary: "서울시 트리맵 데이터로 전국 집계의 서울 값을 대체" },
  { id: "busan", title: "부산", summary: "진구·사하·중구·동래·영도 구별 데이터 파싱 후 지도 마커 표시, 전국 합계에 반영" },
  { id: "jeonbuk", title: "전북 (전주·정읍·완주)", summary: "3개 시군 CSV 파싱 후 마커 표시, 전국 합계에 반영" },
  { id: "gyeonggi", title: "경기 광주시", summary: "Shapefile 공간정보 확보, 지도 반영은 추후 예정" },
] as const

export function DatasetPage({ onGoToMap }: DatasetPageProps) {
  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-gradient-to-b from-slate-50/80 to-slate-100/50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-800 to-slate-900 px-6 sm:px-8 pt-20 sm:pt-24 pb-10 sm:pb-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_0%,rgba(16,185,129,0.12),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-500/30 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-6 sm:px-8">
          <p className="text-emerald-400/90 text-xs font-medium tracking-wider uppercase mb-3">
            데이터 출처
          </p>
          <h1 className="text-2xl sm:text-[1.75rem] font-bold text-white tracking-tight mb-3">
            활용 데이터
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl leading-relaxed">
            모든 데이터는 <strong className="text-slate-200 font-medium">공공데이터포털(data.go.kr)</strong>에서 가져왔습니다.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8 sm:py-10">
        {/* 활용 데이터 목록 카드 */}
        <section className="mb-10 rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-700 tracking-tight">
              활용 데이터 목록
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              공공데이터포털 제공 자료
            </p>
          </div>
          <ul className="divide-y divide-slate-100">
            {DATA_SOURCES.map((item) => (
              <li key={item.url}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 text-sm text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-800 transition-colors group"
                >
                  <span className="truncate font-medium">{item.name}</span>
                  <span className="text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" aria-label="바로가기">
                    <IconExternal />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* 구축 요약 카드 그리드 */}
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-10">
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              className="rounded-xl bg-white/90 backdrop-blur-sm border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden hover:border-slate-300/60 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200"
            >
              <div className="px-4 sm:px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
                  {section.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {section.summary}
                </p>
              </div>
            </section>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-slate-400 text-xs">
            지도는 참고용이며, 정확한 수치는 공개 자료를 확인하세요.
          </p>
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
      </div>
    </main>
  )
}
