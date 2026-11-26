#!/bin/bash
# WNS 财经台排版台 · 一键启动
# 双击运行：自动寻找空闲端口 → 启动本地服务 → 打开浏览器
# 关闭此终端窗口即停止服务

cd "$(dirname "$0")"

# 定位 node（依次尝试常见路径）
NODE_BIN=""
for cand in "/opt/homebrew/bin/node" "/usr/local/bin/node" "$(command -v node 2>/dev/null)"; do
  if [ -x "$cand" ]; then NODE_BIN="$cand"; break; fi
done
if [ -z "$NODE_BIN" ]; then
  echo "错误：未找到 node，请先安装 Node.js (https://nodejs.org)"
  read -n 1 -s -r -p "按任意键退出..."
  exit 1
fi

# 从 7200 起找空闲端口
PORT=7200
while lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

echo "=============================================="
echo "  WNS 财经台 · 晨间播报排版台"
echo "  地址: http://localhost:$PORT/"
echo "  （关闭本窗口即停止服务）"
echo "=============================================="
echo ""

"$NODE_BIN" scripts/dev-server.mjs --port "$PORT" &
SERVER_PID=$!
sleep 1

# 等服务就绪再开浏览器
for i in 1 2 3 4 5; do
  if curl -s -o /dev/null "http://localhost:$PORT/"; then break; fi
  sleep 0.5
done
open "http://localhost:$PORT/"

# 窗口关闭时随之停止服务
trap "kill $SERVER_PID 2>/dev/null" EXIT
wait $SERVER_PID
