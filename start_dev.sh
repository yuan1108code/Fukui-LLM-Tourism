#!/bin/bash
# 福井觀光智能助手 - 開發環境啟動腳本

set -e

echo "🏯 福井觀光智能助手 - 開發環境啟動"
echo "=================================="

# 檢查 Python 環境
if ! command -v python3 &> /dev/null; then
    echo "❌ 錯誤：未找到 Python 3"
    exit 1
fi

# 檢查 Node.js 環境
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤：未找到 Node.js"
    exit 1
fi

echo "✅ 環境檢查通過"

# 建立並啟動後端服務
echo ""
echo "📡 設定後端服務..."
cd backend

# 安裝 Python 相依套件
if [ ! -d "venv" ]; then
    echo "建立 Python 虛擬環境..."
    python3 -m venv venv
fi

echo "啟動虛擬環境並安裝相依套件..."
source venv/bin/activate
pip install -r requirements.txt

# 檢查環境變數
if [ ! -f "../.env" ]; then
    echo "❌ 錯誤：未找到 .env 檔案，請確認 OpenAI API Key 設定"
    exit 1
fi

echo "啟動後端 API 服務 (Port 8000)..."
nohup python app.py > backend.log 2>&1 &
BACKEND_PID=$!
echo "後端服務 PID: $BACKEND_PID"

# 回到上層目錄
cd ..

# 設定並啟動前端服務
echo ""
echo "🎨 設定前端服務..."
cd frontend

# 安裝 Node.js 相依套件
if [ ! -d "node_modules" ]; then
    echo "安裝前端相依套件..."
    npm install
fi

echo "啟動前端開發伺服器 (Port 3000)..."
nohup npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端服務 PID: $FRONTEND_PID"

# 回到上層目錄
cd ..

echo ""
echo "🚀 服務啟動完成！"
echo ""
echo "📡 後端 API: http://localhost:8000"
echo "🎨 前端介面: http://localhost:3000"
echo ""
echo "📋 服務管理："
echo "  - 後端 PID: $BACKEND_PID"
echo "  - 前端 PID: $FRONTEND_PID"
echo "  - 停止服務: kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📖 日誌檔案："
echo "  - 後端: backend/backend.log"
echo "  - 前端: frontend/frontend.log"
echo ""

# 儲存 PID 到檔案以便後續停止
echo "$BACKEND_PID" > backend.pid
echo "$FRONTEND_PID" > frontend.pid

echo "等待服務啟動中..."
sleep 5

# 檢查服務狀態
echo ""
echo "🔍 檢查服務狀態..."

# 檢查後端
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ 後端服務正常運行"
else
    echo "⚠️ 後端服務可能尚未完全啟動，請稍候再試"
fi

# 檢查前端
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ 前端服務正常運行"
else
    echo "⚠️ 前端服務可能尚未完全啟動，請稍候再試"
fi

echo ""
echo "🎉 福井觀光智能助手已準備就緒！"
echo "請開啟瀏覽器訪問: http://localhost:3000"
