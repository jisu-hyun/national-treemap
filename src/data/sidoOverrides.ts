/**
 * 시도별 상세(구축) 데이터 치환용 ID.
 * 전국 총합·시도별 표시값 계산 시 이 id들이면 CSV 대신 구축 데이터 합계 사용.
 */

export const SIDO_ID_SEOUL = "11"
export const SIDO_ID_BUSAN = "26"
export const SIDO_ID_JEONBUK = "45"

/** 상세 데이터로 치환하는 시도 id 목록 */
export const SIDO_IDS_WITH_DETAIL = [SIDO_ID_SEOUL, SIDO_ID_BUSAN, SIDO_ID_JEONBUK] as const

export function isSidoWithDetail(id: string): id is (typeof SIDO_IDS_WITH_DETAIL)[number] {
  return SIDO_IDS_WITH_DETAIL.includes(id as (typeof SIDO_IDS_WITH_DETAIL)[number])
}
