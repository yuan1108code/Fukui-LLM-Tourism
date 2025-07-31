# %%
import pandas as pd
import json
import requests
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import os
from datetime import datetime
import hashlib
from googleapiclient.discovery import build
from dotenv import load_dotenv

# 載入 .env 檔案
load_dotenv()

# API 設定 - 使用環境變數保護 API 金鑰
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_ENGINE_ID = os.getenv("GOOGLE_ENGINE_ID")

@dataclass
class ShrineInfo:
    """神社基本資訊結構"""
    # 基本識別資訊
    name_jp: str
    name_en: str
    romaji: str
    type: str  # 神社/寺
    
    # 位置座標
    prefecture: str
    city: str
    address: str
    lat: float
    lon: float
    geohash: str
    
    # 交通指引
    nearest_station: str
    access_time_walk: str
    bus_info: str
    parking: str
    
    # 歷史與文化背景
    founded_year: str
    founder: str
    historical_events: List[str]
    important_cultural_property: List[str]
    unesco: bool
    architectural_style: str
    enshrined_deities: List[Dict[str, str]]  # [{"name": "神明", "role": "功德"}]
    
    # 祈願與服務
    prayer_categories: List[str]
    omamori_types: List[str]
    goshuin: bool
    ceremonies: List[Dict[str, Any]]  # [{"name": "儀式名", "reservation_req": bool, "fee": int}]
    
    # 參拜資訊
    gate_open: str
    gate_close: str
    office_hours: str
    admission_fee: int  # JPY
    annual_festivals: List[Dict[str, str]]  # [{"name": "祭典名", "date": "日期", "description": "簡述"}]
    
    # 旅遊體驗 & 便利設施
    highlights: List[str]
    best_seasons: List[str]
    wheelchair_access: bool
    toilets: bool
    wifi: bool
    photo_policy: str
    
    # 額外資訊
    description: str
    phone: str
    url: str
    
    # 來源資訊
    sources: List[Dict[str, str]]  # [{"title": "標題", "url": "網址", "snippet": "摘要", "source": "來源類型"}]

