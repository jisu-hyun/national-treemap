#!/bin/bash
# GitHub 푸시 한 번에 하기 (토큰은 터미널에만 입력, 채팅에 붙여넣지 마세요)
set -e
REPO="https://github.com/jisu-hyun/national-treemap.git"
echo "GitHub Personal Access Token을 입력하세요 (비밀번호처럼 입력되고 화면에 안 보입니다):"
read -rs TOKEN
echo ""
# 붙여넣기 시 줄바꿈/공백 제거
TOKEN=$(echo -n "$TOKEN" | tr -d '\n\r\t ')
if [ -z "$TOKEN" ]; then
  echo "토큰이 비어 있어요. 다시 실행해 주세요."
  exit 1
fi
echo "푸시 중..."
git remote set-url origin "https://${TOKEN}@github.com/jisu-hyun/national-treemap.git"
# Cursor/IDE askpass 쓰지 않고 URL 토큰만 쓰도록
unset GIT_ASKPASS
unset SSH_ASKPASS
GIT_TERMINAL_PROMPT=0 git push -u origin main
git remote set-url origin "$REPO"
echo "완료! 토큰은 원격 주소에서 제거해 두었어요."
