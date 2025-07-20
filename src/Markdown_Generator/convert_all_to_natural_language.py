#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
福井縣神社與景點資料自然語言轉換主控程式
一次執行所有轉換程序，將JSON資料轉換為Markdown格式
"""

import subprocess
import sys
import os
from datetime import datetime

def run_script(script_path: str, description: str) -> bool:
    """執行指定的Python腳本"""
    print(f"\n{'='*50}")
    print(f"開始執行：{description}")
    print(f"腳本路徑：{script_path}")
    print(f"{'='*50}")
    
    try:
        # 執行腳本
        result = subprocess.run(
            [sys.executable, script_path], 
            check=True, 
            capture_output=True, 
            text=True,
            encoding='utf-8'
        )
        
        # 印出標準輸出
        if result.stdout:
            print(result.stdout)
        
        print(f"✅ {description} 執行成功！")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} 執行失敗！")
        print(f"錯誤程式碼：{e.returncode}")
        if e.stdout:
            print(f"標準輸出：\n{e.stdout}")
        if e.stderr:
            print(f"錯誤輸出：\n{e.stderr}")
        return False
    
    except FileNotFoundError:
        print(f"❌ 找不到腳本檔案：{script_path}")
        return False
    
    except Exception as e:
        print(f"❌ 執行時發生未預期的錯誤：{e}")
        return False

def check_input_files() -> bool:
    """檢查輸入檔案是否存在"""
    required_files = [
        "output/enhanced_shrines.json",
        "output/fukui_enhanced_locations.json"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    if missing_files:
        print("❌ 以下必要的輸入檔案不存在：")
        for file_path in missing_files:
            print(f"   - {file_path}")
        print("\n請確認已執行資料收集程式，並產生了必要的JSON檔案。")
        return False
    
    print("✅ 所有輸入檔案檢查通過")
    return True

def create_summary_report(shrine_success: bool, location_success: bool):
    """建立執行摘要報告"""
    timestamp = datetime.now().strftime("%Y年%m月%d日 %H:%M:%S")
    
    report_content = f"""# 福井縣資料轉換執行報告

**執行時間：** {timestamp}

## 轉換結果摘要

| 轉換項目 | 狀態 | 輸出檔案 |
|---------|------|----------|
| 神社資料 | {'✅ 成功' if shrine_success else '❌ 失敗'} | `output/shrines_natural_language.md` |
| 景點資料 | {'✅ 成功' if location_success else '❌ 失敗'} | `output/locations_natural_language.md` |

## 檔案說明

### 輸入檔案
- `output/enhanced_shrines.json` - 神社詳細資料（JSON格式）
- `output/fukui_enhanced_locations.json` - 景點詳細資料（JSON格式）

### 輸出檔案
- `output/shrines_natural_language.md` - 神社自然語言描述（Markdown格式）
- `output/locations_natural_language.md` - 景點自然語言描述（Markdown格式）

### 轉換特色
- 結構化資料轉換為流暢的中文自然語言描述
- 包含豐富的上下文資訊，適用於向量資料庫搜尋
- 保留重要的日文原文和專有名詞
- 整合評論、評分、營業時間等實用資訊
- 提供關鍵標籤以提升搜尋效果

## 使用建議

轉換後的Markdown檔案可以：
1. 直接匯入向量資料庫（如Pinecone、Weaviate等）
2. 用於RAG（Retrieval-Augmented Generation）系統
3. 作為AI助理的知識基底
4. 提供給旅遊推薦系統使用

---
*此報告由福井縣資料轉換主控程式自動生成*
"""
    
    # 儲存報告
    report_path = "output/conversion_report.md"
    try:
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report_content)
        print(f"📋 執行摘要報告已儲存至：{report_path}")
    except Exception as e:
        print(f"⚠️  儲存執行報告時發生錯誤：{e}")

def main():
    """主程式"""
    print("🏯 福井縣神社與景點資料自然語言轉換程式")
    print("=" * 60)
    print("此程式將自動執行以下轉換：")
    print("1. 神社JSON資料 → 自然語言Markdown")
    print("2. 景點JSON資料 → 自然語言Markdown")
    print("=" * 60)
    
    # 檢查輸入檔案
    print("\n🔍 檢查輸入檔案...")
    if not check_input_files():
        print("\n程式結束。請先確保輸入檔案存在。")
        return
    
    # 確保輸出目錄存在
    os.makedirs("output", exist_ok=True)
    
    # 執行轉換腳本
    results = {}
    
    # 1. 轉換神社資料
    results['shrine'] = run_script(
        "shrine_to_natural_language.py",
        "神社資料自然語言轉換"
    )
    
    # 2. 轉換景點資料
    results['location'] = run_script(
        "location_to_natural_language.py", 
        "景點資料自然語言轉換"
    )
    
    # 顯示最終結果
    print(f"\n{'='*60}")
    print("🎉 所有轉換程序執行完畢！")
    print(f"{'='*60}")
    
    success_count = sum(results.values())
    total_count = len(results)
    
    print(f"執行結果：{success_count}/{total_count} 個轉換成功")
    
    if results['shrine']:
        print("✅ 神社資料轉換成功 → output/shrines_natural_language.md")
    else:
        print("❌ 神社資料轉換失敗")
        
    if results['location']:
        print("✅ 景點資料轉換成功 → output/locations_natural_language.md")
    else:
        print("❌ 景點資料轉換失敗")
    
    # 建立執行摘要報告
    create_summary_report(results['shrine'], results['location'])
    
    print(f"\n{'='*60}")
    print("📚 轉換後的檔案可用於：")
    print("   • 向量資料庫索引")
    print("   • AI知識庫建構")
    print("   • 語義搜尋系統")
    print("   • 旅遊推薦引擎")
    print(f"{'='*60}")
    
    # 如果有失敗的轉換，回傳非零值
    if success_count < total_count:
        sys.exit(1)

if __name__ == "__main__":
    main()
