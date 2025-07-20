#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
福井觀光智能助手 - FastAPI 後端服務
提供 ChromaDB 向量資料庫和 OpenAI API 的 RESTful 介面
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

# 加入專案根目錄到 Python 路徑
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

try:
    from src.Vector_Database.ChromaDB_v1 import ChromaDBManager
    print("✅ ChromaDB 模組載入成功")
except ImportError as e:
    print(f"⚠️ ChromaDB 模組載入失敗: {e}")
    print("將建立簡化版本的服務")
    ChromaDBManager = None

# 載入環境變數
load_dotenv()

# FastAPI 應用程式
app = FastAPI(
    title="福井觀光智能助手 API",
    description="提供 ChromaDB 向量資料庫和 OpenAI GPT-4o-mini 問答功能",
    version="1.0.0"
)

# 設定 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生產環境中應該限制特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全域變數
chroma_manager: Optional[ChromaDBManager] = None

# Pydantic 模型
class ChatRequest(BaseModel):
    message: str
    include_sources: bool = True

class ChatResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]] = []
    success: bool = True
    error: Optional[str] = None

class LocationData(BaseModel):
    id: str
    title: str
    content: str
    metadata: Dict[str, Any]
    coordinates: Optional[Dict[str, float]] = None

class LocationsResponse(BaseModel):
    locations: List[LocationData]
    total_count: int
    success: bool = True
    error: Optional[str] = None

# 啟動事件
@app.on_event("startup")
async def startup_event():
    """應用程式啟動時初始化 ChromaDB"""
    global chroma_manager
    try:
        print("🚀 初始化 ChromaDB 向量資料庫...")
        
        if ChromaDBManager is None:
            print("⚠️ ChromaDB 管理器無法載入，使用模擬模式")
            return
            
        chroma_manager = ChromaDBManager(
            db_path="./chroma_db",
            collection_name="fukui_tourism"
        )
        
        # 檢查資料庫是否已有資料
        stats = chroma_manager.get_collection_stats()
        if stats.get("document_count", 0) == 0:
            print("📚 資料庫為空，開始載入資料...")
            await load_initial_data()
        else:
            print(f"📊 資料庫已包含 {stats.get('document_count')} 個文件")
            
        print("✅ 後端服務初始化完成")
        
    except Exception as e:
        print(f"❌ 後端服務初始化失敗：{e}")
        print("將以簡化模式運行")
        chroma_manager = None

async def load_initial_data():
    """載入初始資料到 ChromaDB"""
    try:
        if chroma_manager is None:
            print("⚠️ ChromaDB 管理器不可用，跳過資料載入")
            return
            
        # 定義檔案路徑
        base_path = Path(__file__).parent.parent
        locations_file = base_path / "output" / "locations_natural_language.md"
        shrines_file = base_path / "output" / "shrines_natural_language.md"
        
        # 檢查檔案是否存在
        if not locations_file.exists() or not shrines_file.exists():
            print("⚠️ 資料檔案不存在，跳過資料載入")
            return
        
        # 載入並處理檔案
        locations_data, shrines_data = chroma_manager.load_and_process_files(
            str(locations_file), str(shrines_file)
        )
        
        # 合併並插入資料
        all_documents = locations_data + shrines_data
        success = chroma_manager.insert_documents(all_documents)
        
        if success:
            print(f"✅ 成功載入 {len(all_documents)} 個文件")
        else:
            print("❌ 資料載入失敗")
            
    except Exception as e:
        print(f"❌ 載入初始資料失敗：{e}")

