# 가로수 CSV 데이터

## 배포 흐름 (자동 반영)

1. **원본 CSV**를 `public/data/csv/`에 둠 (파일명에 `도시숲가로수관리` 포함)
2. **시도별 분할**: `npm run split:sido -- "public/data/csv/도시숲가로수관리 가로수 현황20241014.csv"`
3. **`sido/*.csv`를 Git에 커밋**
4. **배포** 시 `npm run build`가 자동으로 `aggregate` → `city-tree-summary.json` 생성 → 앱에 반영

원본 CSV는 `.gitignore`로 커밋되지 않으며, `sido/*.csv`만 저장소에 올라가고 배포됩니다.

---

## 시도별 분할 (새 데이터 업데이트 시)

```bash
npm run split:sido -- "public/data/csv/<원본CSV파일>"
```

- 입력: 산림청 도시숲 가로수 현황 원본 CSV (UTF-8 또는 EUC-KR)
- 출력: `sido/서울특별시.csv`, `sido/경기도.csv` 등 (각 시도별 파일)
- 각 파일: 수 MB 이하 (GitHub 100MB 제한 이내)
- `sido/*.csv` 커밋 후 push하면 배포 시 자동 반영

### 참고

- `도시숲가로수관리*.csv`(원본)는 `.gitignore`에 있음
- `sido/*.csv`는 커밋 가능
