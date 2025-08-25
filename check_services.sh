#!/bin/bash
# 快速檢查服務狀態

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 服務狀態檢查${NC}"
echo "===================="

# 檢查後端服務
echo -e "\n${BLUE}📡 檢查後端服務 (Port 8001)...${NC}"
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    response=$(curl -s http://localhost:8001/health)
    echo -e "${GREEN}✅ 後端服務正常執行${NC}"
    echo -e "${BLUE}回應:${NC} $response"
else
    echo -e "${RED}❌ 後端服務無法連接${NC}"
    if [ -f "backend.pid" ]; then
        backend_pid=$(cat backend.pid)
        if ps -p $backend_pid > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️ 後端程序存在但無回應 (PID: $backend_pid)${NC}"
        else
            echo -e "${RED}❌ 後端程序不存在${NC}"
        fi
    else
        echo -e "${RED}❌ 找不到 backend.pid 檔案${NC}"
    fi
fi

# 檢查前端服務
echo -e "\n${BLUE}🎨 檢查前端服務 (Port 3000)...${NC}"
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 前端服務正常執行${NC}"
else
    echo -e "${RED}❌ 前端服務無法連接${NC}"
    if [ -f "frontend.pid" ]; then
        frontend_pid=$(cat frontend.pid)
        if ps -p $frontend_pid > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠️ 前端程序存在但無回應 (PID: $frontend_pid)${NC}"
        else
            echo -e "${RED}❌ 前端程序不存在${NC}"
        fi
    else
        echo -e "${RED}❌ 找不到 frontend.pid 檔案${NC}"
    fi
fi

# 檢查連接埠使用情況
echo -e "\n${BLUE}🔌 連接埠使用情況${NC}"
echo -e "${BLUE}Port 8001:${NC}"
lsof -Pi :8001 -sTCP:LISTEN 2>/dev/null || echo "未使用"

echo -e "${BLUE}Port 3000:${NC}"
lsof -Pi :3000 -sTCP:LISTEN 2>/dev/null || echo "未使用"

# 最近的日誌
echo -e "\n${BLUE}📋 最近的後端日誌 (最後 5 行)${NC}"
if [ -f "backend/backend.log" ]; then
    tail -5 backend/backend.log
else
    echo "找不到後端日誌檔案"
fi

echo -e "\n${BLUE}📋 最近的前端日誌 (最後 5 行)${NC}"
if [ -f "frontend/frontend.log" ]; then
    tail -5 frontend/frontend.log
else
    echo "找不到前端日誌檔案"
fi
