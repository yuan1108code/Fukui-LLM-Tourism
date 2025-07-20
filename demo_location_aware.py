#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
地理位置感知搜尋功能演示
展示如何使用新的地理位置感知搜尋來獲得更好的景點推薦
"""

import os
import sys
from pathlib import Path

# 加入專案根目錄到 Python 路徑
project_root = Path(__file__).parent
sys.path.append(str(project_root))

def demonstrate_location_awareness():
    """演示地理位置感知搜尋的效果"""
    
    print("🌟 地理位置感知搜尋功能演示")
    print("="*50)
    
    try:
        from src.Vector_Database.ChromaDB_v1 import ChromaDBManager
        
        print("🚀 初始化 ChromaDB 管理器...")
        chroma_manager = ChromaDBManager()
        
        # 測試查詢範例
        test_queries = [
            "福井市有什麼推薦的景點？",
            "大野市有哪些值得參觀的地方？"
        ]
        
        for query in test_queries:
            print(f"\n{'='*60}")
            print(f"🔍 查詢: {query}")
            print(f"{'='*60}")
            
            print("\n📍 地理位置感知搜尋結果:")
            # 使用地理位置感知搜尋
            location_results = chroma_manager.search_similar_with_location(query, n_results=3)
            
            for i, result in enumerate(location_results, 1):
                metadata = result['metadata']
                city = metadata.get('city', '未知')
                title = metadata.get('title', '未知景點')
                location_score = result.get('location_score', 0)
                
                print(f"{i}. **{title}** (城市: {city})")
                print(f"   地理位置得分: {location_score:.3f}")
                print(f"   內容摘要: {result['content'][:80]}...")
                print()
            
            print("🤖 GPT 推薦 (考慮地理位置):")
            print("-" * 40)
            
            # 使用地理位置感知的 GPT 回答
            answer = chroma_manager.ask_gpt(query, location_results, use_location_aware_search=False)
            print(answer[:500] + "..." if len(answer) > 500 else answer)
            
            print("\n" + "="*60)
            input("按 Enter 繼續下一個演示...")
            
    except ImportError as e:
        print(f"❌ 無法匯入必要模組: {e}")
        print("請確保已安裝所有依賴套件")
    except Exception as e:
        print(f"❌ 演示過程中發生錯誤: {e}")

def show_distance_calculation_demo():
    """演示距離計算功能"""
    print("\n🧮 距離計算演示")
    print("-" * 30)
    
    from src.Vector_Database.ChromaDB_v1 import ChromaDBManager
    
    # 福井縣內主要城市座標
    cities = {
        "福井市": (36.0642, 136.2206),
        "大野市": (35.9789, 136.4858),
        "坂井市": (36.1831, 136.2242),
        "小濱市": (35.4953, 135.7456),
        "敦賀市": (35.6444, 136.0531)
    }
    
    base_city = "福井市"
    base_lat, base_lng = cities[base_city]
    
    print(f"📍 以 {base_city} 為基準計算距離:")
    
    for city, (lat, lng) in cities.items():
        if city != base_city:
            distance = ChromaDBManager.calculate_distance(base_lat, base_lng, lat, lng)
            print(f"  {city}: {distance:.1f} 公里")

if __name__ == "__main__":
    print("🎯 地理位置感知搜尋功能完整演示")
    print("\n這個功能讓 GPT-4o-mini 在推薦景點時能夠:")
    print("✅ 優先推薦同一城市的景點")
    print("✅ 考慮地理距離的遠近")
    print("✅ 提供更合理的旅遊路線建議")
    print("✅ 避免推薦相距太遠的景點組合")
    
    # 距離計算演示
    show_distance_calculation_demo()
    
    print("\n" + "="*60)
    input("按 Enter 開始完整功能演示...")
    
    # 完整功能演示
    demonstrate_location_awareness()
    
    print("\n🎉 演示完成！")
    print("\n📝 總結:")
    print("- 地理位置感知搜尋能夠識別使用者查詢中的城市/地點")
    print("- 系統會優先返回同一城市或附近的相關景點")
    print("- GPT 會提供更實用的旅遊建議，考慮交通便利性")
    print("- 這大大提升了旅遊推薦的實用性和可行性！")
