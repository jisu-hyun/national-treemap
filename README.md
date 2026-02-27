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
# national-treemap
