#!/bin/bash
# 停止福井觀光智能助手服務

set -e

echo "🛑 停止福井觀光智能助手服務..."

# 讀取 PID 檔案並停止服務
if [ -f "backend.pid" ]; then
    BACKEND_PID=$(cat backend.pid)
    if kill $BACKEND_PID 2>/dev/null; then
        echo "✅ 後端服務 (PID: $BACKEND_PID) 已停止"
    else
        echo "⚠️ 後端服務可能已經停止"
    fi
    rm -f backend.pid
fi

if [ -f "frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if kill $FRONTEND_PID 2>/dev/null; then
        echo "✅ 前端服務 (PID: $FRONTEND_PID) 已停止"
    else
        echo "⚠️ 前端服務可能已經停止"
    fi
    rm -f frontend.pid
fi

# 清理 nohup 輸出檔案
rm -f nohup.out
rm -f backend/backend.log
rm -f frontend/frontend.log

echo "🎉 所有服務已停止"