# 圖片工具函式
def get_local_image_path(city: str, location_name: str) -> Optional[str]:
    """根據城市和景點名稱找到對應的本地圖片路徑"""
    try:
        base_path = Path(__file__).parent.parent
        image_dir = base_path / "data" / "fukui-attraction-picture" / "福井景點照" / city
        
        if not image_dir.exists():
            print(f"Image directory not found: {image_dir}")
            return None
            
        # 清理景點名稱，移除可能影響匹配的字符
        clean_location_name = location_name.replace('（', '(').replace('）', ')').replace(' ', '')
        
        # 嘗試找到匹配的圖片檔案
        image_files = list(image_dir.glob("*.png"))
        
        # 精確匹配
        for img_file in image_files:
            clean_filename = img_file.stem.replace('（', '(').replace('）', ')').replace(' ', '')
            if clean_location_name in clean_filename or clean_filename in clean_location_name:
                print(f"Found matching image: {img_file}")
                return str(img_file)
        
        # 部分匹配
        for img_file in image_files:
            clean_filename = img_file.stem.replace('（', '(').replace('）', ')').replace(' ', '')
            # 檢查關鍵字匹配
            if any(word in clean_filename for word in clean_location_name.split() if len(word) > 1):
                print(f"Found partial matching image: {img_file}")
                return str(img_file)
        
        # 如果沒有匹配，回傳第一張圖片作為預設
        if image_files:
            print(f"Using default image: {image_files[0]}")
            return str(image_files[0])
            
    except Exception as e:
        print(f"Error getting image path: {e}")
        
    return None

@app.get("/images/{city}/{filename}")
async def get_image(city: str, filename: str):
    """提供本地圖片服務"""
    try:
        base_path = Path(__file__).parent.parent
        image_path = base_path / "data" / "fukui-attraction-picture" / "福井景點照" / city / filename
        
        if image_path.exists() and image_path.suffix.lower() in ['.png', '.jpg', '.jpeg']:
            return FileResponse(image_path)
        else:
            raise HTTPException(status_code=404, detail="Image not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read image: {str(e)}")

# API 路由
@app.get("/")
async def root():
    """根路徑"""
    return {"message": "福井觀光智能助手 API 服務正在執行中", "status": "active"}

