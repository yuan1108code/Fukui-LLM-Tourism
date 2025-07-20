#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
福井神社資料增強工具 - ChromaDB 向量資料庫實作
負責將 markdown 檔案映射到 ChromaDB 並提供 GPT-4o-mini 問答功能
"""

import os
import re
import json
import logging
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path
import chromadb
from chromadb.utils import embedding_functions
import openai
from openai import OpenAI
from dotenv import load_dotenv
import hashlib

class ChromaDBManager:
    """ChromaDB 向量資料庫管理器"""
    
    def __init__(self, db_path: str = "./chroma_db", collection_name: str = "fukui_tourism"):
        """初始化 ChromaDB 管理器
        
        Args:
            db_path: 資料庫儲存路徑
            collection_name: 集合名稱
        """
        self.db_path = Path(db_path)
        self.collection_name = collection_name
        self.setup_logging()
        self.setup_environment()
        self.setup_chromadb()
        self.setup_openai()
        
    def setup_logging(self):
        """設定日誌"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('chromadb.log', encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
    def setup_environment(self):
        """載入環境變數"""
        load_dotenv()
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        if not self.openai_api_key:
            raise ValueError("未找到 OPENAI_API_KEY 環境變數")
        self.logger.info("環境變數載入成功")
        
    def setup_chromadb(self):
        """設定 ChromaDB"""
        try:
            # 建立資料庫目錄
            self.db_path.mkdir(parents=True, exist_ok=True)
            
            # 使用新的 ChromaDB 客戶端初始化方式
            self.client = chromadb.PersistentClient(path=str(self.db_path))
            
            # 暫時使用預設的 embedding 函式，避免版本相容性問題
            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"description": "福井縣觀光景點和神社資訊"}
            )
            
            self.logger.info(f"ChromaDB 初始化成功，集合名稱：{self.collection_name}")
            
        except Exception as e:
            self.logger.error(f"ChromaDB 初始化失敗：{e}")
            raise
            
    def setup_openai(self):
        """設定 OpenAI 客戶端"""
        try:
            self.openai_client = OpenAI(api_key=self.openai_api_key)
            self.logger.info("OpenAI 客戶端初始化成功")
        except Exception as e:
            self.logger.error(f"OpenAI 客戶端初始化失敗：{e}")
            raise
    
    def parse_markdown_sections(self, content: str, source_type: str) -> List[Dict[str, Any]]:
        """解析 Markdown 內容為結構化資料
        
        Args:
            content: Markdown 內容
            source_type: 來源類型 ('locations' 或 'shrines')
            
        Returns:
            解析後的結構化資料清單
        """
        sections = []
        
        # 分割各個景點/神社區塊
        if source_type == "locations":
            pattern = r'## (\d+)\. (.+?)\n'
        else:  # shrines
            pattern = r'## (\d+)\. (.+?)\n'
            
        matches = list(re.finditer(pattern, content))
        
        for i, match in enumerate(matches):
            start_pos = match.start()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(content)
            
            section_content = content[start_pos:end_pos].strip()
            section_data = self.extract_section_data(section_content, source_type)
            
            if section_data:
                sections.append(section_data)
                
        return sections
    
    def extract_section_data(self, section_content: str, source_type: str) -> Optional[Dict[str, Any]]:
        """從區塊內容提取結構化資料
        
        Args:
            section_content: 區塊內容
            source_type: 來源類型
            
        Returns:
            結構化資料字典
        """
        try:
            data = {"source_type": source_type}
            
            # 提取標題
            title_match = re.search(r'## \d+\. (.+)', section_content)
            if title_match:
                data["title"] = title_match.group(1).strip()
                self.logger.debug(f"提取標題成功: {data['title']}")
            else:
                self.logger.warning(f"無法提取標題，內容開頭: {section_content[:100]}...")
            
            # 提取基本資訊表格
            basic_info_pattern = r'\| 項目 \| 內容 \|\n\|------|------\|(.*?)\n\n'
            basic_info_match = re.search(basic_info_pattern, section_content, re.DOTALL)
            
            if basic_info_match:
                table_content = basic_info_match.group(1)
                if table_content:  # 確保 table_content 不是 None
                    for row in table_content.split('\n'):
                        if '|' in row:
                            parts = [part.strip() for part in row.split('|') if part.strip()]
                            if len(parts) >= 2:
                                key = parts[0].strip()
                                value = parts[1].strip()
                                if key and value:  # 確保 key 和 value 都不是空字串
                                    data[key] = value
                else:
                    self.logger.warning(f"基本資訊表格內容為空")
            else:
                self.logger.warning(f"無法找到基本資訊表格")
            
            # 提取詳細描述
            desc_match = re.search(r'### 詳細描述\n\n(.*?)(?=\n### |$)', section_content, re.DOTALL)
            if desc_match:
                data["detailed_description"] = desc_match.group(1).strip()
            
            # 提取營業時間（僅限景點）
            if source_type == "locations":
                hours_match = re.search(r'### 營業時間\n\n(.*?)(?=\n### |$)', section_content, re.DOTALL)
                if hours_match:
                    data["operating_hours"] = hours_match.group(1).strip()
            
            # 提取評論
            reviews_match = re.search(r'### 遊客評論精選\n\n(.*?)(?=\n\*\*關鍵標籤|$)', section_content, re.DOTALL)
            if reviews_match:
                data["reviews"] = reviews_match.group(1).strip()
            
            # 提取關鍵標籤 - 改進正則表達式以適應不同格式
            tags_match = re.search(r'\*\*關鍵標籤：\*\* (.+?)(?:\n|$)', section_content, re.DOTALL)
            if tags_match:
                tags_text = tags_match.group(1).strip()
                if tags_text:  # 確保 tags_text 不是 None 或空字串
                    # 移除可能的結尾符號和多餘空格
                    tags_text = tags_text.replace('\n', ' ').strip()
                    data["tags"] = [tag.strip() for tag in tags_text.split('|') if tag.strip()]
                    self.logger.debug(f"提取標籤成功: {data['tags']}")
                else:
                    data["tags"] = []
            else:
                data["tags"] = []
                self.logger.warning(f"無法找到關鍵標籤")
            
            # 建立完整文本用於嵌入
            data["full_text"] = section_content
            
            return data
            
        except Exception as e:
            self.logger.error(f"解析區塊資料時發生錯誤：{e}")
            self.logger.error(f"問題內容前100字符: {section_content[:100] if section_content else 'None'}")
            return None
    
    def load_and_process_files(self, locations_file: str, shrines_file: str) -> Tuple[List[Dict], List[Dict]]:
        """載入並處理 markdown 檔案
        
        Args:
            locations_file: 景點檔案路徑
            shrines_file: 神社檔案路徑
            
        Returns:
            處理後的景點和神社資料
        """
        locations_data = []
        shrines_data = []
        
        # 處理景點檔案
        try:
            with open(locations_file, 'r', encoding='utf-8') as f:
                locations_content = f.read()
            locations_data = self.parse_markdown_sections(locations_content, "locations")
            self.logger.info(f"成功解析 {len(locations_data)} 個景點")
        except Exception as e:
            self.logger.error(f"載入景點檔案失敗：{e}")
        
        # 處理神社檔案
        try:
            with open(shrines_file, 'r', encoding='utf-8') as f:
                shrines_content = f.read()
            shrines_data = self.parse_markdown_sections(shrines_content, "shrines")
            self.logger.info(f"成功解析 {len(shrines_data)} 個神社")
        except Exception as e:
            self.logger.error(f"載入神社檔案失敗：{e}")
        
        return locations_data, shrines_data
    
    def generate_document_id(self, data: Dict[str, Any]) -> str:
        """生成文件唯一 ID
        
        Args:
            data: 文件資料
            
        Returns:
            唯一 ID
        """
        # 使用更多欄位來確保 ID 的唯一性
        source_type = data.get('source_type', '')
        title = data.get('title', '')
        address = data.get('地址', data.get('所在地', ''))
        full_text_hash = hashlib.md5(data.get('full_text', '').encode('utf-8')).hexdigest()[:8]
        
        content = f"{source_type}-{title}-{address}-{full_text_hash}"
        return hashlib.md5(content.encode('utf-8')).hexdigest()
    
    def insert_documents(self, documents: List[Dict[str, Any]]) -> bool:
        """將文件插入 ChromaDB
        
        Args:
            documents: 文件清單
            
        Returns:
            是否成功
        """
        try:
            if not documents:
                self.logger.warning("沒有文件需要插入")
                return True
                
            ids = []
            texts = []
            metadatas = []
            
            for doc in documents:
                doc_id = self.generate_document_id(doc)
                ids.append(doc_id)
                texts.append(doc.get("full_text", ""))
                
                # 建立 metadata（移除 full_text 避免重複）
                metadata = {k: v for k, v in doc.items() if k != "full_text"}
                # 確保所有值都是字符串類型
                for key, value in metadata.items():
                    if isinstance(value, list):
                        metadata[key] = " | ".join(str(v) for v in value)
                    else:
                        metadata[key] = str(value)
                metadatas.append(metadata)
            
            # 批次插入
            self.collection.add(
                documents=texts,
                metadatas=metadatas,
                ids=ids
            )
            
            self.logger.info(f"成功插入 {len(documents)} 個文件")
            return True
            
        except Exception as e:
            self.logger.error(f"插入文件失敗：{e}")
            return False
    
    def search_similar(self, query: str, n_results: int = 5) -> List[Dict[str, Any]]:
        """搜尋相似文件
        
        Args:
            query: 查詢字串
            n_results: 返回結果數量
            
        Returns:
            搜尋結果
        """
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                include=["documents", "metadatas", "distances"]
            )
            
            formatted_results = []
            for i in range(len(results["documents"][0])):
                formatted_results.append({
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i]
                })
            
            return formatted_results
            
        except Exception as e:
            self.logger.error(f"搜尋失敗：{e}")
            return []
    
    def ask_gpt(self, question: str, context_docs: List[Dict[str, Any]] = None) -> str:
        """使用 GPT-4o-mini 回答問題
        
        Args:
            question: 問題
            context_docs: 上下文文件
            
        Returns:
            GPT 回答
        """
        try:
            # 如果沒有提供上下文，先搜尋相關文件
            if not context_docs:
                context_docs = self.search_similar(question, n_results=3)
            
            # 建立上下文字串
            context_text = "\n\n".join([
                f"【{doc['metadata'].get('title', 'Unknown')}】\n{doc['content'][:1000]}..."
                for doc in context_docs
            ])
            
            # 建立系統提示 - 專業導遊角色
            system_prompt = """You are an experienced and enthusiastic tour guide specializing in Fukui Prefecture, Japan. You have extensive knowledge about local attractions, shrines, temples, culture, and travel tips.

Your responsibilities:
- Act as a professional, friendly, and knowledgeable tour guide
- Provide detailed, engaging, and well-organized information
- Include practical travel advice when relevant (opening hours, best times to visit, etc.)
- Share interesting historical and cultural context
- Use a warm, welcoming tone that makes tourists excited about visiting
- Structure your responses clearly with headings, bullet points, and organized sections when appropriate
- Provide specific recommendations and insider tips

Always respond in English with enthusiasm and expertise, as if you're personally guiding tourists through Fukui Prefecture."""
            
            # 建立使用者提示 - 更專業的格式
            user_prompt = f"""Based on the following tourism information about Fukui Prefecture, please provide a comprehensive and engaging response as a professional tour guide:

【Tourism Information】
{context_text}

【Tourist Question】
{question}

Please structure your response professionally with:
1. A welcoming introduction if appropriate
2. Detailed information organized by key points
3. Practical travel tips and recommendations
4. Cultural or historical insights
5. Best times to visit or special considerations

Make it informative, engaging, and helpful for tourists planning their visit to Fukui Prefecture:"""

            # 呼叫 GPT-4o-mini 具有更自然的參數設定
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.8,  # 提高創意性，讓回應更自然有趣
                max_tokens=2000,  # 增加長度限制以支援更詳細的回應
                top_p=0.9,  # 新增 top_p 參數以提升回應品質
                frequency_penalty=0.1,  # 輕微減少重複
                presence_penalty=0.1   # 鼓勵多樣化表達
            )
            
            answer = response.choices[0].message.content
            self.logger.info(f"GPT 回答生成成功，問題：{question[:50]}...")
            return answer
            
        except Exception as e:
            self.logger.error(f"GPT answer generation failed: {e}")
            return f"Sorry, an error occurred while generating the answer: {str(e)}"
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """取得集合統計資訊
        
        Returns:
            統計資訊
        """
        try:
            count = self.collection.count()
            return {
                "collection_name": self.collection_name,
                "document_count": count,
                "embedding_function": "text-embedding-3-small"
            }
        except Exception as e:
            self.logger.error(f"取得統計資訊失敗：{e}")
            return {}

