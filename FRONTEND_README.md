# 福井觀光智能助手 🏯

一個結合 AI 智能問答與互動式地圖的現代化 Web 應用程式，專為探索日本福井縣的神社與觀光景點而設計。

## ✨ 特色功能

### 🤖 AI 智能問答
- 基於 **ChromaDB 向量資料庫** 的語義搜尋
- 使用 **OpenAI GPT-4o-mini** 提供準確回答
- 支援中文自然語言互動
- 提供資料來源追蹤

### 🗺️ 互動式地圖
- 整合 **Mapbox** 高品質地圖服務
- 即時顯示景點與神社位置
- 支援多種地圖樣式切換
- 點選標記查看詳細資訊
- 一鍵導航功能

### 🎨 現代化介面
- **React 18** + **TypeScript** 前端框架
- **Tailwind CSS** 響應式設計
- **Framer Motion** 流暢動畫效果
- 極簡對話式使用者體驗
- 快速操作按鈕引導

## 🏗️ 技術架構

```
福井觀光智能助手
├── 前端 (Frontend)
│   ├── React 18 + TypeScript
│   ├── Tailwind CSS
│   ├── Framer Motion
│   ├── Mapbox GL JS
│   └── Axios
├── 後端 (Backend)
│   ├── FastAPI
│   ├── ChromaDB
│   ├── OpenAI API
│   └── Uvicorn
└── 資料層 (Data)
    ├── 向量資料庫 (ChromaDB)
    ├── 自然語言資料
    └── 位置座標資訊
```

## 📦 專案結構

```
src-LLM-Shrine/
├── 📱 frontend/                 # React 前端應用程式
│   ├── src/
│   │   ├── components/         # React 元件
│   │   ├── services/          # API 服務
│   │   └── App.tsx            # 主應用程式
│   ├── package.json
│   └── vite.config.ts
├── 📡 backend/                  # FastAPI 後端服務
│   ├── app.py                 # 主要 API 服務
│   └── requirements.txt       # Python 相依套件
├── 🗄️ chroma_db/               # ChromaDB 資料庫檔案
├── 📄 output/                   # 自然語言資料檔案
│   ├── locations_natural_language.md
│   └── shrines_natural_language.md
├── 🔧 src/                      # 原始程式碼
│   └── Vector_Database/
│       └── ChromaDB_v1.py     # 向量資料庫管理
├── .env                        # 環境變數設定
├── start_dev.sh               # 開發環境啟動腳本
└── stop_dev.sh                # 服務停止腳本
```

## 🚀 快速開始

### 前置需求
- **Python 3.8+**
- **Node.js 16+**
- **OpenAI API Key**
- **Mapbox Access Token** (選用)

### 1. 環境設定

```bash
# 複製專案
git clone <專案網址>
cd src-LLM-Shrine

# 設定環境變數
cp .env.example .env
```

### 2. 設定 API 金鑰

編輯 `.env` 檔案，填入您的 API 金鑰：

```bash
# OpenAI API 設定 (必需)
OPENAI_API_KEY=your_openai_api_key_here

# 其他設定
PERPLEXITY_API_KEY=your_perplexity_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
```

編輯 `frontend/.env` 檔案：

```bash
# 後端服務網址
VITE_API_BASE_URL=http://localhost:8000

# Mapbox 設定 (選用)
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

### 3. 一鍵啟動 🎯

```bash
# 自動安裝相依套件並啟動所有服務
./start_dev.sh
```

### 4. 開啟應用程式

- **前端介面**: http://localhost:3000
- **後端 API**: http://localhost:8000
- **API 文件**: http://localhost:8000/docs

## 🛠️ 手動安裝 (進階)

### 後端設定

```bash
# 進入後端目錄
cd backend

# 建立虛擬環境
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# 或 venv\\Scripts\\activate  # Windows

# 安裝相依套件
pip install -r requirements.txt

# 啟動後端服務
python app.py
```

### 前端設定

```bash
# 進入前端目錄
cd frontend

# 安裝相依套件
npm install

# 啟動開發伺服器
npm run dev
```

## 🎮 使用說明

### 基本操作
1. **開啟應用程式** - 瀏覽器訪問 http://localhost:3000
2. **開始對話** - 在輸入框中輸入問題，按 Enter 發送
3. **快速操作** - 點選頂部的快速操作按鈕
4. **切換地圖** - 點選右上角的「地圖模式」按鈕
5. **查看位置** - 在地圖模式下點選標記查看詳細資訊

### 問題範例
- "福井縣有哪些著名的神社？"
- "推薦一些福井縣的海岸景點"
- "永平寺的特色是什麼？"
- "如何前往福井縣？"
- "福井縣有什麼特色美食？"

### 地圖功能
- **標記點選** - 點選地圖上的標記查看景點詳情
- **樣式切換** - 切換衛星、街道、戶外等地圖樣式
- **導航功能** - 點選「導航」按鈕開啟 Google 地圖
- **縮放控制** - 使用滑鼠滾輪或控制按鈕縮放地圖

## 🔧 設定說明

### OpenAI API 設定
1. 註冊 [OpenAI 帳號](https://platform.openai.com/)
2. 取得 API Key
3. 設定到 `.env` 檔案的 `OPENAI_API_KEY`

### Mapbox 設定 (選用)
1. 註冊 [Mapbox 帳號](https://www.mapbox.com/)
2. 取得 Access Token
3. 設定到 `frontend/.env` 檔案的 `VITE_MAPBOX_ACCESS_TOKEN`

### ChromaDB 資料庫
- 首次執行時會自動建立資料庫
- 資料檔案存放在 `chroma_db/` 目錄
- 支援持久化儲存

## 📱 響應式設計

應用程式支援各種螢幕尺寸：
- **桌面版**: 完整的雙欄式介面（聊天 + 地圖）
- **平板版**: 可切換的單欄介面
- **手機版**: 優化的觸控操作體驗

## 🐛 疑難排解

### 常見問題

**Q: 無法連接到後端服務**
```bash
# 檢查後端服務狀態
curl http://localhost:8000/health

# 查看後端日誌
tail -f backend/backend.log
```

**Q: 前端無法載入**
```bash
# 檢查 Node.js 版本
node --version  # 需要 16+

# 清除快取並重新安裝
rm -rf node_modules package-lock.json
npm install
```

**Q: ChromaDB 錯誤**
```bash
# 重新建立資料庫
rm -rf chroma_db/
python src/Vector_Database/ChromaDB_v1.py
```

**Q: OpenAI API 錯誤**
- 檢查 API Key 是否正確設定
- 確認帳號有足夠的配額
- 檢查網路連線狀況

### 停止服務

```bash
# 使用停止腳本
./stop_dev.sh

# 手動停止
kill $(cat backend.pid frontend.pid)
```

## 🔮 未來改進

- [ ] 支援更多語言（日文、英文）
- [ ] 離線模式支援
- [ ] 個人化推薦系統
- [ ] 路線規劃功能
- [ ] 社群分享功能
- [ ] 語音互動支援
- [ ] 行動應用程式版本

## 📄 授權

本專案採用 MIT 授權條款。

## 🙋‍♂️ 支援與回饋

如有任何問題或建議，請：
1. 檢查[疑難排解](#-疑難排解)章節
2. 查看專案 Issues
3. 建立新的 Issue 回報問題

---

**🏯 探索福井，發現日本之美！**
