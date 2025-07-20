#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
測試地理位置感知搜尋功能
"""

import os
import sys
from pathlib import Path

# 加入專案根目錄到 Python 路徑
project_root = Path(__file__).parent
sys.path.append(str(project_root))

from src.Vector_Database.ChromaDB_v1 import ChromaDBManager

def test_location_aware_search():
    """測試地理位置感知搜尋功能"""
    try:
        print("🚀 初始化 ChromaDB 管理器...")
        chroma_manager = ChromaDBManager()
        
        # 測試查詢，包含地點名稱
        test_queries = [
            "福井市有什麼推薦的景點？",
            "推薦一些大野市的觀光地點",
            "坂井市有哪些值得參觀的地方？",
            "小濱市的景點推薦",
            "永平寺附近有什麼可以參觀的？"
        ]
        
        print("\n🧪 測試地理位置感知搜尋...")
        for query in test_queries:
            print(f"\n{'='*60}")
            print(f"🔍 查詢：{query}")
            print(f"{'='*60}")
            
            # 使用地理位置感知搜尋
            results = chroma_manager.search_similar_with_location(query, n_results=5)
            
            if results:
                print(f"📍 找到 {len(results)} 個相關結果：")
                for i, result in enumerate(results, 1):
                    metadata = result['metadata']
                    city = metadata.get('city', '未知城市')
                    title = metadata.get('title', '未知景點')
                    location_score = result.get('location_score', 0)
                    distance = result.get('distance', 0)
                    
                    print(f"\n{i}. **{title}** (城市: {city})")
                    print(f"   地理位置得分: {location_score:.3f}")
                    print(f"   語義相似度: {1-distance:.3f}")
                    print(f"   內容摘要: {result['content'][:100]}...")
                    
                # 測試 GPT 回答
                print(f"\n🤖 GPT 回答:")
                answer = chroma_manager.ask_gpt(query, results, use_location_aware_search=False)
                print(answer)
                
            else:
                print("❌ 沒有找到相關結果")
            
            print(f"{'='*60}")
            input("按 Enter 鍵繼續下一個測試...")
            
    except Exception as e:
        print(f"❌ 測試過程中發生錯誤：{e}")
        import traceback
        traceback.print_exc()

def test_distance_calculation():
    """測試距離計算功能"""
    print("\n🧮 測試距離計算功能...")
    
    # 福井市中心
    fukui_lat, fukui_lng = 36.0642, 136.2206
    # 大野市中心  
    ono_lat, ono_lng = 35.9789, 136.4858
    
    distance = ChromaDBManager.calculate_distance(
        fukui_lat, fukui_lng, ono_lat, ono_lng
    )
    
    print(f"福井市到大野市的距離: {distance:.2f} 公里")
    
    # 測試同城市距離（應該很近）
    distance_same_city = ChromaDBManager.calculate_distance(
        fukui_lat, fukui_lng, fukui_lat + 0.01, fukui_lng + 0.01
    )
    
    print(f"福井市內兩點距離: {distance_same_city:.2f} 公里")

if __name__ == "__main__":
    print("🧪 開始測試地理位置感知搜尋功能")
    
    # 測試距離計算
    test_distance_calculation()
    
    # 測試地理位置感知搜尋
    test_location_aware_search()
    
    print("\n✅ 測試完成！")
