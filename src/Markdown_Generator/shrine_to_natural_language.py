#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
神社資料轉換為自然語言描述的程式
將 enhanced_shrines.json 轉換為 Markdown 格式的自然語言描述
"""

import json
import os
from typing import Dict, List, Any
from datetime import datetime

def load_shrines_data(file_path: str) -> List[Dict[str, Any]]:
    """載入神社JSON資料"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"成功載入 {len(data)} 座神社的資料")
        return data
    except Exception as e:
        print(f"載入資料時發生錯誤: {e}")
        return []

def format_deities(deities: List[Dict[str, str]]) -> str:
    """格式化祭祀神明資訊"""
    if not deities or not deities[0].get('name'):
        return ""
    
    deity_descriptions = []
    for deity in deities:
        if deity.get('name'):
            if deity.get('role'):
                deity_descriptions.append(f"{deity['name']}（{deity['role']}）")
            else:
                deity_descriptions.append(deity['name'])
    
    if deity_descriptions:
        return f"，主要祭祀{' 、 '.join(deity_descriptions)}"
    return ""

def format_festivals(festivals: List[Dict[str, str]]) -> str:
    """格式化年度祭典資訊"""
    if not festivals:
        return ""
    
    festival_texts = []
    for festival in festivals:
        if festival.get('name'):
            date_info = f"（{festival['date']}）" if festival.get('date') else ""
            desc_info = f"：{festival['description']}" if festival.get('description') else ""
            festival_texts.append(f"{festival['name']}{date_info}{desc_info}")
    
    if festival_texts:
        return f"神社每年舉辦的重要祭典包括{'、'.join(festival_texts)}。"
    return ""

def format_historical_events(events: List[str]) -> str:
    """格式化歷史事件資訊"""
    if not events:
        return ""
    
    return f"重要歷史事件包括：{'；'.join(events)}。"

def format_highlights_and_seasons(highlights: List[str], seasons: List[str]) -> str:
    """格式化景點特色和最佳季節"""
    text = ""
    
    if highlights:
        text += f"神社的特色景觀包括{' 、 '.join(highlights)}。"
    
    if seasons:
        text += f"最佳參訪季節為{' 、 '.join(seasons)}。"
    
    return text

def format_practical_info(shrine: Dict[str, Any]) -> str:
    """格式化實用資訊"""
    info_parts = []
    
    # 開放時間
    if shrine.get('gate_open') and shrine.get('gate_close'):
        if shrine['gate_open'] != "不明" and shrine['gate_close'] != "不明":
            info_parts.append(f"開放時間為{shrine['gate_open']}至{shrine['gate_close']}")
    
    # 入場費
    if shrine.get('admission_fee') == 0:
        info_parts.append("免費參拜")
    elif shrine.get('admission_fee'):
        info_parts.append(f"參拜費用{shrine['admission_fee']}日圓")
    
    # 交通資訊
    if shrine.get('nearest_station'):
        info_parts.append(f"最近車站為{shrine['nearest_station']}")
    
    # 停車場
    if shrine.get('parking') and shrine['parking'] != "":
        if shrine['parking'] == "有":
            info_parts.append("設有停車場")
        elif shrine['parking'] != "不明":
            info_parts.append(f"停車資訊：{shrine['parking']}")
    
    # 便民設施
    facilities = []
    if shrine.get('toilets'):
        facilities.append("洗手間")
    if shrine.get('wifi'):
        facilities.append("無線網路")
    if shrine.get('goshuin'):
        facilities.append("御朱印服務")
    
    if facilities:
        info_parts.append(f"設施包括{' 、 '.join(facilities)}")
    
    # 御守類型
    if shrine.get('omamori_types'):
        info_parts.append(f"提供{' 、 '.join(shrine['omamori_types'])}等御守")
    
    if info_parts:
        return f"實用資訊：{'，'.join(info_parts)}。"
    return ""

