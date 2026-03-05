import { useState } from "react"
import { SIDO_CONTACTS } from "../data/sidoContacts"
import streetTreeImg from "../data/가로수 사진.jpg"

/* Premium line icons - clean stroke style */
const IconThermometer = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
  </svg>
)
const IconLeaf = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
  </svg>
)
const IconBird = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 7h.01" /><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" /><path d="m20 7 2 .5-2 .5" /><path d="M10 18v3" /><path d="M14 17.75V21" /><path d="M7 18a6 6 0 0 0 6-6c0-2 .5-4-2-6" />
  </svg>
)
const IconFlower = ({ className }: { className?: string }) => (
  <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" /><path d="M12 8a4 4 0 1 1-4 4" /><path d="M12 8v4" /><path d="m14.5 10 1-1" /><path d="m9.5 10-1-1" /><path d="m12 6 0-1" /><path d="m14 10 1 0" /><path d="m10 10-1 0" />
  </svg>
)
/* 시민 섹션 아이콘 - filled, 높은 가독성 */
const IconAlert = ({ className }: { className?: string }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.401 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
  </svg>
)
const IconShield = ({ className }: { className?: string }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M11.484 2.17a.75.75 0 011.032 0 11.209 11.209 0 007.877 3.08.75.75 0 01.722.515 12.74 12.74 0 010 9.06.75.75 0 01-.722.516 11.209 11.209 0 00-7.877 3.08.75.75 0 01-1.032 0 11.209 11.209 0 00-7.877-3.08.75.75 0 01-.722-.515 12.74 12.74 0 010-9.06.75.75 0 01.722-.516 11.209 11.209 0 007.877-3.08z" clipRule="evenodd" />
  </svg>
)
const IconPhone = ({ className }: { className?: string }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C2.664 22.5 0 19.836 0 16.5V4.5z" clipRule="evenodd" />
  </svg>
)
const IconSparkles = ({ className }: { className?: string }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395a1.5 1.5 0 00-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
  </svg>
)

const ROLES = [
  {
    Icon: IconThermometer,
    title: "도시 온도 완화",
    desc: "가로수는 도시를 시원하게 식혀줘요.",
    detail: "여름에 아스팔트 도로가 뜨거워지는 이유는 햇빛을 그대로 흡수하기 때문입니다.\n\n가로수는 잎과 가지로 햇빛을 가려 그늘을 만들고, 나무가 수분을 내보내는 과정에서 주변 공기를 조금 식혀 줍니다.\n\n그래서 나무가 많은 길은 그렇지 않은 곳보다 덜 뜨겁게 느껴질 수 있습니다.",
    summary: "가로수는 도시를 시원하게 식혀줘요.",
  },
  {
    Icon: IconLeaf,
    title: "대기 정화",
    desc: "가로수는 공기를 정화시켜줘요.",
    detail: "나무는 광합성을 통해 이산화탄소를 흡수하고 산소를 만들어 냅니다.\n\n또한 잎 표면에 일부 먼지와 오염 물질이 붙으면서 공기 질 개선에 도움을 줄 수 있습니다.\n\n물론 가로수만으로 모든 오염을 해결할 수는 없지만, 도시 환경을 더 건강하게 만드는 요소 중 하나입니다.",
    summary: "가로수는 공기를 정화시켜줘요.",
  },
  {
    Icon: IconBird,
    title: "생태 연결",
    desc: "가로수는 도시 속 녹색 길을 이어줘요.",
    detail: "도시에는 건물과 도로가 많아 생물들이 이동하기 쉽지 않습니다.\n\n가로수는 공원이나 하천 주변 녹지를 이어 주는 역할을 할 수 있습니다.\n\n이 덕분에 새나 곤충 같은 생물들이 이동하거나 머물 공간이 생깁니다.",
    summary: "가로수는 도시 속 녹색 길을 이어줘요.",
  },
  {
    Icon: IconFlower,
    title: "도시 경관 형성",
    desc: "가로수는 도시를 사계절 풍경으로 꾸며줘요.",
    detail: "봄에는 꽃이 피고, 여름에는 짙은 그늘을 만들고, 가을에는 단풍이 들고, 겨울에는 가지 모양이 드러납니다.\n\n이처럼 가로수는 계절에 따라 다른 풍경을 보여 주며, 거리의 분위기와 도시 이미지를 만드는 데 중요한 역할을 합니다.",
    summary: "가로수는 도시를 사계절 풍경으로 꾸며줘요.",
  },
] as const

