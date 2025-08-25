# 福井觀光智能助手 - 後端服務使用指南

## 🎉 修復完成！

您的福井觀光智能助手後端服務已經成功修復並正常執行！

## 📊 當前狀態

✅ **服務狀態**: 正常執行  
✅ **資料庫**: 已載入 204 個文件  
✅ **搜尋功能**: 正常工作  
✅ **健康檢查**: 通過  
⚠️ **聊天功能**: 可用但需檢查 OpenAI API 設定  

## 🚀 服務啟動方式

### 方法 1: 使用改良的啟動腳本（推薦）
```bash
cd /Users/zhuboyuan/Desktop/University-NCHU/NCHU-Project/Project-FUKUI/src/src-LLM-Shrine
./start_backend_improved.sh
```

### 方法 2: 手動啟動
```bash
cd /Users/zhuboyuan/Desktop/University-NCHU/NCHU-Project/Project-FUKUI/src/src-LLM-Shrine/backend
conda activate LLM_env
python app.py
```

## 🔍 API 端點

### 1. 健康檢查
```bash
curl http://localhost:8001/health
```

### 2. 搜尋景點/神社
```bash
curl "http://localhost:8001/search?query=大野城&limit=5"
```

### 3. 聊天對話
```bash
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "請介紹一下福井縣的觀光特色"}'
```

### 4. 獲取所有位置資訊
```bash
curl http://localhost:8001/locations
```

## 🛠️ 修復內容

1. **清理檔案名稱過長的 ChromaDB 備份檔案**
2. **減少不必要的警告訊息**（將 WARNING 改為 DEBUG）
3. **優化 ChromaDB 設定**
4. **建立改良的啟動腳本**，具有更好的錯誤處理
5. **修復服務穩定性問題**

## 🧪 測試工具

執行完整測試：
```bash
python3 test_backend.py
```

執行修復腳本：
```bash
python3 fix_backend_issues.py
```

## 📝 注意事項

1. **虛擬環境**: 確保使用 `LLM_env` 虛擬環境
2. **連接埠**: 服務執行在 http://localhost:8001
3. **資料載入**: 首次啟動需要時間載入 204 個文件
4. **OpenAI API**: 聊天功能需要有效的 OpenAI API 金鑰

## 🔧 如果遇到問題

1. **連接埠被佔用**:
   ```bash
   lsof -ti:8001 | xargs kill -9
   ```

2. **資料庫問題**:
   ```bash
   python3 fix_backend_issues.py
   ```

3. **檢查日誌**:
   ```bash
   tail -50 backend.log
   ```

## 🎯 服務功能

- ✅ 福井縣 199 個觀光景點搜尋
- ✅ 5 個神社資訊查詢
- ✅ 向量相似度搜尋
- ✅ RESTful API 介面
- ✅ CORS 支援
- ⚠️ OpenAI 聊天對話（需檢查 API 設定）

## 💡 使用建議

1. 先測試健康檢查確認服務正常
2. 使用搜尋功能查找特定景點
3. 如需聊天功能，請確認 OpenAI API 金鑰設定正確
4. 定期檢查日誌檔案以監控服務狀態

---

🎉 **恭喜！您的福井觀光智能助手後端服務已經成功修復並正常執行！**
