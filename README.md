# 福井景點 Google Maps 資料增強工具

這個工具可以為福井縣景點自動撷取 Google Maps 的詳細資訊。

## 🆕 最新功能：地理位置感知搜尋

新增了智能地理位置感知搜尋功能，讓 GPT-4o-mini 在推薦景點時能夠：

✅ **優先推薦同一城市的景點** - 避免推薦距離太遠的景點組合  
✅ **考慮地理距離遠近** - 使用 Haversine 公式精確計算距離  
✅ **提供實用的旅遊路線** - GPT 會建議地理上連貫的行程安排  
✅ **智能識別地點查詢** - 自動從使用者問題中識別城市和地點  

### 快速體驗地理感知搜尋

```bash
# 執行演示腳本
python3 demo_location_aware.py

# 或執行完整測試
python3 test_location_aware_search.py
```

詳細說明請參考：[地理位置感知搜尋功能說明](LOCATION_AWARE_SEARCH_README.md)

---

## 設定步驟

### 1. 配置 API 金鑰

編輯 `.env` 檔案，設定您的 Google Maps API 金鑰：

```env
GOOGLE_MAPS_API_KEY=你的API金鑰
```

### 2. 安裝相依套件

```bash
pip3 install -r requirements.txt
```

### 3. 測試設定

執行測試指令檔確認設定正確：

```bash
./test_api.sh
```

或手動測試：

```bash
cd src
python3 -c "from Google_Map_API_Location import load_config; print('✅ 設定正確')"
```

## 使用方式

### 執行主程式

```bash
cd src
python3 Google_Map_API_Location.py
```

### 重要檔案說明

- `.env` - 環境變數配置檔案（包含 API 金鑰）
- `src/Google_Map_API_Location.py` - 主程式
- `data/fukui_location.json` - 輸入資料（福井景點基本資訊）
- `output/fukui_enhanced_locations.json` - 輸出結果（增強後的景點資料）

## API 使用量說明

- 免費額度：每月 17,000 次調用
- 預估用量：每個景點需要 2 次調用（Find Place + Place Details）
- 安全機制：包含每日限制、重複檢查、進度恢復等功能

## 輸出結果

程式會產生兩個檔案：
- `fukui_enhanced_locations.json` - 只包含成功獲取 Google 資料的景點
- `fukui_enhanced_locations_full.json` - 包含所有處理過的景點（含失敗的）

## 故障排除

### 1. API 金鑰錯誤
- 確認 `.env` 檔案中 `GOOGLE_MAPS_API_KEY` 設定正確
- 確認 API 金鑰已啟用 Places API 服務

### 2. 套件匯入錯誤
- 執行 `pip3 install -r requirements.txt` 安裝相依套件

### 3. 檔案路徑錯誤
- 確認在正確目錄執行程式
- 檢查輸入檔案 `data/fukui_location.json` 是否存在

## 程式功能

- ✅ 自動從 `.env` 檔案載入配置
- ✅ API 金鑰有效性驗證
- ✅ 成本估算和安全檢查
- ✅ 重複資料檢測和跳過
- ✅ 自動進度保存和恢復
- ✅ 完整的錯誤處理和重試機制
- ✅ 詳細的使用量統計和日誌記錄
