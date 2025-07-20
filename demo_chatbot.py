#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
福井神社資料增強工具 - ChromaDB 使用範例
展示如何使用向量資料庫進行問答
"""

import os
import sys
from pathlib import Path

# 加入專案根目錄到 Python 路徑
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from src.Vector_Database.ChromaDB_v1 import ChromaDBManager

class FukuiTourismAssistant:
    """福井觀光助手"""
    
    def __init__(self):
        """初始化助手"""
        self.chroma_manager = None
        self.setup()
        
    def setup(self):
        """設定助手"""
        try:
            print("🏯 福井觀光智能助手啟動中...")
            self.chroma_manager = ChromaDBManager(
                db_path="./chroma_db",
                collection_name="fukui_tourism"
            )
            
            # 檢查資料庫是否已有資料
            stats = self.chroma_manager.get_collection_stats()
            if stats.get("document_count", 0) == 0:
                print("📚 資料庫為空，開始載入資料...")
                self.load_initial_data()
            else:
                print(f"📊 資料庫已包含 {stats.get('document_count')} 個文件")
                
        except Exception as e:
            print(f"❌ 助手初始化失敗：{e}")
            raise
    
    def load_initial_data(self):
        """載入初始資料"""
        try:
            # 定義檔案路徑
            base_path = Path(__file__).parent.parent
            locations_file = base_path / "output" / "locations_natural_language.md"
            shrines_file = base_path / "output" / "shrines_natural_language.md"
            
            # 檢查檔案是否存在
            if not locations_file.exists():
                print(f"⚠️ 景點檔案不存在：{locations_file}")
                return False
            if not shrines_file.exists():
                print(f"⚠️ 神社檔案不存在：{shrines_file}")
                return False
            
            # 載入並處理檔案
            locations_data, shrines_data = self.chroma_manager.load_and_process_files(
                str(locations_file), str(shrines_file)
            )
            
            # 合併並插入資料
            all_documents = locations_data + shrines_data
            success = self.chroma_manager.insert_documents(all_documents)
            
            if success:
                print(f"✅ 成功載入 {len(all_documents)} 個文件")
                return True
            else:
                print("❌ 資料載入失敗")
                return False
                
        except Exception as e:
            print(f"❌ 載入初始資料失敗：{e}")
            return False
    
    def ask_question(self, question: str) -> str:
        """詢問問題"""
        if not self.chroma_manager:
            return "❌ 助手尚未初始化"
        
        try:
            # 先搜尋相關文件
            relevant_docs = self.chroma_manager.search_similar(question, n_results=3)
            
            if not relevant_docs:
                return "抱歉，我找不到相關的資訊。請試試其他問題。"
            
            # 使用 GPT 生成回答
            answer = self.chroma_manager.ask_gpt(question, relevant_docs)
            
            # 附加來源資訊
            sources = []
            for doc in relevant_docs:
                title = doc['metadata'].get('title', 'Unknown')
                source_type = doc['metadata'].get('source_type', 'Unknown')
                sources.append(f"• {title} ({source_type})")
            
            sources_text = "\n".join(sources[:3])  # 只顯示前3個來源
            
            return f"{answer}\n\n📚 參考資料來源：\n{sources_text}"
            
        except Exception as e:
            return f"❌ 處理問題時發生錯誤：{e}"
    
    def interactive_chat(self):
        """互動式聊天"""
        print("\n" + "="*60)
        print("🏯 福井觀光智能助手已就緒！")
        print("💡 您可以詢問關於福井縣景點、神社的任何問題")
        print("💡 輸入 'quit' 或 'exit' 結束對話")
        print("="*60 + "\n")
        
        while True:
            try:
                question = input("❓ 您的問題：").strip()
                
                if not question:
                    continue
                    
                if question.lower() in ['quit', 'exit', '退出', '結束']:
                    print("👋 感謝使用福井觀光智能助手！")
                    break
                
                print("🤔 思考中...")
                answer = self.ask_question(question)
                print(f"\n💬 回答：\n{answer}\n")
                print("-" * 60)
                
            except KeyboardInterrupt:
                print("\n👋 感謝使用福井觀光智能助手！")
                break
            except Exception as e:
                print(f"❌ 發生錯誤：{e}")
    
    def run_examples(self):
        """執行範例問題"""
        example_questions = [
            "福井縣有哪些著名的神社？",
            "推薦一些福井縣的海岸景點",
            "永平寺的特色是什麼？",
            "福井縣適合春季參觀的地方有哪些？",
            "如何前往福井縣的主要景點？",
            "福井縣有什麼特殊的祭典活動？",
            "適合拍照的福井景點推薦",
            "福井縣的溫泉景點有哪些？"
        ]
        
        print("\n🤖 執行範例問題...")
        print("="*60)
        
        for i, question in enumerate(example_questions, 1):
            print(f"\n【範例 {i}】")
            print(f"❓ 問題：{question}")
            answer = self.ask_question(question)
            print(f"💬 回答：{answer}")
            print("-" * 60)

def main():
    """主程式"""
    try:
        # 初始化助手
        assistant = FukuiTourismAssistant()
        
        # 詢問使用者選擇模式
        print("\n請選擇模式：")
        print("1. 互動式問答")
        print("2. 執行範例問題")
        print("3. 兩者都要")
        
        choice = input("\n請輸入選擇 (1/2/3): ").strip()
        
        if choice == "1":
            assistant.interactive_chat()
        elif choice == "2":
            assistant.run_examples()
        elif choice == "3":
            assistant.run_examples()
            print("\n" + "="*60)
            print("現在進入互動模式...")
            assistant.interactive_chat()
        else:
            print("無效的選擇，預設執行互動模式")
            assistant.interactive_chat()
            
    except Exception as e:
        print(f"❌ 程式執行失敗：{e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