@app.get("/health")
async def health_check():
    """健康檢查"""
    if chroma_manager is None:
        raise HTTPException(status_code=503, detail="ChromaDB 管理器未初始化")
    
    try:
        stats = chroma_manager.get_collection_stats()
        return {
            "status": "healthy",
            "database_stats": stats,
            "openai_configured": bool(os.getenv("OPENAI_API_KEY"))
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"服務不健康：{str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """聊天問答端點"""
    if chroma_manager is None:
        raise HTTPException(status_code=503, detail="ChromaDB 管理器未初始化")
    
    try:
        # 搜尋相關文件
        relevant_docs = chroma_manager.search_similar(request.message, n_results=3)
        
        if not relevant_docs:
            return ChatResponse(
                answer="Sorry, I couldn't find relevant information. Please try asking other questions about Fukui Prefecture tourist attractions or shrines.",
                sources=[],
                success=True
            )
        
        # 使用 GPT 生成專業導遊式回答
        answer = chroma_manager.ask_gpt(
            f"As a professional tour guide, please help with this question: {request.message}", 
            relevant_docs
        )
        
        # 準備來源資訊
        sources = []
        if request.include_sources:
            for doc in relevant_docs:
                sources.append({
                    "title": doc['metadata'].get('title', '未知'),
                    "type": doc['metadata'].get('source_type', 'unknown'),
                    "content": doc['content'][:200] + "..." if len(doc['content']) > 200 else doc['content']
                })
        
        return ChatResponse(
            answer=answer,
            sources=sources,
            success=True
        )
        
    except Exception as e:
        logging.error(f"Chat processing error: {e}")
        return ChatResponse(
            answer="Sorry, an error occurred while processing your question. Please try again later.",
            sources=[],
            success=False,
            error=str(e)
        )

@app.get("/locations", response_model=LocationsResponse)
async def get_locations(limit: int = 200, search: Optional[str] = None):
    """取得景點位置資料用於地圖顯示"""
    try:
        # 載入完整的景點資料
        import json
        base_path = Path(__file__).parent.parent
        locations_file = base_path / "output" / "fukui_enhanced_locations.json"
        
        if not locations_file.exists():
            raise HTTPException(status_code=404, detail="景點資料檔案不存在")
            
        with open(locations_file, 'r', encoding='utf-8') as f:
            locations_data = json.load(f)
        
        locations = []
        for i, location in enumerate(locations_data[:limit]):
            if search and search.lower() not in location.get('google_maps_data', {}).get('name', '').lower():
                continue
                
            google_data = location.get('google_maps_data', {})
            original_data = location.get('original_data', {})
            
            # 獲取本地圖片路徑
            city = original_data.get('city', '')
            location_name = google_data.get('name', '未知景點')
            local_image_path = get_local_image_path(city, location_name)
            
            # 建立位置物件 - 優先使用Google Maps的精確座標
            coordinates = None
            
            # 優先使用 Google Maps 資料中的經緯度
            geometry = google_data.get('geometry', {})
            if geometry and 'location' in geometry:
                try:
                    lat_float = float(geometry['location']['lat'])
                    lng_float = float(geometry['location']['lng'])
                    # 檢查座標是否在福井縣合理範圍內
                    if 35.0 <= lat_float <= 36.5 and 135.5 <= lng_float <= 137.0:
                        coordinates = {"lat": lat_float, "lng": lng_float}
                        print(f"Using Google Maps coordinates for {location_name}: {lat_float}, {lng_float}")
                    else:
                        print(f"Google coordinates out of Fukui range for {location_name}: {lat_float}, {lng_float}")
                except (ValueError, TypeError, KeyError):
                    print(f"Invalid Google Maps coordinates for {location_name}")
            
            # 如果Google Maps座標不可用，使用原始座標
            if coordinates is None:
                lat = original_data.get('latitude')
                lng = original_data.get('longitude')
                
                if lat is not None and lng is not None:
                    try:
                        lat_float = float(lat)
                        lng_float = float(lng)
                        # 檢查座標是否在福井縣合理範圍內
                        if 35.0 <= lat_float <= 36.5 and 135.5 <= lng_float <= 137.0:
                            coordinates = {"lat": lat_float, "lng": lng_float}
                            print(f"Using fallback coordinates for {location_name}: {lat_float}, {lng_float}")
                        else:
                            print(f"Fallback coordinates out of Fukui range for {location_name}: {lat_float}, {lng_float}")
                    except (ValueError, TypeError):
                        print(f"Invalid fallback coordinates for {location_name}: {lat}, {lng}")
            
            locations.append(LocationData(
                id=f"location_{i}",
                title=location_name,
                content=f"Rating: {google_data.get('rating', 'N/A')}/5.0 ({google_data.get('user_ratings_total', 0)} reviews)\n"
                       f"Address: {google_data.get('formatted_address', 'Not available')}\n"
                       f"Phone: {google_data.get('phone_number', 'Not available')}\n"
                       f"Website: {google_data.get('website', 'Not available')}",
                metadata={
                    "source_type": "locations",
                    "category": "attraction",
                    "city": original_data.get('city', ''),
                    "rating": google_data.get('rating'),
                    "phone": google_data.get('phone_number'),
                    "website": google_data.get('website'),
                    "address": google_data.get('formatted_address'),
                    "photo_url": google_data.get('photos', [None])[0] if google_data.get('photos') else None,
                    "local_image": f"/images/{city}/{Path(local_image_path).name}" if local_image_path else None
                },
                coordinates=coordinates
            ))
        
        return LocationsResponse(
            locations=locations,
            total_count=len(locations),
            success=True
        )
        
    except Exception as e:
        logging.error(f"取得位置資料錯誤：{e}")
        raise HTTPException(status_code=500, detail=f"取得位置資料失敗：{str(e)}")

@app.get("/search")
async def search_locations(query: str, limit: int = 10):
    """搜尋特定景點或神社"""
    if chroma_manager is None:
        raise HTTPException(status_code=503, detail="ChromaDB 管理器未初始化")
    
    try:
        results = chroma_manager.search_similar(query, n_results=limit)
        
        formatted_results = []
        for result in results:
            formatted_results.append({
                "title": result['metadata'].get('title', '未知'),
                "type": result['metadata'].get('source_type', 'unknown'),
                "content": result['content'][:300] + "..." if len(result['content']) > 300 else result['content'],
                "metadata": result['metadata']
            })
        
        return {
            "query": query,
            "results": formatted_results,
            "total_found": len(formatted_results)
        }
        
    except Exception as e:
        logging.error(f"搜尋錯誤：{e}")
        raise HTTPException(status_code=500, detail=f"搜尋失敗：{str(e)}")

if __name__ == "__main__":
    # 開發模式執行
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