/** 시도 목록: SIDO_CONTACTS 기준 (연락처 있는 지역) */
const SIDO_OPTIONS = Object.entries(SIDO_CONTACTS).map(([value, { name }]) => ({ value, label: name }))

const CITIZEN_ACTIONS = [
  {
    Icon: IconAlert,
    title: "이상 발견 시 신고",
    desc: "가로수가 심하게 기울어지거나 병해충 피해가 의심될 경우 신고해 주세요.",
    detail: "가로수가 심하게 기울어 있거나, 가지가 부러져 보행에 위험이 있는 경우, 또는 병해충 피해가 의심될 경우에는 관할 기관에 신고해 주시기 바랍니다.\n\n신속한 점검과 조치에 도움이 됩니다.",
    hasContactUI: false,
  },
  {
    Icon: IconShield,
    title: "가로수 훼손 금지",
    desc: "광고물 부착, 훼손 행위는 제한됩니다.",
    detail: "가로수에 광고물을 부착하거나 줄기 및 뿌리 주변을 훼손하는 행위는 제한됩니다.\n\n가로수는 지방자치단체가 관리하는 공공 자산으로 보호가 필요합니다.",
    hasContactUI: false,
  },
  {
    Icon: IconPhone,
    title: "관할 기관 문의",
    desc: "지역을 선택하면 대표 연락처를 확인할 수 있습니다.",
    detail: "가로수 관련 민원 및 신고는 해당 지역 지자체를 통해 접수할 수 있습니다.\n\n지역을 선택하면 관할 기관 대표 연락처를 확인할 수 있습니다.\n\n(예: 서울특별시 120 다산콜센터 등)",
    hasContactUI: true,
  },
  {
    Icon: IconSparkles,
    title: "주변 환경 유지",
    desc: "가로수 주변을 깨끗하게 유지하는 작은 실천이 도움이 됩니다.",
    detail: "가로수 주변 공간을 깨끗하게 유지하는 것은 나무의 생육 환경과 보행 안전에 긍정적인 영향을 줍니다.\n\n도시 녹지를 보호하는 작은 실천이 될 수 있습니다.",
    hasContactUI: false,
  },
] as const

