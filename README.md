# 전국 가로수 현황 지도

시도별 가로수 개수 보여주는 지도 웹앱이에요.

## 실행

```bash
npm install
npm run dev
```

## 데이터

- **실제 데이터**: `public/data/city-tree-summary.json` (앱이 fetch)
- **생성**: `npm run aggregate:city-tree` — `public/data/csv/sido/*.csv` 또는 원본 CSV에서 집계
- **시도별 분할**: `npm run split:sido -- "경로/원본.csv"` — 100MB+ CSV를 시도별로 나눠 Git 커밋 가능하게
- **폴백**: JSON 없으면 `src/data/mock.ts` 목업 사용

## SEO (검색 노출)

- `index.html`: title, meta description, keywords, Open Graph
- `public/robots.txt`: 크롤러 허용
- `public/sitemap.xml`: 배포 후 실제 도메인으로 `<loc>` URL 수정 권장

## Cloudflare Pages 배포 (Private 저장소 지원)

**Private 저장소** 그대로 두고 배포할 수 있어요.

### 1. Cloudflare Dashboard 설정

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**
2. **Create** → **Pages** → **Connect to Git**
3. GitHub 인증 후 **national-treemap** 저장소 선택
4. **Begin setup** 후 빌드 설정:

| 항목 | 값 |
|------|-----|
| Project name | `national-treemap` (또는 원하는 이름) |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (비워두거나 `/`) |

### 2. 환경 변수 (Build time)

**Settings** → **Environment variables** → **Add variable**:

| 이름 | 값 | 적용 |
|------|-----|------|
| `VITE_CF_API_URL` | `https://national-treemap-api.내계정.workers.dev` | Production |
| `NODE_VERSION` | `20` | (선택) Node 18 기본값 |

Worker URL은 `npm run deploy:worker` 후 wrangler가 알려주는 주소를 넣으세요.

### 3. 배포

**방법 A – Git push (권장)**  
- **Save** 후 자동 빌드 시작  
- 이후 `main` 브랜치에 push할 때마다 자동 배포  
- 배포된 URL: `https://national-treemap.내계정.pages.dev`

**방법 B – 로컬에서 빌드물만 올리기**  
```bash
npm run build
npx wrangler login   # 브라우저에서 Cloudflare 로그인
npx wrangler pages deploy dist --project-name=national-treemap
```

### 4. GitHub Actions 비활성화 (선택)

Cloudflare Pages로 완전 전환했다면 GitHub 저장소 **Settings** → **Actions** → **General**에서 워크플로를 비활성화하거나, `.github/workflows/deploy.yml`을 삭제/수정할 수 있어요.

---

## GitHub Pages 배포 (대안, Public 저장소 필요)

**구조:** `national-treemap` (🔒 Private, 소스) → `national-treemap-pages` 또는 `jisu-hyun.github.io` (🌍 Public, 빌드물만)

### 1. 저장소 준비

- **national-treemap**: Private 저장소 (소스 코드)
- **Pages 저장소** (둘 중 하나):
  - `national-treemap-pages` → `https://내계정.github.io/national-treemap-pages/`
  - `jisu-hyun.github.io` → `https://jisu-hyun.github.io/` (루트 도메인)

### 2. Pages 저장소 설정

1. Public 저장소 생성 (`national-treemap-pages` 또는 `jisu-hyun.github.io`)
2. **Settings → Pages**: Source를 **Deploy from a branch**로, Branch를 **gh-pages**로 설정 (최초 push 후 생성됨)

### 3. Private 저장소에 설정

**Settings → Secrets and variables → Actions**에서:

| 종류 | 이름 | 값 |
|------|------|-----|
| Secret | `PAGES_DEPLOY_TOKEN` | repo 권한 있는 Personal Access Token |
| Secret | `CF_API_URL` | Cloudflare Worker URL (선택) |
| Variable | `PAGES_REPO` | `내계정/national-treemap-pages` 또는 `내계정/jisu-hyun.github.io` |
| Variable | `PAGES_BASE_PATH` | `/national-treemap-pages/` 또는 `/` |

### 4. 토큰(PAGES_DEPLOY_TOKEN) 발급

1. GitHub → **Settings → Developer settings → Personal access tokens**
2. **Tokens (classic)** → **Generate new token**
3. `repo` 체크
4. 생성한 토큰을 `PAGES_DEPLOY_TOKEN` Secret에 저장

### 5. 배포

`national-treemap`의 main 브랜치에 push하면 자동으로 Pages 저장소의 gh-pages에 배포됨.

## 뉴스·서울 가로수 API (Cloudflare Worker)

GitHub Pages에서는 API가 없어서 뉴스와 서울 가로수 실시간 조회가 안 됩니다. Cloudflare Worker로 API를 배포하면 됩니다.

1. [Cloudflare](https://dash.cloudflare.com) 로그인 후 Workers & Pages에서 새 Worker 생성
2. 로컬에서 Worker 배포:
   ```bash
   npm install
   npx wrangler login
   npm run deploy:worker
   ```
3. 배포된 URL 확인 (예: `https://national-treemap-api.내계정.workers.dev`)
4. Worker Secrets 설정 (네이버 API 키):
   ```bash
   npx wrangler secret put NAVER_CLIENT_ID
   npx wrangler secret put NAVER_CLIENT_SECRET
   ```
5. GitHub 저장소 **Settings → Secrets and variables → Actions** 에 `CF_API_URL` 추가 (값: Worker URL, 예: `https://national-treemap-api.xxx.workers.dev`)
6. main 브랜치 푸시 시 빌드에 반영됨