def convert_shrine_to_natural_language(shrine: Dict[str, Any]) -> str:
    """將單一神社資料轉換為自然語言描述"""
    
    # 基本資訊
    name_jp = shrine.get('name_jp', '不明神社')
    romaji = shrine.get('romaji', '')
    city = shrine.get('city', '')
    prefecture = shrine.get('prefecture', '')
    address = shrine.get('address', '')
    
    # 建構基本描述
    description_parts = []
    
    # 標題和位置
    location_text = f"位於{prefecture}{city}的" if prefecture and city else ""
    romaji_text = f"（羅馬拼音：{romaji}）" if romaji else ""
    description_parts.append(f"{location_text}{name_jp}{romaji_text}")
    
    # 地址
    if address:
        description_parts.append(f"，地址為{address}")
    
    # 創建年份和創立者
    history_info = []
    if shrine.get('founded_year') and shrine['founded_year'] != "不明":
        history_info.append(f"創建於{shrine['founded_year']}年")
    if shrine.get('founder'):
        history_info.append(f"由{shrine['founder']}所創立")
    
    if history_info:
        description_parts.append(f"，{'，'.join(history_info)}")
    
    # 祭祀神明
    deities_text = format_deities(shrine.get('enshrined_deities', []))
    if deities_text:
        description_parts.append(deities_text)
    
    description_parts.append("。")
    
    # 建築風格
    if shrine.get('architectural_style'):
        description_parts.append(f"神社採用{shrine['architectural_style']}風格。")
    
    # 歷史事件
    historical_text = format_historical_events(shrine.get('historical_events', []))
    if historical_text:
        description_parts.append(historical_text)
    
    # 年度祭典
    festivals_text = format_festivals(shrine.get('annual_festivals', []))
    if festivals_text:
        description_parts.append(festivals_text)
    
    # 景點特色和季節
    highlights_text = format_highlights_and_seasons(
        shrine.get('highlights', []), 
        shrine.get('best_seasons', [])
    )
    if highlights_text:
        description_parts.append(highlights_text)
    
    # 實用資訊
    practical_text = format_practical_info(shrine)
    if practical_text:
        description_parts.append(practical_text)
    
    # 使用既有的描述（如果有的話）
    if shrine.get('description'):
        description_parts.append(f"\n\n詳細描述：{shrine['description']}")
    
    # 聯絡資訊
    contact_info = []
    if shrine.get('phone'):
        contact_info.append(f"電話：{shrine['phone']}")
    if shrine.get('url'):
        contact_info.append(f"官方網站：{shrine['url']}")
    
    if contact_info:
        description_parts.append(f"\n\n聯絡資訊：{'，'.join(contact_info)}")
    
    return ''.join(description_parts)

def save_as_markdown(shrines: List[Dict[str, Any]], output_path: str) -> None:
    """將轉換後的資料儲存為Markdown檔案"""
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            # 寫入標題
            f.write("# 福井縣神社自然語言描述資料庫\n\n")
            f.write(f"*生成日期：{datetime.now().strftime('%Y年%m月%d日')}*\n\n")
            f.write(f"本文件包含{len(shrines)}座福井縣神社的詳細自然語言描述，適用於向量資料庫索引。\n\n")
            f.write("---\n\n")
            
            # 轉換每座神社
            for i, shrine in enumerate(shrines, 1):
                print(f"正在轉換第 {i}/{len(shrines)} 座神社: {shrine.get('name_jp', '未知神社')}")
                
                # 神社標題
                f.write(f"## {i}. {shrine.get('name_jp', '未知神社')}\n\n")
                
                # 基本資訊表格
                f.write("### 基本資訊\n\n")
                f.write("| 項目 | 內容 |\n")
                f.write("|------|------|\n")
                f.write(f"| 神社名稱 | {shrine.get('name_jp', '')} |\n")
                f.write(f"| 羅馬拼音 | {shrine.get('romaji', '')} |\n")
                f.write(f"| 所在地 | {shrine.get('prefecture', '')}{shrine.get('city', '')} |\n")
                f.write(f"| 地址 | {shrine.get('address', '')} |\n")
                f.write(f"| 創建年份 | {shrine.get('founded_year', '不明')} |\n")
                f.write(f"| 創立者 | {shrine.get('founder', '不明')} |\n")
                
                # 自然語言描述
                f.write("\n### 詳細描述\n\n")
                natural_description = convert_shrine_to_natural_language(shrine)
                f.write(natural_description)
                f.write("\n\n")
                
                # 標籤（用於向量搜尋）
                tags = []
                if shrine.get('city'):
                    tags.append(shrine['city'])
                if shrine.get('type'):
                    tags.append(shrine['type'])
                if shrine.get('enshrined_deities'):
                    for deity in shrine['enshrined_deities']:
                        if deity.get('name'):
                            tags.append(deity['name'])
                if shrine.get('best_seasons'):
                    tags.extend(shrine['best_seasons'])
                if shrine.get('highlights'):
                    tags.extend(shrine['highlights'])
                
                if tags:
                    f.write(f"**關鍵標籤：** {' | '.join(set(tags))}\n\n")
                
                f.write("---\n\n")
        
        print(f"成功將{len(shrines)}座神社的資料轉換並儲存至: {output_path}")
        
    except Exception as e:
        print(f"儲存檔案時發生錯誤: {e}")

def main():
    """主程式"""
    print("=== 福井縣神社資料自然語言轉換程式 ===")
    
    # 檔案路徑設定
    input_file = "/Users/zhuboyuan/Desktop/University-NCHU/NCHU-Project/Project-FUKUI/src/src-LLM-Shrine/output/enhanced_shrines_full.json"
    output_file = "/Users/zhuboyuan/Desktop/University-NCHU/NCHU-Project/Project-FUKUI/src/src-LLM-Shrine/output/shrines_natural_language.md"
    
    # 檢查輸入檔案是否存在
    if not os.path.exists(input_file):
        print(f"錯誤：找不到輸入檔案 {input_file}")
        return
    
    # 載入資料
    shrines_data = load_shrines_data(input_file)
    if not shrines_data:
        print("沒有找到神社資料，程式結束")
        return
    
    # 建立輸出目錄
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # 轉換並儲存
    save_as_markdown(shrines_data, output_file)
    
    print("轉換完成！")
    print(f"輸出檔案：{output_file}")

if __name__ == "__main__":
    main()
