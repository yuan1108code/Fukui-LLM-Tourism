#!/usr/bin/env python3
"""
分析 fukui_enhanced_locations.json 中所有的 types 標籤
"""

import json
from collections import Counter
import sys

def analyze_types(file_path):
    """分析 JSON 檔案中的所有 types 標籤"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        all_types = []
        locations_with_types = 0
        total_locations = len(data)
        
        print(f"📊 分析 {total_locations} 個景點的 types 標籤\n")
        
        for location in data:
            google_data = location.get('google_maps_data', {})
            if 'types' in google_data and google_data['types']:
                types = google_data['types']
                all_types.extend(types)
                locations_with_types += 1
                
                # 顯示每個景點的名稱和 types
                name = google_data.get('name', location.get('original_data', {}).get('location', '未知'))
                print(f"📍 {name}: {types}")
        
        print(f"\n💡 統計摘要:")
        print(f"   - 總景點數: {total_locations}")
        print(f"   - 有 types 資料的景點: {locations_with_types}")
        print(f"   - 無 types 資料的景點: {total_locations - locations_with_types}")
        
        if all_types:
            # 統計每個 type 的出現次數
            type_counter = Counter(all_types)
            unique_types = set(all_types)
            
            print(f"\n🏷️ 所有不同的 types 標籤 (共 {len(unique_types)} 種):")
            print("=" * 60)
            
            for i, type_tag in enumerate(sorted(unique_types), 1):
                count = type_counter[type_tag]
                print(f"{i:2d}. {type_tag:<30} (出現 {count} 次)")
                
            print(f"\n📈 最常見的 5 個 types 標籤:")
            print("-" * 40)
            for type_tag, count in type_counter.most_common(5):
                print(f"   {type_tag}: {count} 次")
                
        else:
            print("\n⚠️  沒有找到任何 types 資料")
            
    except FileNotFoundError:
        print(f"❌ 檔案不存在: {file_path}")
    except json.JSONDecodeError as e:
        print(f"❌ JSON 解析錯誤: {e}")
    except Exception as e:
        print(f"❌ 發生錯誤: {e}")

if __name__ == "__main__":
    file_path = "/Users/zhuboyuan/Desktop/University-NCHU/NCHU-Project/Project-FUKUI/src/src-LLM-Shrine/output/fukui_enhanced_locations.json"
    analyze_types(file_path)