const FAQ_ITEMS = [
  {
    q: "트리맵이란?",
    a: "트리맵은 가로수의 위치와 기본 정보를 지도 기반으로 시각화한 데이터 서비스입니다. 지역별 가로수 분포, 수종 구성 등 현황 정보를 한눈에 확인할 수 있도록 구성되었습니다.",
    highlight: "지도 기반으로 시각화한 데이터 서비스",
  },
  {
    q: "왜 은행나무가 많나요?",
    a: "은행나무는 도시 환경에 대한 적응력이 높고 병해충에 강한 수종으로 평가되어 과거에 많이 식재되었습니다. 또한 일정한 수형(나무 모양)을 유지하기 쉬워 가로 경관 관리에 유리하다는 점도 고려되었습니다. 최근에는 특정 수종 편중을 줄이고 생물다양성을 높이기 위해 다양한 수종을 함께 식재하는 방향으로 관리되고 있습니다.",
    highlight: "적응력이 높고 병해충에 강한 수종으로 평가되어 과거에 많이 식재되었습니다",
  },
  {
    q: "가로수는 누가 관리하나요?",
    a: "가로수는 각 지방자치단체(시·군·구)가 관리합니다. 식재, 전정(가지치기), 병해충 관리, 안전 점검 등은 해당 지자체의 녹지·공원 관련 부서에서 담당합니다. 관리 기준과 방식은 지역 조례 및 내부 지침에 따라 운영됩니다.",
    highlight: "각 지방자치단체(시·군·구)가 관리합니다",
  },
  {
    q: "나무를 임의로 심어도 되나요?",
    a: "도로변 가로수는 공공 시설물과 연결된 공공 자산에 해당합니다. 따라서 개인이 임의로 식재하거나 제거하는 것은 허용되지 않습니다. 식재 위치와 수종은 보행 안전, 도로 구조, 지하 시설물 등을 고려해 계획됩니다.",
    highlight: "식재 위치와 수종은 보행 안전, 도로 구조, 지하 시설물 등을 고려해 계획됩니다",
  },
  {
    q: "가로수 가지치기는 왜 하나요?",
    a: "가로수 전정은 보행 및 차량 안전 확보, 시설물 간섭 예방, 수목 건강 유지 등을 위해 실시합니다. 또한 강풍이나 폭설에 대비해 구조적 안정성을 확보하는 목적도 있습니다. 최근에는 과도한 가지 제거를 줄이고 수목 생리 특성을 고려한 관리 방식이 강조되고 있습니다.",
    highlight: "보행 및 차량 안전 확보, 시설물 간섭 예방, 수목 건강 유지 등을 위해 실시합니다",
  },
  {
    q: "이 데이터는 얼마나 정확한가요?",
    a: "본 지도는 각 지역에서 공개한 가로수 현황 자료를 기반으로 구성되었습니다. 공개 시점 이후의 식재·제거·변경 사항은 즉시 반영되지 않을 수 있습니다. 현장 상황과 일부 차이가 발생할 수 있습니다.",
    highlight: "공개한 가로수 현황 자료를 기반으로 구성되었습니다",
  },
  {
    q: "데이터는 얼마나 자주 업데이트되나요?",
    a: "업데이트 주기는 지역별 자료 공개 일정에 따라 달라집니다. 신규 자료가 확인되면 순차적으로 반영됩니다.",
    highlight: "지역별 자료 공개 일정에 따라 달라집니다",
  },
  {
    q: "왜 어떤 지역은 정보가 적나요?",
    a: "가로수 관리 방식과 공개 범위는 지역별로 차이가 있습니다. 일부 지역은 세부 항목이 제한적으로 제공될 수 있습니다.",
    highlight: "가로수 관리 방식과 공개 범위는 지역별로 차이가 있습니다",
  },
  {
    q: "개인 정보는 포함되어 있나요?",
    a: "본 서비스는 가로수 위치 및 관리 정보만을 다루며, 개인 식별 정보는 포함하지 않습니다.",
    highlight: "개인 식별 정보는 포함하지 않습니다",
  },
  {
    q: "가로수 뉴스는 어떤 기준으로 제공되나요?",
    a: "네이버 뉴스에 게재된 가로수 관련 기사를 검색·정리하여 제공합니다. 특정 기관의 입장을 대변하지 않으며, 정보 제공 목적입니다.",
    highlight: "네이버 뉴스에 게재된 가로수 관련 기사를 검색·정리하여 제공합니다",
  },
] as const


interface LearnPageProps {
  onGoToMapWithRegion?: (region: string) => void
}

