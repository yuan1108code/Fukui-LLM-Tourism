#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
景點資料轉換為自然語言描述的程式
將 fukui_enhanced_locations.json 轉換為 Markdown 格式的自然語言描述
"""

import json
import os
from typing import Dict, List, Any, Optional
from datetime import datetime

def load_locations_data(file_path: str) -> List[Dict[str, Any]]:
    """載入景點JSON資料"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"成功載入 {len(data)} 個景點的資料")
        return data
    except Exception as e:
        print(f"載入資料時發生錯誤: {e}")
        return []

def format_rating_info(rating: Optional[float], total_ratings: Optional[int]) -> str:
    """格式化評分資訊"""
    if rating and total_ratings:
        return f"在Google Maps上獲得{rating}星評價（共{total_ratings}個評分）"
    elif rating:
        return f"在Google Maps上獲得{rating}星評價"
    else:
        return ""

def format_opening_hours(opening_hours: Optional[Dict]) -> str:
    """格式化營業時間"""
    if not opening_hours:
        return ""
    
    if opening_hours.get('weekday_text'):
        # 檢查是否24小時營業
        weekday_text = opening_hours['weekday_text']
        if any('24 時間営業' in day for day in weekday_text):
            return "全年24小時開放"
        elif weekday_text:
            # 取第一天的營業時間作為代表
            first_day = weekday_text[0]
            if '：' in first_day:
                time_part = first_day.split('：', 1)[1]
                return f"營業時間：{time_part}"
    
    if opening_hours.get('open_now'):
        return "目前營業中"
    
    return ""

def format_reviews(reviews: List[Dict]) -> str:
    """格式化遊客評論"""
    if not reviews:
        return ""
    
    review_texts = []
    for review in reviews[:3]:  # 只取前三個評論
        if review.get('text') and review.get('author_name'):
            rating_text = f"（{review['rating']}星）" if review.get('rating') else ""
            clean_text = review['text'].replace('\n', ' ').strip()
            # 限制評論長度
            if len(clean_text) > 100:
                clean_text = clean_text[:97] + "..."
            review_texts.append(f"{review['author_name']}{rating_text}：「{clean_text}」")
    
    if review_texts:
        return f"遊客評論包括：{'；'.join(review_texts)}。"
    return ""

def format_contact_info(location_data: Dict) -> str:
    """格式化聯絡資訊"""
    contact_parts = []
    
    if location_data.get('phone_number'):
        contact_parts.append(f"電話：{location_data['phone_number']}")
    
    if location_data.get('website'):
        contact_parts.append(f"官方網站：{location_data['website']}")
    
    if contact_parts:
        return f"聯絡資訊：{'，'.join(contact_parts)}"
    
    return ""

def extract_location_features(name: str, address: str) -> List[str]:
    """從名稱和地址中提取景點特色關鍵字"""
    features = []
    
    # 景點類型關鍵字
    type_keywords = {
        '海岸': ['海岸', '海', '海水浴場', '海灘'],
        '山': ['山', '峠', '峰', '岳'],
        '溫泉': ['溫泉', '湯'],
        '城': ['城', '城址', '城跡'],
        '寺院': ['寺', '院', '庵'],
        '神社': ['神社', '大社', '宮'],
        '博物館': ['博物館', '資料館', '記念館'],
        '公園': ['公園', '庭園'],
        '道路站': ['道の駅', '道路休息站'],
        '滑雪場': ['スキー場', '滑雪場'],
        '瀑布': ['滝', '瀑布'],
        '湖': ['湖', '池', '沼'],
        '橋': ['橋', 'はし'],
        '市場': ['市場', '市', 'センター'],
        '水族館': ['水族館'],
        '動物園': ['動物園'],
        '展示館': ['展示館', '會館']
    }
    
    text_to_check = f"{name} {address}".lower()
    
    for feature_type, keywords in type_keywords.items():
        for keyword in keywords:
            if keyword.lower() in text_to_check:
                features.append(feature_type)
                break
    
    return list(set(features))  # 去重

def convert_location_to_natural_language(location: Dict[str, Any]) -> str:
    """將單一景點資料轉換為自然語言描述"""
    
    original_data = location.get('original_data', {})
    google_data = location.get('google_maps_data', {})
    
    # 基本資訊
    name = google_data.get('name') or original_data.get('location', '未知景點')
    address = google_data.get('formatted_address', '')
    city = original_data.get('city', '')
    
    # 建構描述
    description_parts = []
    
    # 標題和位置
    if city and city in address:
        description_parts.append(f"{name}位於{address}")
    elif city:
        description_parts.append(f"{name}位於{city}，地址為{address}")
    else:
        description_parts.append(f"{name}位於{address}")
    
    # 評分資訊
    rating_info = format_rating_info(
        google_data.get('rating'), 
        google_data.get('user_ratings_total')
    )
    if rating_info:
        description_parts.append(f"，{rating_info}")
    
    description_parts.append("。")
    
    # 營業時間
    hours_info = format_opening_hours(google_data.get('opening_hours'))
    if hours_info:
        description_parts.append(f"{hours_info}。")
    
    # 景點特色（從名稱和地址推斷）
    features = extract_location_features(name, address)
    if features:
        if len(features) == 1:
            description_parts.append(f"這是一個{features[0]}類型的景點。")
        else:
            description_parts.append(f"這個景點結合了{' 、 '.join(features)}等特色。")
    
    # 遊客評論
    reviews_text = format_reviews(google_data.get('reviews', []))
    if reviews_text:
        description_parts.append(reviews_text)
    
    # 聯絡資訊
    contact_text = format_contact_info(google_data)
    if contact_text:
        description_parts.append(f"{contact_text}。")
    
    # 照片資訊
    if google_data.get('photos'):
        photo_count = len(google_data['photos'])
        description_parts.append(f"Google Maps上提供{photo_count}張照片供參考。")
    
    return ''.join(description_parts)

