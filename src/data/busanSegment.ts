/** 구간별 수종별 그루 수 */
export interface SpeciesCount {
  name: string
  count: number
}

/** 부산진구 등 도로 구간 1행 = 대표 좌표 1점 (지도·왼쪽 패널 공용) */
export interface BusanSegment {
  name: string
  lat: number
  lng: number
  trees: number
  length: number
  gu: string
  /** 수종별 그루 수 (있는 경우) */
  species?: SpeciesCount[]
}
