# 福井神社資料增強工具 - ChromaDB 向量資料庫

## 📋 專案概述

這個專案實作了一個基於 ChromaDB 向量資料庫的智能問答系統，專門用於福井縣觀光景點和神社的資訊查詢。系統會將 markdown 格式的景點和神社資料映射到向量資料庫中，並透過 OpenAI GPT-4o-mini 提供智能問答服務。

## 🏗️ 系統架構

```
福井觀光智能助手
├── 資料載入層
│   ├── locations_natural_language.md (景點資料)
│   └── shrines_natural_language.md (神社資料)
├── 向量資料庫層
│   ├── ChromaDB (持久化儲存)
│   └── OpenAI Embedding (text-embedding-3-small)
└── 智能問答層
    ├── 語義搜尋 (向量相似度)
    └── GPT-4o-mini (自然語言生成)
```

## 📦 依賴套件

主要依賴套件包括：
- `chromadb>=0.4.0` - 向量資料庫
- `openai>=1.0.0` - OpenAI API 客戶端
- `python-dotenv>=0.19.0` - 環境變數管理
- `requests>=2.25.0` - HTTP 請求
- `pandas>=1.3.0` - 資料處理
- `numpy>=1.21.0` - 數值計算

完整套件清單請參考 `requirements.txt`

## 🚀 快速開始

### 1. 環境設定

#### 自動安裝（推薦）
```bash
# 執行自動安裝腳本
./setup.sh
```

#### 手動安裝
```bash
# 安裝依賴套件
pip install -r requirements.txt

# 設定環境變數
cp .env.example .env
# 編輯 .env 檔案，填入您的 OPENAI_API_KEY
```

### 2. API Key 設定

在 `.env` 檔案中設定您的 OpenAI API Key：
```bash
OPENAI_API_KEY=your_actual_api_key_here
```

### 3. 執行程式

#### 方式一：執行主程式（測試功能）
```bash
python src/Vector_Database/ChromaDB_v1.py
```

#### 方式二：執行互動式聊天機器人
```bash
python demo_chatbot.py
```

## 💡 使用說明

### 基本功能

1. **資料載入**：自動解析 markdown 檔案並建立向量索引
2. **語義搜尋**：根據問題找到相關的景點/神社資料
3. **智能問答**：使用 GPT-4o-mini 生成自然、準確的回答
4. **多語言支援**：支援繁體中文問答

### 問題範例

您可以詢問以下類型的問題：
- "福井縣有哪些著名的神社？"
- "推薦一些福井縣的海岸景點"
- "永平寺的特色是什麼？"
- "福井縣適合春季參觀的地方有哪些？"
- "如何前往福井縣的主要景點？"
- "福井縣有什麼特殊的祭典活動？"

### 程式碼結構

#### ChromaDBManager 類別

主要功能：
- `__init__()`: 初始化資料庫連線和 OpenAI 客戶端
- `load_and_process_files()`: 載入並解析 markdown 檔案
- `insert_documents()`: 將文件插入向量資料庫
- `search_similar()`: 語義搜尋相似文件
- `ask_gpt()`: 使用 GPT-4o-mini 生成回答

#### 使用範例

```python
from src.Vector_Database.ChromaDB_v1 import ChromaDBManager

# 初始化管理器
chroma_manager = ChromaDBManager()

# 載入資料
locations_data, shrines_data = chroma_manager.load_and_process_files(
    "output/locations_natural_language.md",
    "output/shrines_natural_language.md"
)

# 插入資料庫
all_documents = locations_data + shrines_data
chroma_manager.insert_documents(all_documents)

# 問答
question = "福井縣有哪些著名的神社？"
answer = chroma_manager.ask_gpt(question)
print(answer)
```

## 🗂️ 檔案結構

```
src-LLM-Shrine/
├── README.md                          # 專案說明
├── requirements.txt                   # 依賴套件
├── setup.sh                          # 安裝腳本
├── demo_chatbot.py                   # 互動式聊天機器人
├── .env                              # 環境變數設定
├── output/                           # 輸出資料
│   ├── locations_natural_language.md # 景點資料
│   └── shrines_natural_language.md   # 神社資料
└── src/
    └── Vector_Database/
        └── ChromaDB_v1.py            # 主要程式碼
```

## 🔧 技術細節

### 向量嵌入
- 使用 OpenAI 的 `text-embedding-3-small` 模型
- 支援中文和英文文本
- 維度：1536

### 資料庫設定
- 使用 DuckDB 作為後端儲存
- 支援持久化儲存
- 自動建立索引

### 問答機制
1. 使用者提出問題
2. 將問題轉換為向量嵌入
3. 在向量資料庫中搜尋相似文件
4. 將相關文件作為上下文提供給 GPT-4o-mini
5. 生成準確、有用的回答

## 🐛 疑難排解

### 常見問題

1. **OpenAI API Key 錯誤**
   ```
   解決方案：檢查 .env 檔案中的 OPENAI_API_KEY 是否正確設定
   ```

2. **ChromaDB 初始化失敗**
   ```
   解決方案：確保有足夠的磁碟空間，且目錄具有寫入權限
   ```

3. **模組匯入錯誤**
   ```
   解決方案：確保已安裝所有依賴套件：pip install -r requirements.txt
   ```

### 日誌檔案
系統會在執行目錄下生成 `chromadb.log` 檔案，記錄詳細的執行日誌。

## 📊 效能考量

- **嵌入生成**：每個文件約需 1-2 秒
- **搜尋速度**：毫秒級響應
- **記憶體使用**：約 500MB（包含模型載入）
- **儲存空間**：每 1000 個文件約需 50MB

## 🔮 未來改進

- [ ] 支援更多資料格式（JSON、CSV）
- [ ] 添加批次處理功能
- [ ] 實作 Web 界面
- [ ] 支援多語言問答
- [ ] 添加資料更新機制
- [ ] 整合更多 LLM 模型選擇

## 📝 授權

本專案採用 MIT 授權。

## 🙋‍♂️ 支援

如有問題或建議，請透過以下方式聯繫：
- 建立 Issue 在專案倉庫
- 發送郵件至專案維護者

---

*最後更新：2025年7月20日*