export function LearnPage({ onGoToMapWithRegion }: LearnPageProps) {
  const [selectedRole, setSelectedRole] = useState<(typeof ROLES)[number] | null>(null)
  const [selectedCitizen, setSelectedCitizen] = useState<(typeof CITIZEN_ACTIONS)[number] | null>(null)
  const [citizenRegion, setCitizenRegion] = useState("11")

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-[#f8faf8]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 px-4 sm:px-6 pt-28 sm:pt-40 pb-14 sm:pb-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute bottom-10 right-20 w-48 h-48 rounded-full bg-emerald-300/20 blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-start gap-6 sm:gap-10">
            <div className="flex-shrink-0 w-80 sm:w-[26rem] aspect-[4/3] rounded-2xl overflow-hidden ring-2 ring-white/30 shadow-lg">
              <img src={streetTreeImg} alt="가로수" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col justify-between h-[15rem] sm:h-[19.5rem] min-w-0 flex-1 overflow-hidden">
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
                도시 속 가로수
              </h1>
              <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed max-w-2xl">
                가로수는 우리가 매일 걷는 길가에서 자연스럽게 마주하는 나무입니다.
                <br />
                도시를 더 쾌적하게 만들고, 우리의 일상 가까이에서 함께하는 소중한 녹지이기도 합니다.
                <br /><br />
                여름에는 그늘을 만들어 도시의 더위를 줄여주고, 공기를 정화하며, 계절마다 다양한 풍경을 만들어 도시의 거리를 더욱 아름답게 만듭니다. 또한 도심 속에서 자연을 느낄 수 있게 해주는 중요한 역할도 합니다.
                <br /><br />
                이 페이지에서는 가로수가 어떤 역할을 하는지, 어떻게 관리되는지, 그리고 우리가 알아두면 좋은 내용을 쉽게 정리했습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-12 pb-16 relative">
        {/* Section: 가로수의 기능 - 고급스러운 카드 구성 */}
        <section className="mt-16 mb-28">
          <div className="mb-12">
            <div className="inline-block">
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mb-3">
                가로수의 기능
              </h2>
              <div className="w-full h-0.5 bg-emerald-500/80 rounded-full mb-8" />
            </div>
            <div className="max-w-4xl space-y-2">
              <p className="text-slate-500 text-base leading-[1.7]">
                가로수는 단순한 조경 요소가 아니라, 도시 환경을 구성하는 중요한 녹지 인프라입니다.
              </p>
              <p className="text-slate-500 text-base leading-[1.7]">
                도시 온도 조절, 대기 질 개선, 생태 연결 등 환경적 기능을 수행하며, 지방자치단체의 계획과 기준에 따라 관리됩니다.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            {ROLES.map((r) => {
              const Icon = r.Icon
              return (
                <button
                  key={r.title}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className="group w-full text-left p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300/80 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-400 ease-out flex items-center"
                >
                  <div className="flex items-center gap-5 w-full">
                    <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-100/80 group-hover:bg-emerald-100/80 flex items-center justify-center transition-colors duration-400">
                      <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-slate-600 group-hover:text-emerald-600 transition-colors duration-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-800 text-xl sm:text-[1.25rem] tracking-tight mb-3 group-hover:text-slate-900 transition-colors duration-400">
                        {r.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">
                        {r.desc}
                        <span className="inline ml-1.5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all duration-400" aria-hidden>→</span>
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* 카드뉴스 팝업: 카드 영역 위에 오버레이 */}
          {selectedRole && (() => {
            const Icon = selectedRole.Icon
            return (
              <>
                <button
                  type="button"
                  aria-label="닫기"
                  className="fixed inset-0 bg-black/40 z-50 backdrop-blur-[2px]"
                  onClick={() => setSelectedRole(null)}
                />
                <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 sm:left-1/2 sm:right-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[min(800px,96vw)] z-[60] max-h-[90vh] overflow-hidden flex flex-col bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 border border-slate-200/80">
                  <div className="rounded-t-2xl border-b border-white/20 bg-gradient-to-br from-emerald-600 via-emerald-600 to-green-800 px-4 py-4 sm:px-5 sm:py-5 text-white shadow-[0_4px_20px_rgba(5,46,22,0.25)] shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold tracking-tight">{selectedRole.title}</h3>
                          <p className="text-emerald-100/90 text-sm mt-0.5">{selectedRole.summary}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedRole(null)}
                        className="p-2 rounded-xl hover:bg-white/20 text-white/90 transition-colors"
                        aria-label="닫기"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-white">
                    <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                      <div className="space-y-4 text-slate-600 leading-relaxed text-sm sm:text-base">
                        {selectedRole.detail.split("\n\n").map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )
          })()}
        </section>

        {/* Section: 시민이 할 수 있는 일 - 모던 벤토 스타일, 관할 기관만 클릭 */}
        <section className="mb-24">
          <div className="inline-block mb-8">
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mb-3">시민이 할 수 있는 일</h2>
            <div className="w-full h-0.5 bg-emerald-500/80 rounded-full" />
          </div>
          <div className="space-y-2 mb-8">
              <p className="text-slate-500 text-base leading-[1.7]">가로수는 각 지방자치단체에서 관리하는 공공 자산입니다.</p>
              <p className="text-slate-500 text-base leading-[1.7]">시민의 관심과 협조는 안전하고 건강한 도시 환경을 유지하는 데 도움이 됩니다.</p>
            </div>
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
            {/* 이상 발견 시 신고 - 정적 카드 */}
            <div className="group w-full p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-300/70 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-400 ease-out flex items-center">
              <div className="flex items-center gap-5 w-full">
                <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-amber-100/80 flex items-center justify-center">
                  <IconAlert className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-800 text-xl sm:text-[1.25rem] tracking-tight mb-2">이상 발견 시 신고</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">가로수가 심하게 기울어 있거나, 가지가 부러져 보행에 위험이 있는 경우, 또는 병해충 피해가 의심될 경우에는 관할 기관에 신고해 주시기 바랍니다.</p>
                </div>
              </div>
            </div>

            {/* 가로수 훼손 금지 - 정적 카드 */}
            <div className="group w-full p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-rose-300/70 hover:shadow-lg hover:shadow-rose-500/5 transition-all duration-400 ease-out flex items-center">
              <div className="flex items-center gap-5 w-full">
                <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-rose-100/80 flex items-center justify-center">
                  <IconShield className="w-7 h-7 sm:w-8 sm:h-8 text-rose-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-800 text-xl sm:text-[1.25rem] tracking-tight mb-2">가로수 훼손 금지</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">가로수에 광고물을 부착하거나 줄기 및 뿌리 주변을 훼손하는 행위는 제한됩니다. 가로수는 지방자치단체가 관리하는 공공 자산으로 보호가 필요합니다.</p>
                </div>
              </div>
            </div>

            {/* 주변 환경 유지 - 정적 카드 */}
            <div className="group w-full p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 hover:border-teal-300/70 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-400 ease-out flex items-center">
              <div className="flex items-center gap-5 w-full">
                <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-teal-100/80 flex items-center justify-center">
                  <IconSparkles className="w-7 h-7 sm:w-8 sm:h-8 text-teal-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-800 text-xl sm:text-[1.25rem] tracking-tight mb-2">주변 환경 유지</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">가로수 주변 공간을 깨끗하게 유지하는 것은 나무의 생육 환경과 보행 안전에 긍정적인 영향을 줍니다.</p>
                </div>
              </div>
            </div>

            {/* 관할 기관 문의 - 클릭 시 팝업, 포인트 카드 */}
            <button
              type="button"
              onClick={() => setSelectedCitizen(CITIZEN_ACTIONS.find((c) => c.hasContactUI)!)}
              className="group w-full text-left p-5 sm:p-6 rounded-2xl bg-white border-2 border-emerald-300/50 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-400 ease-out flex items-center"
            >
              <div className="flex items-center gap-5 w-full">
                <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-emerald-100/80 group-hover:bg-emerald-200/80 flex items-center justify-center transition-colors duration-400">
                  <IconPhone className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-800 text-xl sm:text-[1.25rem] tracking-tight mb-2 group-hover:text-slate-900 transition-colors duration-400">
                    관할 기관 문의
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mb-3">지역을 선택하면 관할 기관 대표 연락처를 확인할 수 있습니다.</p>
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-600 group-hover:gap-3 transition-all">
                    지역 선택 후 연락처 확인하기
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* 관할 기관 문의 팝업 */}
          {selectedCitizen?.hasContactUI && (() => {
            const Icon = selectedCitizen.Icon
            const contact = SIDO_CONTACTS[citizenRegion]
            return (
              <>
                <button
                  type="button"
                  aria-label="닫기"
                  className="fixed inset-0 bg-black/40 z-50 backdrop-blur-[2px]"
                  onClick={() => setSelectedCitizen(null)}
                />
                <div className="fixed left-4 right-4 top-1/2 -translate-y-1/2 sm:left-1/2 sm:right-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[min(420px,92vw)] z-[60] max-h-[85vh] overflow-hidden flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200/80">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">{selectedCitizen.title}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCitizen(null)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                      aria-label="닫기"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{selectedCitizen.detail.split("\n\n")[0]}</p>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">지역 선택</label>
                      <select
                        value={citizenRegion}
                        onChange={(e) => setCitizenRegion(e.target.value)}
                        className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none cursor-pointer"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 0.75rem center",
                          backgroundSize: "1.25rem",
                        }}
                      >
                        {SIDO_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {contact && (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80">
                        <p className="text-xs font-medium text-emerald-700 mb-1">{contact.name}</p>
                        <p className="text-xl font-bold text-emerald-800 tracking-tight">{contact.phone}</p>
                      </div>
                    )}
                    {onGoToMapWithRegion && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCitizen(null)
                          onGoToMapWithRegion(citizenRegion)
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        지도에서 해당 지역 보기
                      </button>
                    )}
                  </div>
                </div>
              </>
            )
          })()}
        </section>

        {/* Section: FAQ */}
        <section className="mb-24">
          <div className="mb-6">
            <div className="inline-block">
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 tracking-tight mb-3">자주 묻는 질문</h2>
              <div className="w-full h-0.5 bg-emerald-500/80 rounded-full mb-6" />
            </div>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {FAQ_ITEMS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-2xl bg-white border border-slate-200/80 overflow-hidden hover:border-emerald-300/80 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-400 ease-out [&[open]]:border-emerald-300/80 [&[open]]:shadow-lg [&[open]]:shadow-emerald-500/5"
              >
                <summary className="p-5 sm:p-6 cursor-pointer list-none flex items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-4 min-w-0">
                    <span className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-100/80 group-hover:bg-emerald-100/80 group-open:bg-emerald-100/80 flex items-center justify-center text-slate-600 group-hover:text-emerald-600 group-open:text-emerald-600 transition-colors duration-400">
                      <span className="text-sm sm:text-base font-bold">Q</span>
                    </span>
                    <span className="font-semibold text-slate-800 text-base sm:text-lg tracking-tight group-hover:text-slate-900 transition-colors duration-400">
                      {faq.q}
                    </span>
                  </span>
                  <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100/80 flex items-center justify-center text-slate-500 transition-all duration-400 group-hover:bg-emerald-100/80 group-hover:text-emerald-600 group-open:bg-emerald-100/80 group-open:text-emerald-600 group-open:rotate-180">
                    <svg className="w-5 h-5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
                  <div className="pl-14 sm:pl-16">
                    <p className="text-sm sm:text-base text-slate-500 leading-relaxed">
                      {faq.highlight && faq.a.includes(faq.highlight) ? (
                        <>
                          {faq.a.split(faq.highlight)[0]}
                          <mark className="bg-amber-200/80 text-slate-800 px-0.5 rounded-sm">{faq.highlight}</mark>
                          {faq.a.split(faq.highlight)[1]}
                        </>
                      ) : (
                        faq.a
                      )}
                    </p>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
