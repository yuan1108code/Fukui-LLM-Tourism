#!/bin/bash
# 福井觀光智能助手 - 包含資料優化的啟動腳本
# 提供選項來優化資料載入量以提升系統執行效能

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏯 福井觀光智能助手 - 智能啟動腳本${NC}"
echo "=============================================="
echo -e "${PURPLE}提供資料載入優化選項以提升系統執行效能${NC}"
echo "=============================================="

# 詢問用戶是否要進行資料優化
echo -e "\n${YELLOW}💡 系統提供兩種啟動模式：${NC}"
echo "1. 🚀 快速模式：載入 50 個景點 + 50 個神社 (推薦)"
echo "2. 📚 完整模式：載入所有資料 (較慢但完整)"
echo -e "3. 🔧 自訂模式：自訂載入數量"
echo -e "4. ⚡ 直接啟動：使用現有資料庫"

echo -e "\n${BLUE}請選擇啟動模式 (1-4):${NC}"
read -p "選擇 [1]: " choice

# 預設選擇快速模式
if [ -z "$choice" ]; then
    choice=1
fi

case $choice in
    1)
        echo -e "${GREEN}🚀 選擇快速模式 - 載入 50 個景點和 50 個神社${NC}"
        echo -e "${BLUE}🔧 正在執行資料優化...${NC}"
        if ! conda run -n LLM_env python optimize_data_loading.py << EOF
50
50
y
EOF
        then
            echo -e "${RED}❌ 資料優化失敗${NC}"
            exit 1
        fi
        ;;
    2)
        echo -e "${GREEN}📚 選擇完整模式 - 載入所有資料${NC}"
        echo -e "${BLUE}🔧 正在執行資料優化...${NC}"
        if ! conda run -n LLM_env python optimize_data_loading.py << EOF


y
EOF
        then
            echo -e "${RED}❌ 資料優化失敗${NC}"
            exit 1
        fi
        ;;
    3)
        echo -e "${GREEN}🔧 選擇自訂模式${NC}"
        echo -e "${BLUE}請輸入載入數量 (按 Enter 使用預設值):${NC}"
        read -p "景點數量 [50]: " locations_count
        read -p "神社數量 [50]: " shrines_count
        
        # 使用預設值如果用戶未輸入
        locations_count=${locations_count:-50}
        shrines_count=${shrines_count:-50}
        
        echo -e "${BLUE}🔧 正在執行資料優化...${NC}"
        if ! conda run -n LLM_env python optimize_data_loading.py << EOF
$locations_count
$shrines_count
y
EOF
        then
            echo -e "${RED}❌ 資料優化失敗${NC}"
            exit 1
        fi
        ;;
    4)
        echo -e "${GREEN}⚡ 直接啟動模式 - 使用現有資料庫${NC}"
        ;;
    *)
        echo -e "${RED}❌ 無效選擇，使用快速模式${NC}"
        echo -e "${BLUE}🔧 正在執行資料優化...${NC}"
        if ! conda run -n LLM_env python optimize_data_loading.py << EOF
50
50
y
EOF
        then
            echo -e "${RED}❌ 資料優化失敗${NC}"
            exit 1
        fi
        ;;
esac

# 現在啟動服務
echo -e "\n${BLUE}🚀 正在啟動開發環境...${NC}"
exec ./start_dev_optimized.sh