class ShrineDataEnhancer:
    """神社資料增強器"""
    
    def __init__(self, perplexity_api_key: str, openai_api_key: str, google_api_key: str, google_engine_id: str):
        self.perplexity_api_key = perplexity_api_key
        self.openai_api_key = openai_api_key
        self.google_api_key = google_api_key
        self.google_engine_id = google_engine_id
        
        self.perplexity_headers = {
            "Authorization": f"Bearer {perplexity_api_key}",
            "Content-Type": "application/json"
        }
        self.openai_headers = {
            "Authorization": f"Bearer {openai_api_key}",
            "Content-Type": "application/json"
        }
        
        # 初始化 Google Custom Search
        self.google_service = build("customsearch", "v1", developerKey=google_api_key)
    
    def search_shrine_info_with_perplexity(self, shrine_name: str, address: str) -> str:
        """使用 Perplexity API 搜尋神社詳細資訊"""
        # 提取地址中的關鍵地理資訊
        city_info = self._extract_location_info(address)
        
        # 強化查詢，明確指定地址位置以區分同名神社
        query = f'"{shrine_name}" "{address}" {city_info} 神社 寺 歷史 參拜時間 祭典 御守 御朱印 交通 最近車站 建築樣式 祭神 文化財'
        
        payload = {
            "model": "sonar",
            "messages": [
                {
                    "role": "system",
                    "content": "你是一位日本神社寺廟專家。請根據搜尋結果提供詳細的神社資訊，包括歷史背景、建築特色、主要神佛、參拜資訊、交通方式、祭典活動、文化財產等。請以繁體中文回答，並盡可能提供準確的資訊。特別注意：日本有很多同名神社，請確認搜尋的是指定地址的神社。"
                },
                {
                    "role": "user",
                    "content": f"請提供關於{shrine_name}的詳細資訊，特別注意這是位於「{address}」的神社（不是其他地區的同名神社）。請包括：1.歷史沿革與創建年份 2.主要祭神與功德 3.建築樣式與文化財產 4.參拜時間與門票費用 5.交通方式與最近車站 6.主要祭典與活動 7.御守與御朱印資訊 8.看點與季節特色 9.便民設施。如果找不到該特定地址的神社資訊，請明確說明。"
                }
            ],
            "max_tokens": 2000,
            "temperature": 0.1
        }
        
        try:
            response = requests.post(
                "https://api.perplexity.ai/chat/completions",
                headers=self.perplexity_headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            if 'choices' in result and len(result['choices']) > 0:
                return result['choices'][0]['message']['content']
            else:
                return "無法獲取詳細資訊"
                
        except Exception as e:
            print(f"Perplexity API 錯誤: {e}")
            return f"搜尋錯誤: {str(e)}"
    
    def search_shrine_info_with_google(self, shrine_name: str, address: str) -> Dict[str, Any]:
        """使用 Google Custom Search API 搜尋神社詳細資訊"""
        # 提取地址中的關鍵地理資訊
        city_info = self._extract_location_info(address)
        
        # 創建多個精確搜尋策略，優先使用完整地址
        queries = [
            f'"{shrine_name}" "{address}"',  # 最精確：神社名稱和完整地址
            f'"{shrine_name}" {city_info}',  # 神社名稱和城市資訊
            f'{shrine_name} {address.split()[0] if address.split() else address}',  # 神社名稱和地址第一部分
            f'{shrine_name} {city_info} 神社',  # 傳統搜尋方式作為備案
        ]
        
        try:
            search_results = []
            combined_content = []
            
            # 嘗試多個搜尋查詢
            for query in queries:
                try:
                    print(f"    → Google 搜尋查詢: {query}")
                    result = self.google_service.cse().list(
                        q=query,
                        cx=self.google_engine_id,
                        num=5,  # 每個查詢獲取5個結果
                        lr='lang_ja',  # 限制日文搜尋
                        hl='ja'
                    ).execute()
                    
                    if 'items' in result:
                        print(f"    → 找到 {len(result['items'])} 個搜尋結果")
                        valid_results = 0
                        for item in result['items']:
                            # 檢查搜尋結果是否與目標地址相關
                            title = item.get('title', '')
                            snippet = item.get('snippet', '')
                            url = item.get('link', '')
                            
                            # 簡單的地址相關性檢查
                            if self._is_relevant_result(title + snippet, address, city_info):
                                search_result = {
                                    "title": title,
                                    "url": url,
                                    "snippet": snippet,
                                    "source": "Google"
                                }
                                search_results.append(search_result)
                                
                                # 組合搜尋內容用於 AI 分析
                                content_piece = f"標題: {title}\n網址: {url}\n摘要: {snippet}\n"
                                combined_content.append(content_piece)
                                valid_results += 1
                        
                        print(f"    → 其中 {valid_results} 個結果與目標地址相關")
                        
                        # 如果找到足夠的相關結果就跳出
                        if valid_results >= 3:
                            break
                    else:
                        print(f"    → 查詢 '{query}' 沒有找到結果")
                        
                except Exception as query_error:
                    print(f"    → 搜尋查詢 '{query}' 失敗: {query_error}")
                    continue
            
            print(f"    → Google 搜尋完成，共獲得 {len(search_results)} 個相關結果")
            return {
                "search_results": search_results,
                "combined_content": "\n".join(combined_content) if combined_content else "未找到相關搜尋結果"
            }
            
        except Exception as e:
            print(f"    → Google Search API 錯誤: {e}")
            return {
                "search_results": [],
                "combined_content": f"Google搜尋錯誤: {str(e)}"
            }
    
    def comprehensive_search(self, shrine_name: str, address: str) -> Dict[str, Any]:
        """綜合搜尋：結合 Perplexity 和 Google Search"""
        print("    → 使用 Perplexity 搜尋...")
        perplexity_info = self.search_shrine_info_with_perplexity(shrine_name, address)
        
        print("    → 使用 Google Search 搜尋...")
        google_results = self.search_shrine_info_with_google(shrine_name, address)
        
        # 組合所有資訊
        combined_info = f"""
=== Perplexity 搜尋結果 ===
{perplexity_info}

=== Google Search 搜尋結果 ===
{google_results['combined_content']}
"""
        
        # 建立來源資訊
        perplexity_sources = [{"title": f"{shrine_name} - Perplexity 綜合資料", "url": "https://perplexity.ai", "snippet": "來自 Perplexity AI 的綜合搜尋結果", "source": "Perplexity"}]
        
        # 確保 Google 搜尋結果被正確處理
        google_sources = google_results['search_results'] if google_results['search_results'] else []
        
        return {
            "combined_info": combined_info,
            "all_sources": perplexity_sources + google_sources
        }
    
    def enhance_description_with_chatgpt(self, raw_info: str, shrine_name: str) -> str:
        """使用 ChatGPT API 潤飾神社介紹"""
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": "你是一位專業的旅遊文案編輯，擅長將神社寺廟的資訊整理成優美、吸引人且資訊豐富的介紹文。請保持資訊的準確性，並使用優雅的繁體中文。"
                },
                {
                    "role": "user",
                    "content": f"請將以下關於{shrine_name}的資訊整理成一段優美、詳細的介紹文字。請保持所有重要資訊，並讓文字更具吸引力和可讀性：\n\n{raw_info}"
                }
            ],
            "max_tokens": 1500,
            "temperature": 0.3
        }
        
        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=self.openai_headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            if 'choices' in result and len(result['choices']) > 0:
                return result['choices'][0]['message']['content'].strip()
            else:
                return raw_info
                
        except Exception as e:
            print(f"OpenAI API 錯誤: {e}")
            return raw_info
    
    def extract_structured_data_with_chatgpt(self, raw_info: str, shrine_name: str, address: str, lat: float, lon: float, phone: str, url: str, sources: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """使用 ChatGPT 從原始資訊中提取結構化資料"""
        
        # 從地址解析縣市資訊
        prefecture = ""
        city = ""
        if "福井県" in address:
            prefecture = "福井県"
            # 提取市町村資訊
            if "市" in address:
                city_part = address.replace("福井県", "").split("市")[0] + "市"
            elif "町" in address:
                city_part = address.replace("福井県", "").split("町")[0] + "町"
            elif "村" in address:
                city_part = address.replace("福井県", "").split("村")[0] + "村"
            else:
                city_part = ""
            city = city_part
        
        # 生成 geohash (簡化版本)
        geohash = self._generate_geohash(lat, lon)
        
        # 處理來源資訊
        if sources is None:
            sources = []
        
        system_prompt = """你是一位資料分析專家，專門從文本中提取結構化資訊。請根據提供的神社資訊，提取並組織成JSON格式的資料。
        
        **重要提醒：日本有很多同名神社位於不同地區，請務必根據提供的具體地址來識別正確的神社。**
        
        請特別注意：
        1. 確認所提取的資訊是針對指定地址的神社，不是其他地區的同名神社
        2. 如果某些資訊在文本中沒有明確提及，請使用合理的預設值或留空字串
        3. 年份請盡量提取，如果不確定請使用 "不明"
        4. 祭神資訊請包含神明名稱和主要功德
        5. 時間資訊請標準化為24小時制格式 (例如: "09:00-17:00")
        6. 費用以日圓計算，免費請填0
        7. 布林值請明確標示 true/false
        8. 陣列如果沒有資訊請使用空陣列 []
        9. 如果搜尋結果與指定地址不符，請在描述中註明
        
        請只回傳JSON格式，不要包含其他文字或說明。"""
        
        # 標準化神社名稱（移除括號內的假名）
        normalized_shrine_name = normalize_shrine_name(shrine_name)
        
        user_prompt = f"""請從以下資訊中提取神社的結構化資料：

神社名稱：{normalized_shrine_name}
原始名稱：{shrine_name}
**目標地址：{address}** (請確認資訊來源是關於此具體地址的神社)
緯度：{lat}
經度：{lon}
電話：{phone}
網址：{url}

詳細資訊：
{raw_info}

參考來源資訊：
{[source['title'] + ' - ' + source['url'] for source in sources][:5]}

**重要：請確認提取的資訊是關於位於「{address}」的{normalized_shrine_name}，而非其他地區的同名神社。**

請提取以下JSON結構的資料：
{{
    "name_jp": "日文名稱",
    "name_en": "英文名稱",
    "romaji": "羅馬拼音",
    "type": "神社或寺",
    "prefecture": "縣名",
    "city": "市町村名",
    "address": "完整地址",
    "lat": 緯度數值,
    "lon": 經度數值,
    "geohash": "geohash字串",
    "nearest_station": "最近車站",
    "access_time_walk": "步行時間",
    "bus_info": "巴士資訊",
    "parking": "停車資訊",
    "founded_year": "創建年份",
    "founder": "創建者",
    "historical_events": ["歷史事件陣列"],
    "important_cultural_property": ["文化財產陣列"],
    "unesco": false,
    "architectural_style": "建築樣式",
    "enshrined_deities": [{{"name": "神明名", "role": "功德"}}],
    "prayer_categories": ["祈願類別陣列"],
    "omamori_types": ["御守種類陣列"],
    "goshuin": true,
    "ceremonies": [{{"name": "儀式名", "reservation_req": true, "fee": 金額}}],
    "gate_open": "開門時間",
    "gate_close": "關門時間",
    "office_hours": "辦公時間",
    "admission_fee": 0,
    "annual_festivals": [{{"name": "祭典名", "date": "日期", "description": "描述"}}],
    "highlights": ["看點陣列"],
    "best_seasons": ["最佳季節陣列"],
    "wheelchair_access": false,
    "toilets": true,
    "wifi": false,
    "photo_policy": "拍照規定",
    "description": "總體描述",
    "phone": "電話號碼",
    "url": "網址",
    "sources": [{{"title": "來源標題", "url": "來源網址", "snippet": "內容摘要", "source": "來源類型"}}]
}}"""
        
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "max_tokens": 2000,
            "temperature": 0.1
        }
        
        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers=self.openai_headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            
            result = response.json()
            if 'choices' in result and len(result['choices']) > 0:
                content = result['choices'][0]['message']['content'].strip()
                # 清理可能的markdown格式
                if content.startswith("```json"):
                    content = content[7:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()
                
                try:
                    structured_data = json.loads(content)
                    # 確保使用標準化的神社名稱
                    if 'name_jp' in structured_data:
                        structured_data['name_jp'] = normalize_shrine_name(structured_data['name_jp'])
                    # 確保 geohash 被正確設定
                    if not structured_data.get('geohash'):
                        structured_data['geohash'] = geohash
                    # 確保來源資訊被正確設定
                    if sources:
                        structured_data['sources'] = sources
                    elif not structured_data.get('sources'):
                        structured_data['sources'] = []
                    return structured_data
                except json.JSONDecodeError as e:
                    print(f"JSON 解析錯誤: {e}")
                    print(f"原始回應: {content}")
                    return self._create_default_structure(shrine_name, address, lat, lon, phone, url, sources)
            else:
                return self._create_default_structure(shrine_name, address, lat, lon, phone, url, sources)
                
        except Exception as e:
            print(f"ChatGPT 結構化提取錯誤: {e}")
            return self._create_default_structure(shrine_name, address, lat, lon, phone, url, sources)
    
    def _generate_geohash(self, lat: float, lon: float, precision: int = 8) -> str:
        """生成簡化版 geohash"""
        # 簡化的 geohash 實作
        lat_str = f"{lat:.6f}"
        lon_str = f"{lon:.6f}"
        combined = f"{lat_str},{lon_str}"
        hash_obj = hashlib.md5(combined.encode())
        return hash_obj.hexdigest()[:precision]
    
    def _extract_location_info(self, address: str) -> str:
        """從地址中提取關鍵地理資訊"""
        import re
        
        # 提取縣
        prefecture = ""
        if "福井県" in address:
            prefecture = "福井県"
        elif "県" in address:
            prefecture_match = re.search(r'([^県]*県)', address)
            if prefecture_match:
                prefecture = prefecture_match.group(1)
        
        # 提取市/町/村
        city = ""
        if "市" in address:
            city_match = re.search(r'([^市]*市)', address)
            if city_match:
                city = city_match.group(1)
        elif "町" in address:
            town_match = re.search(r'([^町]*町)', address)
            if town_match:
                city = town_match.group(1)
        elif "村" in address:
            village_match = re.search(r'([^村]*村)', address)
            if village_match:
                city = village_match.group(1)
        
        # 組合關鍵地理資訊
        location_parts = []
        if prefecture:
            location_parts.append(prefecture)
        if city:
            location_parts.append(city)
        
        return " ".join(location_parts) if location_parts else ""
    
    def _is_relevant_result(self, content: str, target_address: str, city_info: str) -> bool:
        """檢查搜尋結果是否與目標地址相關"""
        content_lower = content.lower()
        target_lower = target_address.lower()
        city_lower = city_info.lower()
        
        # 檢查是否包含目標地址的關鍵詞
        address_keywords = []
        
        # 提取地址中的關鍵詞
        if "福井" in target_address:
            address_keywords.extend(["福井", "fukui"])
        if "市" in target_address:
            city_part = target_address.split("市")[0] + "市"
            if city_part:
                address_keywords.append(city_part.replace("福井県", ""))
        
        # 檢查內容是否包含這些關鍵詞
        relevance_score = 0
        for keyword in address_keywords:
            if keyword.lower() in content_lower:
                relevance_score += 1
        
        # 如果包含至少一個地址關鍵詞，認為是相關的
        return relevance_score > 0 or city_lower in content_lower
    
    def _create_default_structure(self, name: str, address: str, lat: float, lon: float, phone: str, url: str, sources: List[Dict[str, str]] = None) -> Dict[str, Any]:
        """創建預設的資料結構"""
        # 從地址解析縣市資訊
        prefecture = ""
        city = ""
        if "福井県" in address:
            prefecture = "福井県"
            if "市" in address:
                city = address.replace("福井県", "").split("市")[0] + "市"
            elif "町" in address:
                city = address.replace("福井県", "").split("町")[0] + "町"
            elif "村" in address:
                city = address.replace("福井県", "").split("村")[0] + "村"
        
        # 處理來源資訊
        if sources is None:
            sources = []
        
        return {
            "name_jp": normalize_shrine_name(name),
            "name_en": "",
            "romaji": "",
            "type": "神社" if "神社" in name else "寺",
            "prefecture": prefecture,
            "city": city,
            "address": address,
            "lat": lat,
            "lon": lon,
            "geohash": self._generate_geohash(lat, lon),
            "nearest_station": "",
            "access_time_walk": "",
            "bus_info": "",
            "parking": "",
            "founded_year": "不明",
            "founder": "",
            "historical_events": [],
            "important_cultural_property": [],
            "unesco": False,
            "architectural_style": "",
            "enshrined_deities": [],
            "prayer_categories": [],
            "omamori_types": [],
            "goshuin": True,
            "ceremonies": [],
            "gate_open": "",
            "gate_close": "",
            "office_hours": "",
            "admission_fee": 0,
            "annual_festivals": [],
            "highlights": [],
            "best_seasons": ["春", "夏", "秋", "冬"],
            "wheelchair_access": False,
            "toilets": True,
            "wifi": False,
            "photo_policy": "一般允許",
            "description": "",
            "phone": phone,
            "url": url,
            "sources": sources
        }

def load_shrine_data(csv_path: str) -> pd.DataFrame:
    """載入神社資料"""
    try:
        df = pd.read_csv(csv_path)
        print(f"成功載入 {len(df)} 筆神社資料")
        return df
    except Exception as e:
        print(f"載入資料錯誤: {e}")
        return pd.DataFrame()

def process_shrines(csv_path: str, output_path: str, num_shrines: Optional[int] = None) -> List[Dict[str, Any]]:
    """處理神社資料並產生增強版本（支援增量更新）"""
    
    # 載入 CSV 資料
    df = load_shrine_data(csv_path)
    if df.empty:
        return []
    
    # 載入現有的 JSON 資料
    print("📂 檢查現有 JSON 資料...")
    existing_data = load_existing_json(output_path)
    processed_shrines = get_processed_shrines(existing_data)
    print(f"🔍 已處理神社: {len(processed_shrines)} 筆")
    
    # 初始化增強器
    enhancer = ShrineDataEnhancer(PERPLEXITY_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, GOOGLE_ENGINE_ID)
    
    # 決定處理數量
    total_shrines = len(df)
    if num_shrines is None:
        num_shrines = total_shrines
    else:
        num_shrines = min(num_shrines, total_shrines)
    
    print(f"🚀 開始處理 {num_shrines} 筆神社資料（總共 {total_shrines} 筆）")
    print(f"💡 將跳過已處理的神社，只處理新資料")
    
    # 計數器
    processed_count = 0
    skipped_count = 0
    new_data_count = 0
    
    # 處理資料
    for idx in range(num_shrines):
        row = df.iloc[idx]
        shrine_name = row['神社名稱']
        address = row['住所']
        lat = float(row['緯度']) if pd.notna(row['緯度']) else 0.0
        lon = float(row['経度']) if pd.notna(row['経度']) else 0.0
        phone = row['電話番号'] if pd.notna(row['電話番号']) else ""
        url = row['URL'] if pd.notna(row['URL']) else ""
        
        # 檢查是否已處理過（使用地址作為唯一識別）
        if address in processed_shrines:
            print(f"⏭️  第 {idx + 1}/{num_shrines} 筆: {shrine_name} - 已處理，跳過")
            skipped_count += 1
            continue
        
        print(f"\n🔄 處理第 {idx + 1}/{num_shrines} 筆: {shrine_name}")
        print(f"  📍 目標地址: {address}")
        
        try:
            # 1. 使用綜合搜尋（Perplexity + Google Search）
            print("  → 綜合搜尋詳細資訊（注重地址精確性）...")
            search_results = enhancer.comprehensive_search(shrine_name, address)
            combined_info = search_results['combined_info']
            all_sources = search_results['all_sources']
            
            # 2. 使用 ChatGPT 潤飾描述
            print("  → 潤飾描述...")
            enhanced_description = enhancer.enhance_description_with_chatgpt(combined_info, shrine_name)
            
            # 3. 提取結構化資料
            print("  → 提取結構化資料...")
            structured_data = enhancer.extract_structured_data_with_chatgpt(
                combined_info, shrine_name, address, lat, lon, phone, url, all_sources
            )
            
            # 4. 更新描述
            structured_data['description'] = enhanced_description
            
            # 5. 立即儲存到 JSON 檔案
            print("  → 儲存資料...")
            existing_data = save_single_shrine_incrementally(structured_data, output_path, existing_data)
            
            # 更新已處理清單
            processed_shrines.add(address)
            processed_count += 1
            new_data_count += 1
            
            print(f"  ✅ 完成並儲存 ({processed_count} 筆新增, {skipped_count} 筆跳過)")
            
        except Exception as e:
            print(f"  ❌ 處理 {shrine_name} 時發生錯誤: {e}")
            continue
        
        # 避免 API 限制，加入延遲
        print(f"  ⏳ 等待中...")
        time.sleep(1)  # 縮短等待時間
    
    print(f"\n🎉 處理完成！")
    print(f"📊 統計資訊:")
    print(f"  - 新增處理: {new_data_count} 筆")
    print(f"  - 跳過已處理: {skipped_count} 筆") 
    print(f"  - 總計資料: {len(existing_data)} 筆")
    
    return existing_data

def load_existing_json(output_path: str) -> List[Dict[str, Any]]:
    """載入現有的 JSON 檔案"""
    try:
        if os.path.exists(output_path):
            with open(output_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            print(f"✅ 載入現有資料: {len(data)} 筆")
            return data
        else:
            print("📝 檔案不存在，將建立新檔案")
            return []
    except Exception as e:
        print(f"❌ 載入現有檔案錯誤: {e}")
        return []

def save_to_json(data: List[Dict[str, Any]], output_path: str):
    """儲存為 JSON 檔案"""
    try:
        # 確保輸出目錄存在
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"💾 資料已儲存至: {output_path}")
    except Exception as e:
        print(f"❌ 儲存錯誤: {e}")

def save_single_shrine_incrementally(shrine_data: Dict[str, Any], output_path: str, existing_data: List[Dict[str, Any]]):
    """增量儲存單筆神社資料"""
    try:
        # 檢查是否已存在相同神社（根據地址判斷）
        shrine_address = shrine_data.get('address', '')
        
        # 更新現有資料或新增
        updated = False
        for i, existing_shrine in enumerate(existing_data):
            if existing_shrine.get('address') == shrine_address:
                existing_data[i] = shrine_data
                updated = True
                break
        
        if not updated:
            existing_data.append(shrine_data)
        
        # 立即儲存到檔案
        save_to_json(existing_data, output_path)
        
        return existing_data
    except Exception as e:
        print(f"❌ 增量儲存錯誤: {e}")
        return existing_data

def get_processed_shrines(existing_data: List[Dict[str, Any]]) -> set:
    """取得已處理的神社清單（根據地址作為唯一識別）"""
    processed = set()
    for shrine in existing_data:
        address = shrine.get('address', '')
        if address:
            processed.add(address)  # 使用完整地址作為唯一識別符
    return processed

def normalize_shrine_name(name: str) -> str:
    """標準化神社名稱，移除括號內的假名"""
    import re
    # 移除括號和括號內的內容
    normalized = re.sub(r'（[^）]*）', '', name)
    normalized = re.sub(r'\([^)]*\)', '', normalized)
    return normalized.strip()

if __name__ == "__main__":
    # 設定路徑
    csv_path = "/Users/zhuboyuan/Desktop/University-NCHU/NCHU-Project/Project-FUKUI/src/src-LLM-Shrine/data/shrines_detail.csv"
    output_path = "/Users/zhuboyuan/Desktop/University-NCHU/NCHU-Project/Project-FUKUI/src/src-LLM-Shrine/output/enhanced_shrines_full.json"
    
    print("🏯 福井神社資料增強程式")
    print("=" * 50)
    print("🔍 使用 Perplexity API 進行智能搜尋")
    print("🌐 使用 Google Custom Search 進行網路搜尋")
    print("🤖 使用 GPT-4o-mini 進行資料潤飾和結構化")
    print("📚 包含完整來源網址追溯功能")
    print("💾 支援增量更新，每筆資料處理完立即儲存")
    print()
    
    # 處理所有神社資料（不限制數量）
    enhanced_data = process_shrines(csv_path, output_path, num_shrines=None)
    
    if enhanced_data:
        # 顯示範例
        print(f"\n📊 處理完成！共增強 {len(enhanced_data)} 筆神社資料")
        print("\n📋 範例資料結構:")
        if enhanced_data:
            sample = enhanced_data[0]
            for key, value in list(sample.items())[:10]:  # 只顯示前10個欄位
                print(f"  {key}: {value}")
            print("  ...")
            
        print(f"\n📁 完整資料已儲存至: {output_path}")
        print("🎯 可用於前端介面的 JSON 格式已準備完成")
            
    else:
        print("❌ 沒有處理任何資料")
