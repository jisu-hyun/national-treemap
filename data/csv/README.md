# 가로수 CSV 데이터

## 한글이 깨질 때

원본이 EUC-KR이면 IDE에서 한글이 깨져 보입니다.

```bash
npm run convert:csv
```

원본을 UTF-8로 변환해 덮어쓰기.

## 데이터 구조

`DATA_STRUCTURE.md` 참고.

## 배포 흐름 (자동 반영)

1. **원본 CSV**를 `public/data/csv/`에 둠 (파일명에 `도시숲가로수관리` 포함)
2. **시도별 분할**: `npm run split:sido -- "public/data/csv/도시숲가로수관리 가로수 현황20241014.csv"`
3. **`data/csv/sido/*.csv`를 Git에 커밋**
4. **배포** 시 `npm run build`가 자동으로 `aggregate` → `city-tree-summary.json` 생성 → 앱에 반영

원본 CSV는 `.gitignore`로 커밋되지 않습니다. `data/csv/sido/`는 **public 밖**에 있어 Cloudflare 25MB 제한을 피하고, 배포물에는 `city-tree-summary.json`만 포함됩니다.

---

## 시도별 분할 (새 데이터 업데이트 시)

```bash
npm run split:sido -- "public/data/csv/<원본CSV파일>"
```

- 입력: 산림청 도시숲 가로수 현황 원본 CSV (UTF-8 또는 EUC-KR)
- 출력: `data/csv/sido/서울특별시.csv`, `data/csv/sido/경기도.csv` 등 (빌드용, 배포 제외)
- 각 파일: 25MB 이하 권장 (Cloudflare Pages 제한)
- `data/csv/sido/*.csv` 커밋 후 push → 빌드 시 aggregate → city-tree-summary.json만 배포

### 참고

- `도시숲가로수관리*.csv`(원본)는 `.gitignore`에 있음
- `data/csv/sido/*.csv`는 `public` 밖 → dist에 복사되지 않음 (25MB 제한 회피)
