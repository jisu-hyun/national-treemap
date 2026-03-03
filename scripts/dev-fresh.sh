#!/bin/sh
# 개발 서버 완전 재시작 (8000 포트 프로세스 종료 후 npm run dev)
cd "$(dirname "$0")/.."
echo "8000 포트 사용 중인 프로세스 확인..."
for PID in $(lsof -ti :8000 2>/dev/null); do
  echo "종료: PID $PID"
  kill -9 $PID 2>/dev/null
done
[ -n "$(lsof -ti :8000 2>/dev/null)" ] && sleep 2
echo "개발 서버 시작..."
exec npm run dev
