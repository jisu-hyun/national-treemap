# 전국 가로수 현황 지도

시도별 가로수 개수 보여주는 지도 웹앱이에요.

## 실행

```bash
npm install
npm run dev
```

`public/data/csv/` 에 CSV 넣어두면 그걸로 쓰고, 없으면 목업 데이터로 돌아갑니다.

## GitHub Pages 배포

1. GitHub에서 새 저장소 생성 (예: `national-treemap`)
2. 로컬에서 푸시:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/내계정/national-treemap.git
   git push -u origin main
   ```
3. 저장소 **Settings → Pages → Build and deployment** 에서 Source를 **GitHub Actions** 로 선택
4. 푸시할 때마다 자동으로 빌드·배포됨. 주소: `https://내계정.github.io/national-treemap/`

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
