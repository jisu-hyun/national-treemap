# 부산 UGIS 가로수 (구별 분리)

도시공간정보시스템 CSV에서 생성한 구간별 마커 데이터입니다.  
**구 전용 CSV가 있는 5개 구(진구·사하·중구·동래·영도)는 제외**하고, 나머지 11개 구만 구별 파일로 나눠 배포 용량을 분산했습니다.

## 파일 목록

| 파일 | 구 |
|------|-----|
| gangseo.json | 강서구 |
| gijang.json | 기장군 |
| haeundae.json | 해운대구 |
| buk.json | 북구 |
| geumjeong.json | 금정구 |
| sasang.json | 사상구 |
| nam.json | 남구 |
| yeonje.json | 연제구 |
| suyeong.json | 수영구 |
| dong.json | 동구 |
| seo.json | 서구 |

## 재생성

```bash
# 전체 11개 구
npm run parse:busan-ugis

# 특정 구만 (캐시·fallback 사용으로 빠름)
node scripts/parse-busan-ugis.mjs "" 동구
```

- 지오코딩 실패 구간은 구별 대략 중심 좌표로 표시되어 구간이 누락되지 않습니다.
- 원본: `public/data/csv/부산광역시_도시공간정보시스템_도로관리(가로수)_20250724.csv`