def save_as_markdown(locations: List[Dict[str, Any]], output_path: str) -> None:
    """將轉換後的資料儲存為Markdown檔案"""
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            # 寫入標題
            f.write("# 福井縣景點自然語言描述資料庫\n\n")
            f.write(f"*生成日期：{datetime.now().strftime('%Y年%m月%d日')}*\n\n")
            f.write(f"本文件包含{len(locations)}個福井縣景點的詳細自然語言描述，適用於向量資料庫索引。\n\n")
            f.write("---\n\n")
            
            # 轉換每個景點
            for i, location in enumerate(locations, 1):
                original_data = location.get('original_data', {})
                google_data = location.get('google_maps_data', {})
                name = google_data.get('name') or original_data.get('location', f'景點{i}')
                
                print(f"正在轉換第 {i}/{len(locations)} 個景點: {name}")
                
                # 景點標題
                f.write(f"## {i}. {name}\n\n")
                
                # 基本資訊表格
                f.write("### 基本資訊\n\n")
                f.write("| 項目 | 內容 |\n")
                f.write("|------|------|\n")
                f.write(f"| 景點名稱 | {name} |\n")
                f.write(f"| 所在城市 | {original_data.get('city', '')} |\n")
                f.write(f"| 地址 | {google_data.get('formatted_address', '')} |\n")
                
                rating = google_data.get('rating')
                total_ratings = google_data.get('user_ratings_total')
                if rating:
                    rating_text = f"{rating}星"
                    if total_ratings:
                        rating_text += f"（{total_ratings}評分）"
                    f.write(f"| Google評分 | {rating_text} |\n")
                
                f.write(f"| 電話 | {google_data.get('phone_number', '無')} |\n")
                f.write(f"| 網站 | {google_data.get('website', '無')} |\n")
                
                # 座標資訊
                if original_data.get('latitude') and original_data.get('longitude'):
                    f.write(f"| 座標 | {original_data['latitude']}, {original_data['longitude']} |\n")
                
                # 自然語言描述
                f.write("\n### 詳細描述\n\n")
                natural_description = convert_location_to_natural_language(location)
                f.write(natural_description)
                f.write("\n\n")
                
                # 營業時間詳細資訊
                opening_hours = google_data.get('opening_hours')
                if opening_hours and opening_hours.get('weekday_text'):
                    f.write("### 營業時間\n\n")
                    for day in opening_hours['weekday_text']:
                        f.write(f"- {day}\n")
                    f.write("\n")
                
                # 遊客評論
                reviews = google_data.get('reviews', [])
                if reviews:
                    f.write("### 遊客評論精選\n\n")
                    for j, review in enumerate(reviews[:5], 1):  # 只顯示前5個評論
                        if review.get('text'):
                            author = review.get('author_name', f'遊客{j}')
                            rating = f"★ {review['rating']}" if review.get('rating') else ""
                            text = review['text'].replace('\n', ' ').strip()
                            f.write(f"**{author}** {rating}  \n")
                            f.write(f"{text}\n\n")
                
                # 標籤（用於向量搜尋）
                tags = []
                if original_data.get('city'):
                    tags.append(original_data['city'])
                
                # 從名稱和地址提取特色標籤
                features = extract_location_features(name, google_data.get('formatted_address', ''))
                tags.extend(features)
                
                # 從評論中提取關鍵詞
                if reviews:
                    for review in reviews[:3]:
                        text = review.get('text', '').lower()
                        if '美しい' in text or '美麗' in text:
                            tags.append('美景')
                        if 'おすすめ' in text or '推薦' in text:
                            tags.append('推薦景點')
                        if '家族' in text or '家庭' in text:
                            tags.append('適合家庭')
                
                if tags:
                    f.write(f"**關鍵標籤：** {' | '.join(set(tags))}\n\n")
                
                f.write("---\n\n")
        
        print(f"成功將{len(locations)}個景點的資料轉換並儲存至: {output_path}")
        
    except Exception as e:
        print(f"儲存檔案時發生錯誤: {e}")

def main():
    """主程式"""
    print("=== 福井縣景點資料自然語言轉換程式 ===")
    
    # 檔案路徑設定
    input_file = "output/fukui_enhanced_locations.json"
    output_file = "output/locations_natural_language.md"
    
    # 檢查輸入檔案是否存在
    if not os.path.exists(input_file):
        print(f"錯誤：找不到輸入檔案 {input_file}")
        return
    
    # 載入資料
    locations_data = load_locations_data(input_file)
    if not locations_data:
        print("沒有找到景點資料，程式結束")
        return
    
    # 建立輸出目錄
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # 轉換並儲存
    save_as_markdown(locations_data, output_file)
    
    print("轉換完成！")
    print(f"輸出檔案：{output_file}")

if __name__ == "__main__":
    main()