def main():
    """主函式 - 展示系統使用範例"""
    try:
        # 初始化 ChromaDB 管理器
        print("🚀 初始化 ChromaDB 向量資料庫...")
        chroma_manager = ChromaDBManager()
        
        # 定義檔案路徑
        locations_file = "/Users/zhuboyuan/Desktop/University-NCHU/NCHU-Project/Project-FUKUI/src/src-LLM-Shrine/output/locations_natural_language.md"
        shrines_file = "/Users/zhuboyuan/Desktop/University-NCHU/NCHU-Project/Project-FUKUI/src/src-LLM-Shrine/output/shrines_natural_language.md"
        
        # 檢查檔案是否存在
        if not os.path.exists(locations_file):
            print(f"❌ 景點檔案不存在：{locations_file}")
            return
        if not os.path.exists(shrines_file):
            print(f"❌ 神社檔案不存在：{shrines_file}")
            return
        
        # 載入並處理檔案
        print("📚 載入並處理 Markdown 檔案...")
        locations_data, shrines_data = chroma_manager.load_and_process_files(
            locations_file, shrines_file
        )
        
        # 合併所有資料
        all_documents = locations_data + shrines_data
        print(f"📊 總共處理了 {len(all_documents)} 個文件")
        
        # 插入資料庫
        print("💾 將資料插入 ChromaDB...")
        success = chroma_manager.insert_documents(all_documents)
        
        if success:
            print("✅ 資料庫建立成功！")
            
            # 顯示統計資訊
            stats = chroma_manager.get_collection_stats()
            print(f"📈 資料庫統計：{stats}")
            
            # 測試問答功能
            print("\n🤖 測試 GPT-4o-mini 問答功能...")
            test_questions = [
                "福井縣有哪些著名的神社？",
                "推薦一些福井縣的海岸景點",
                "永平寺的特色是什麼？"
            ]
            
            for question in test_questions:
                print(f"\n❓ 問題：{question}")
                answer = chroma_manager.ask_gpt(question)
                print(f"💬 回答：{answer}\n" + "="*60)
                
        else:
            print("❌ 資料庫建立失敗")
            
    except Exception as e:
        print(f"❌ 執行過程中發生錯誤：{e}")
        logging.error(f"主程式執行錯誤：{e}")

if __name__ == "__main__":
    main()
