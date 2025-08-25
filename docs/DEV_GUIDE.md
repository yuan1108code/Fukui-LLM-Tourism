# 福井觀光智能助手 - 開發環境啟動指南

## 快速啟動

### 方法 1：使用優化啟動腳本（推薦）
```bash
./start_dev_optimized.sh
```

這個腳本會：
- 自動檢查環境
- 釋放被佔用的連接埠
- 依序啟動後端和前端服務
- 等待服務完全啟動
- 測試連接狀態
- 提供完整的錯誤訊息

### 方法 2：手動啟動
```bash
# 後端 (Terminal 1)
cd backend
source venv/bin/activate  # 如果有虛擬環境
python3 app.py

# 前端 (Terminal 2)
cd frontend
npm run dev
```

## 服務狀態檢查

隨時檢查服務狀態：
```bash
./check_services.sh
```

## 服務位址

- **前端網站**: http://localhost:3000
- **後端 API**: http://localhost:8001
- **健康檢查**: http://localhost:8001/health

## 常見問題解決

### Connection Error 問題

1. **檢查連接埠是否被佔用**
   ```bash
   lsof -i :8001  # 檢查後端連接埠
   lsof -i :3000  # 檢查前端連接埠
   ```

2. **手動釋放連接埠**
   ```bash
   sudo kill -9 $(lsof -ti:8001)  # 釋放後端連接埠
   sudo kill -9 $(lsof -ti:3000)  # 釋放前端連接埠
   ```

3. **檢查服務日誌**
   ```bash
   tail -f backend/backend.log    # 後端日誌
   tail -f frontend/frontend.log  # 前端日誌
   ```

### 環境設定問題

1. **確認 .env 檔案存在**
   ```bash
   ls -la .env
   ```
   如果不存在，請複製 `.env.example` 並填入您的 OpenAI API Key

2. **檢查 Python 虛擬環境**
   ```bash
   cd backend
   ls -la venv/
   ```

3. **重新安裝相依套件**
   ```bash
   # 後端
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   
   # 前端
   cd frontend
   rm -rf node_modules
   npm install
   ```

## 優化功能

### API 重試機制
前端 API 現在包含：
- 自動重試失敗的請求（最多 3 次）
- 智能錯誤處理
- 延長超時時間

### 連接埠自動檢查
啟動腳本會：
- 檢查連接埠是否被佔用
- 自動釋放衝突的連接埠
- 等待服務完全啟動

### 健康檢查
- 後端服務啟動檢測
- 前端服務連接測試
- 定期狀態監控

## 停止服務

按 `Ctrl+C` 停止所有服務，或執行：
```bash
./stop_dev.sh
```
