import json
import qrcode
import os
import re
import urllib.parse
import urllib.request
import http.server
import socketserver
import sys
import datetime
import threading

# --- 設定 ---
# !! 非常重要：請在執行 generate 指令前，將這裡換成您自己的 IP 位址 !!
YOUR_COMPUTER_IP = "172.20.10.2" # <--- 請換成您自己的 IP 位址
PORT = 8000

# 檔案和資料夾名稱
JSON_FILE = "./output/fukui_enhanced_locations.json"
QR_OUTPUT_FOLDER = "QRcode_http"
LOG_FILE = "./output/scan_log.json" # 用來記錄掃描紀錄的檔案

# 建立一個鎖，確保多個請求同時寫入日誌檔案時不會發生衝突
log_lock = threading.Lock()

# --- 共用函式 (不需要修改) ---

def sanitize_filename(name):
    sanitized = re.sub(r'[\\/*?:"<>|]', "", name)
    sanitized = sanitized.replace(" ", "_")
    return sanitized

def create_html_for_location(data):
    gmaps_data = data.get('google_maps_data', {})
    if not gmaps_data:
        return None
    name = gmaps_data.get('name', 'N/A')
    address = gmaps_data.get('formatted_address', 'N/A')
    phone = gmaps_data.get('phone_number', 'N/A')
    website = gmaps_data.get('website', '#')
    rating = gmaps_data.get('rating', 'N/A')
    photos_html = ""
    photos_list = gmaps_data.get('photos', [])
    if photos_list:
        for photo_url in photos_list:
            photos_html += f'<img src="{photo_url}" alt="照片" style="width: 48%; margin: 1%; border-radius: 8px;">'
    reviews_html = ""
    reviews_list = gmaps_data.get('reviews', [])
    if reviews_list:
        reviews_html += "<h3>Traveler's Comments</h3>"
        for review in reviews_list:
            author = review.get("author_name", "匿名")
            review_rating = review.get("rating", "-")
            review_text = review.get("text", "").replace("\n", "<br>")
            reviews_html += f"""
            <div style="border: 1px solid #ccc; border-radius: 8px; padding: 10px; margin-bottom: 10px;">
                <p><strong>{author}</strong> ({review_rating}★)</p>
                <p>{review_text}</p>
            </div>
            """
    html_template = f"""
    <!DOCTYPE html>
    <html lang="zh-Hant">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{name}</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }}
            .container {{ max-width: 800px; margin: auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }}
            h1 {{ color: #333; }}
            a {{ color: #007BFF; text-decoration: none; }}
            .photos-grid {{ display: flex; flex-wrap: wrap; margin: -1%; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>{name}</h1>
            <p><strong>⭐ Rating:</strong> {rating}</p>
            <p><strong>📍 Address:</strong> {address}</p>
            <p><strong>📞 Phone:</strong> {phone}</p>
            <p><strong>🌐 Website:</strong> <a href="{website}" target="_blank">{website}</a></p>
            <hr>
            <h3>Pictures</h3>
            <div class="photos-grid">
                {photos_html}
            </div>
            <hr>
            {reviews_html}
        </div>
    </body>
    </html>
    """
    return html_template

# --- 功能一：生成 QR Code ---
def generate_qr_codes():
    base_url = f"http://{YOUR_COMPUTER_IP}:{PORT}/spot"
    os.makedirs(QR_OUTPUT_FOLDER, exist_ok=True)
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        locations_list = json.load(f)
    print(f"開始為本地伺服器生成 QR Code，目標網址: {base_url}/...")
    for location_data in locations_list:
        unique_key = location_data.get("unique_key")
        if unique_key:
            encoded_key = urllib.parse.quote(unique_key)
            location_url = f"{base_url}/{encoded_key}"
            safe_filename = sanitize_filename(unique_key) + ".png"
            output_path = os.path.join(QR_OUTPUT_FOLDER, safe_filename)
            qr_img = qrcode.make(location_url)
            qr_img.save(output_path)
    print(f"QR Code 已全部生成至 '{QR_OUTPUT_FOLDER}' 資料夾。")

# --- 功能二：啟動本地伺服器 (包含記錄功能) ---
def run_server():
    try:
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            locations = json.load(f)
        locations_dict = {loc.get("unique_key"): loc for loc in locations if loc.get("unique_key")}
        print(f"成功載入 {len(locations_dict)} 筆景點資料。")
    except Exception as e:
        print(f"錯誤：無法載入 {JSON_FILE}。")
        return

    class MyHttpRequestHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            parsed_path = urllib.parse.urlparse(self.path)
            path_parts = parsed_path.path.split('/')
            
            if len(path_parts) == 3 and path_parts[1] == 'spot':
                key = urllib.parse.unquote(path_parts[2])
                data = locations_dict.get(key)
                
                if data:
                    # --- 新增的記錄功能 ---
                    self.log_scan(key, data)
                    # --------------------
                    
                    html_content = create_html_for_location(data)
                    self.send_response(200)
                    self.send_header("Content-type", "text/html; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(html_content.encode('utf-8'))
                else:
                    self.send_error(404, "找不到景點資料")
                return
            
            if self.path == '/':
                self.send_response(200)
                self.send_header("Content-type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write("<h1>伺服器運行中</h1><p>請用手機掃描 QR Code 來測試。</p>".encode('utf-8'))
                return
            
            super().do_GET()

        def log_scan(self, key, data):
            with log_lock:
                try:
                    log_entry = {
                        "timestamp": datetime.datetime.now().isoformat(),
                        "unique_key": key,
                        "name": data.get("google_maps_data", {}).get("name", "N/A")
                    }
                    
                    logs = []
                    if os.path.exists(LOG_FILE):
                        # 【修正點】增加 try-except 來處理檔案為空的情況
                        try:
                            with open(LOG_FILE, 'r', encoding='utf-8') as f:
                                logs = json.load(f)
                            # 確保讀取到的內容是列表
                            if not isinstance(logs, list):
                                print(f"[紀錄警告] {LOG_FILE} 內容不是列表，將重新建立。")
                                logs = []
                        except json.JSONDecodeError:
                            # 如果檔案是空的或毀損的，json.load 會失敗
                            print(f"[紀錄警告] {LOG_FILE} 為空或格式損毀，將重新建立。")
                            logs = []
                    
                    logs.append(log_entry)
                    with open(LOG_FILE, 'w', encoding='utf-8') as f:
                        json.dump(logs, f, ensure_ascii=False, indent=4)
                    
                    print(f"[紀錄] 已記錄一筆掃描: {log_entry['name']}")

                except Exception as e:
                    print(f"[紀錄錯誤] 無法寫入 {LOG_FILE}: {e}")

    with socketserver.TCPServer(("", PORT), MyHttpRequestHandler) as httpd:
        print(f"\n伺服器已在 http://{YOUR_COMPUTER_IP}:{PORT} 啟動")
        print("請確認您的手機和電腦在同一個 Wi-Fi 網路下")
        print("按下 Ctrl+C 來停止伺服器")
        httpd.serve_forever()


# --- 主程式執行區 ---
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("錯誤：請提供執行指令。")
        print("用法:")
        print(f"  python {os.path.basename(__file__)} generate   (用來生成 QR Code)")
        print(f"  python {os.path.basename(__file__)} serve      (用來啟動伺服器)")
    elif sys.argv[1] == 'generate':
        generate_qr_codes()
    elif sys.argv[1] == 'serve':
        run_server()
    else:
        print(f"錯誤：未知的指令 '{sys.argv[1]}'")
        print("請使用 'generate' 或 'serve'")