#!/bin/bash
# 福井觀光智能助手 - 優化的開發環境啟動腳本
# 解決記憶體使用和日誌問題的改進版本

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏯 福井觀光智能助手 - 優化開發環境啟動${NC}"
echo "=========================================="

# 清理函式
cleanup() {
    echo -e "\n${YELLOW}🔄 正在關閉服務...${NC}"
    
    # 停止後端服務
    if [ -f "backend.pid" ]; then
        backend_pid=$(cat backend.pid)
        if kill -0 $backend_pid 2>/dev/null; then
            kill -TERM $backend_pid 2>/dev/null || kill -9 $backend_pid 2>/dev/null
            echo -e "${GREEN}✅ 後端服務已關閉${NC}"
        fi
        rm -f backend.pid
    fi
    
    # 停止前端服務
    if [ -f "frontend.pid" ]; then
        frontend_pid=$(cat frontend.pid)
        if kill -0 $frontend_pid 2>/dev/null; then
            kill -TERM $frontend_pid 2>/dev/null || kill -9 $frontend_pid 2>/dev/null
            echo -e "${GREEN}✅ 前端服務已關閉${NC}"
        fi
        rm -f frontend.pid
    fi
    
    # 清理任何殘留的進程
    pkill -f "app.py" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    
    echo -e "${GREEN}✨ 清理完成${NC}"
}

# 捕捉中斷信號
trap cleanup EXIT INT TERM

# 檢查並釋放連接埠
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ 連接埠 $port 已被使用，正在釋放...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
}

echo -e "${BLUE}🔍 檢查開發環境...${NC}"

# 基本環境檢查
if ! command -v conda &> /dev/null; then
    echo -e "${RED}❌ 錯誤：未找到 conda${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 錯誤：未找到 Node.js${NC}"
    exit 1
fi

if ! conda env list | grep -q "LLM_env"; then
    echo -e "${RED}❌ 錯誤：未找到 LLM_env 環境${NC}"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ 錯誤：未找到 .env 檔案${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 環境檢查通過${NC}"

# 檢查並釋放連接埠
check_port 8001
check_port 3000

# 清理舊的日誌檔案
echo -e "${BLUE}🧹 清理舊日誌檔案...${NC}"
> backend.log
> frontend.log

# 設定記憶體限制的環境變數
export PYTHONUNBUFFERED=1
export MALLOC_ARENA_MAX=2
export OMP_NUM_THREADS=2

# 啟動後端服務
echo -e "\n${BLUE}📡 啟動後端服務 (Port 8001)...${NC}"
cd backend

# 使用優化的 Python 啟動參數
nohup conda run -n LLM_env python -X dev -Wignore -O $(pwd)/app.py > ../backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend.pid

echo -e "${YELLOW}⏳ 等待後端服務啟動 (最多等待60秒)...${NC}"
for i in {1..60}; do
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 後端服務啟動成功 (PID: $BACKEND_PID)${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}❌ 後端服務啟動超時${NC}"
        echo -e "${YELLOW}📋 後端日誌（最後20行）：${NC}"
        tail -20 ../backend.log
        exit 1
    fi
    sleep 1
done

cd ..

# 啟動前端服務
echo -e "\n${BLUE}🎨 啟動前端服務 (Port 3000)...${NC}"
cd frontend

if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 安裝前端依賴套件...${NC}"
    npm install --prefer-offline --no-audit
fi

nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../frontend.pid

echo -e "${YELLOW}⏳ 等待前端服務啟動 (最多等待30秒)...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 前端服務啟動成功 (PID: $FRONTEND_PID)${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ 前端服務啟動超時${NC}"
        echo -e "${YELLOW}📋 前端日誌（最後20行）：${NC}"
        tail -20 ../frontend.log
        exit 1
    fi
    sleep 1
done

cd ..

# 顯示服務狀態
echo -e "\n${GREEN}🎉 開發環境啟動成功！${NC}"
echo "=========================================="
echo -e "${BLUE}📡 後端 API:${NC} http://localhost:8001"
echo -e "${BLUE}🎨 前端網站:${NC} http://localhost:3000"
echo -e "${BLUE}📊 API 文件:${NC} http://localhost:8001/docs"
echo -e "${BLUE}📋 健康檢查:${NC} http://localhost:8001/health"

# 檢查服務健康狀態
echo -e "\n${BLUE}🔍 檢查服務健康狀態...${NC}"
backend_health=$(curl -s http://localhost:8001/health | jq -r '.status' 2>/dev/null || echo "error")
if [ "$backend_health" = "healthy" ]; then
    echo -e "${GREEN}✅ 後端服務健康${NC}"
else
    echo -e "${YELLOW}⚠️ 後端服務狀態異常${NC}"
fi

echo -e "\n${YELLOW}💡 使用提示：${NC}"
echo "• 使用優化的記憶體設定 (MALLOC_ARENA_MAX=2)"
echo "• 日誌輸出已優化減少干擾訊息"
echo "• 按 Ctrl+C 優雅關閉所有服務"
echo "• 服務啟動後會自動打開瀏覽器"

# 嘗試自動開啟瀏覽器（macOS）
if command -v open &> /dev/null; then
    echo -e "\n${BLUE}🌐 正在開啟瀏覽器...${NC}"
    sleep 2
    open http://localhost:3000 2>/dev/null || true
fi

# 保持腳本執行
echo -e "\n${BLUE}🔄 服務執行中... (按 Ctrl+C 停止)${NC}"
while true; do
    # 每30秒檢查一次服務狀態
    sleep 30
    
    # 檢查後端服務是否還在運行
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "\n${RED}❌ 後端服務意外停止${NC}"
        break
    fi
    
    # 檢查前端服務是否還在運行
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "\n${RED}❌ 前端服務意外停止${NC}"
        break
    fi
done
