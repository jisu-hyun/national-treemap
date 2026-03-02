# 가로수 CSV 데이터

## 시도별 분할 (Git 커밋 권장)

원본 CSV(100MB+)는 GitHub 제한으로 올릴 수 없습니다. **시도별로 분할**하면 각 파일이 작아져 커밋 가능합니다.

### 1단계: 시도별 분할

```bash
node scripts/split-by-sido.mjs "public/data/csv/<원본CSV파일>"
# 또는: npm run split:sido -- "경로/원본파일.csv"
```

- 입력: 산림청 도시숲 가로수 현황 원본 CSV (EUC-KR, 파일명 예: 도시숲가로수관리 가로수 현황YYYYMMDD.csv)
- 출력: `sido/서울특별시.csv`, `sido/경기도.csv` 등 17개 파일
- 각 파일: 수 MB 이하 (GitHub 100MB 제한 이내)

### 2단계: 집계 JSON 생성

```bash
node scripts/aggregate-city-tree.mjs
```

- 입력: `sido/*.csv` (또는 원본 단일 CSV)
- 출력: `public/data/city-tree-summary.json`
- 앱은 이 JSON만 fetch해서 사용

### 참고

- `도시숲가로수관리*.csv`(원본)는 `.gitignore`에 있음
- `sido/*.csv`는 커밋 가능 (각각 작은 용량)
