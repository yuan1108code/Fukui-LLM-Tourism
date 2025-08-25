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
import base64
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Response, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

# 加入專案根目錄到 Python 路徑
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))
print(f"Project root: {project_root}")
print(f"Python path: {sys.path}")

try:
    from src.Vector_Database.ChromaDB_v1 import ChromaDBManager
    print("✅ ChromaDB 模組載入成功")
except ImportError as e:
    print(f"⚠️ ChromaDB 模組載入失敗: {e}")
    print("將建立簡化版本的服務")
    ChromaDBManager = None

# 載入環境變數
load_dotenv()

# 全域變數
chroma_manager = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """應用程式生命週期管理"""
    global chroma_manager
    try:
        print("🚀 初始化 ChromaDB 向量資料庫...")
        
        if ChromaDBManager is None:
            print("⚠️ ChromaDB 管理器無法載入，使用模擬模式")
            yield
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
    
    yield  # 應用程式執行中
    
    # 清理程式碼（如果需要的話）
    print("🔄 應用程式關閉中...")

# FastAPI 應用程式
app = FastAPI(
    title="福井觀光智能助手 API",
    description="提供 ChromaDB 向量資料庫和 OpenAI GPT-4o-mini 問答功能",
    version="1.0.0",
    lifespan=lifespan
)

# 設定 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生產環境中應該限制特定域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 設定靜態檔案服務 - 提供景點照片
data_path = Path(__file__).parent.parent / "data"
if data_path.exists():
    app.mount("/data", StaticFiles(directory=str(data_path)), name="data")

# Pydantic 模型
class ChatRequest(BaseModel):
    message: str
    include_sources: bool = True
    user_location: Optional[Dict[str, float]] = None  # {"latitude": 35.xx, "longitude": 136.xx}
    timestamp: Optional[str] = None

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

class SelectedLocation(BaseModel):
    id: str
    name: str
    city: str
    coordinates: Dict[str, float]

class TravelDay(BaseModel):
    id: str
    date: str
    locations: List[SelectedLocation]

class StoryRequest(BaseModel):
    travelDays: List[TravelDay]
    travel_date: Optional[str] = None

class StoryResponse(BaseModel):
    story: str
    success: bool = True
    error: Optional[str] = None

# 全域變數
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
        
        # 載入並處理檔案（使用限制資料量以提升效能）
        locations_data, shrines_data = chroma_manager.load_and_process_files(
            str(locations_file), str(shrines_file), max_locations=50, max_shrines=50
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
    """聊天問答端點 - 支援時間和位置感知"""
    if chroma_manager is None:
        raise HTTPException(status_code=503, detail="ChromaDB 管理器未初始化")
    
    try:
        # 增強查詢訊息，加入時間和位置資訊
        enhanced_message = request.message
        
        # 加入時間資訊（如果提供）
        if request.timestamp:
            enhanced_message += f"\n\n[時間資訊: {request.timestamp}]"
        
        # 加入位置資訊（如果提供）
        location_context = ""
        if request.user_location:
            lat = request.user_location.get('latitude')
            lng = request.user_location.get('longitude')
            if lat and lng:
                location_context = f"\n\n[User location: Latitude {lat:.4f}, Longitude {lng:.4f}]"
                enhanced_message += location_context
                
                # 檢查使用者是否在福井縣境內或附近
                if is_near_fukui(lat, lng):
                    enhanced_message += "\n[Note: User is currently in or near Fukui Prefecture, please prioritize recommending nearby attractions]"
        
        # 搜尋相關文件 - 使用地理位置感知搜尋
        relevant_docs = chroma_manager.search_similar_with_location(
            enhanced_message, 
            n_results=5,
            distance_threshold_km=50.0 if request.user_location else 20.0
        )
        
        if not relevant_docs:
            return ChatResponse(
                answer="Sorry, I couldn't find relevant information. Please try asking other questions about Fukui Prefecture tourist attractions or shrines.",
                sources=[],
                success=True
            )
        
        # 建立系統提示，包含時間和位置感知
        system_prompt = f"""You are a professional Fukui Prefecture tourism guide AI assistant. Please answer questions based on the following information:

1. Time Awareness:
   - If seasonal activities are mentioned, consider the current time {request.timestamp or '(no time information provided)'}
   - Recommend the most suitable attractions and activities based on the season
   - Remind users to pay attention to operating hours and seasonal closure information

2. Location Awareness:
   {f"- User location: {location_context}" if location_context else "- No user location information provided"}
   - If the user is in Fukui Prefecture, prioritize nearby attractions
   - Provide specific transportation guidance and distance information
   - Consider actual transportation convenience

3. Response Style:
   - Respond in English
   - Provide detailed and practical information
   - Include transportation methods, opening hours, and feature introductions
   - Appropriately include local cultural background"""
        
        # 使用 GPT 生成專業導遊式回答
        answer = chroma_manager.ask_gpt(
            f"{system_prompt}\n\nUser question: {request.message}", 
            relevant_docs,
            use_location_aware_search=False  # 已經使用地理位置搜尋了
        )
        
        # 準備來源資訊
        sources = []
        if request.include_sources:
            for doc in relevant_docs:
                source_info = {
                    "title": doc['metadata'].get('title', 'Unknown'),
                    "type": doc['metadata'].get('source_type', 'unknown'),
                    "content": doc['content'][:200] + "..." if len(doc['content']) > 200 else doc['content']
                }
                
                # 如果有地理位置資訊，加入距離
                if request.user_location and 'location_score' in doc:
                    source_info['location_score'] = doc['location_score']
                
                sources.append(source_info)
        
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

def is_near_fukui(latitude: float, longitude: float, radius_km: float = 100.0) -> bool:
    """檢查使用者是否在福井縣附近
    
    Args:
        latitude: 使用者緯度
        longitude: 使用者經度  
        radius_km: 判定範圍（公里）
        
    Returns:
        bool: 是否在福井縣附近
    """
    # 福井縣大致的中心座標
    fukui_center_lat = 35.9044
    fukui_center_lng = 136.1892
    
    # 計算距離（簡化的球面距離計算）
    from math import radians, cos, sin, asin, sqrt
    
    # 轉換為弧度
    lat1, lng1 = radians(latitude), radians(longitude)
    lat2, lng2 = radians(fukui_center_lat), radians(fukui_center_lng)
    
    # Haversine 公式
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    distance_km = 2 * asin(sqrt(a)) * 6371  # 地球半徑約 6371 公里
    
    return distance_km <= radius_km

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
            location_name = google_data.get('name', 'Unknown Attraction')
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
                    "local_image": f"/images/{city}/{Path(local_image_path).name}" if local_image_path else None,
                    "unique_key": location.get('unique_key', ''),  # 加入原始的 unique_key
                    "original_location_name": original_data.get('location', location_name)  # 加入原始位置名稱
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

@app.get("/shrines", response_model=LocationsResponse)
async def get_shrines(limit: int = 500, search: Optional[str] = None):
    """取得寺廟神社位置資料用於地圖顯示"""
    try:
        # 載入寺廟神社資料
        import json
        base_path = Path(__file__).parent.parent
        shrines_file = base_path / "output" / "enhanced_shrines_full.json"
        
        if not shrines_file.exists():
            raise HTTPException(status_code=404, detail="寺廟資料檔案不存在")
            
        with open(shrines_file, 'r', encoding='utf-8') as f:
            shrines_data = json.load(f)
        
        shrines = []
        for i, shrine in enumerate(shrines_data[:limit]):
            if search and search.lower() not in shrine.get('name_jp', '').lower() and search.lower() not in shrine.get('name_en', '').lower():
                continue
            
            # 取得座標
            coordinates = None
            lat = shrine.get('lat')
            lng = shrine.get('lon')
            
            if lat is not None and lng is not None:
                try:
                    lat_float = float(lat)
                    lng_float = float(lng)
                    # 檢查座標是否在福井縣合理範圍內
                    if 35.0 <= lat_float <= 36.5 and 135.5 <= lng_float <= 137.0:
                        coordinates = {"lat": lat_float, "lng": lng_float}
                    else:
                        print(f"Shrine coordinates out of Fukui range for {shrine.get('name_jp')}: {lat_float}, {lng_float}")
                except (ValueError, TypeError):
                    print(f"Invalid shrine coordinates for {shrine.get('name_jp')}: {lat}, {lng}")
            
            # 建立內容描述
            content_parts = []
            if shrine.get('type'):
                content_parts.append(f"類型: {shrine.get('type')}")
            if shrine.get('address'):
                content_parts.append(f"地址: {shrine.get('address')}")
            if shrine.get('phone') and shrine.get('phone') != '-':
                content_parts.append(f"電話: {shrine.get('phone')}")
            if shrine.get('founded_year') and shrine.get('founded_year') != '不明':
                content_parts.append(f"創建年份: {shrine.get('founded_year')}")
            if shrine.get('enshrined_deities'):
                deities = [deity.get('name', '') for deity in shrine.get('enshrined_deities', [])]
                if deities:
                    content_parts.append(f"祭神: {', '.join(deities)}")
            
            content = '\n'.join(content_parts) if content_parts else shrine.get('description', '')[:200]
            
            # 處理最佳季節資訊
            best_seasons = shrine.get('best_seasons', [])
            if best_seasons:
                content += f"\n最佳參拜季節: {', '.join(best_seasons)}"
                
            shrines.append(LocationData(
                id=f"shrine_{i}",
                title=shrine.get('name_jp', 'Unknown Shrine'),
                content=content,
                metadata={
                    "source_type": "shrines",
                    "category": "shrine",
                    "type": shrine.get('type', '神社'),
                    "city": shrine.get('city', ''),
                    "prefecture": shrine.get('prefecture', '福井県'),
                    "name_en": shrine.get('name_en', ''),
                    "romaji": shrine.get('romaji', ''),
                    "address": shrine.get('address', ''),
                    "phone": shrine.get('phone', ''),
                    "url": shrine.get('url', ''),
                    "founded_year": shrine.get('founded_year', ''),
                    "goshuin": shrine.get('goshuin', False),
                    "admission_fee": shrine.get('admission_fee', 0),
                    "wheelchair_access": shrine.get('wheelchair_access', False),
                    "best_seasons": shrine.get('best_seasons', []),
                    "enshrined_deities": shrine.get('enshrined_deities', []),
                    "gate_open": shrine.get('gate_open', ''),
                    "gate_close": shrine.get('gate_close', '')
                },
                coordinates=coordinates
            ))
        
        return LocationsResponse(
            locations=shrines,
            total_count=len(shrines),
            success=True
        )
        
    except Exception as e:
        logging.error(f"取得寺廟資料錯誤：{e}")
        raise HTTPException(status_code=500, detail=f"取得寺廟資料失敗：{str(e)}")

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
                "title": result['metadata'].get('title', 'Unknown'),
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

@app.post("/api/generate-story", response_model=StoryResponse)
async def generate_story(
    locations: str = Form(...),
    travel_date_range: str = Form(...),
    images: List[UploadFile] = File(default=[])
):
    """Generate Fukui travel story book"""
    try:
        # Parse locations data
        locations_data = json.loads(locations)
        travel_date_range_data = json.loads(travel_date_range)
        
        if not locations_data:
            raise HTTPException(status_code=400, detail="At least one location is required")
        
        # Process uploaded images
        image_descriptions = []
        for i, image in enumerate(images):
            if image.content_type and image.content_type.startswith('image/'):
                # Read image content
                image_content = await image.read()
                # Convert image to base64
                image_base64 = base64.b64encode(image_content).decode('utf-8')
                image_descriptions.append(f"Image {i+1}: {image.filename}")
        
        # Prepare OpenAI API request
        import openai
        from openai import OpenAI
        
        # Set up OpenAI client
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if not openai_api_key:
            raise HTTPException(
                status_code=500, 
                detail="OpenAI API key not configured. Please set OPENAI_API_KEY environment variable."
            )
        client = OpenAI(api_key=openai_api_key)
        
        # Build travel itinerary string with dates
        itinerary_info = []
        locations_by_date = {}
        
        # Group locations by date
        for location in locations_data:
            date = location.get('date', 'Unknown Date')
            if date not in locations_by_date:
                locations_by_date[date] = []
            locations_by_date[date].append(location)
        
        # Create itinerary info
        for date, day_locations in locations_by_date.items():
            day_info = []
            for loc in day_locations:
                coords = loc.get('coordinates', {})
                lat = coords.get('latitude', 0)
                lng = coords.get('longitude', 0)
                day_info.append(f"  - {loc['name']} ({loc['city']}) - Located at latitude {lat:.6f}, longitude {lng:.6f}")
                if loc.get('description'):
                    day_info.append(f"    Personal experience: {loc['description']}")
            
            formatted_date = date
            try:
                # Try to format the date nicely
                from datetime import datetime
                date_obj = datetime.strptime(date, '%Y-%m-%d')
                formatted_date = date_obj.strftime('%B %d, %Y')
            except:
                pass
            
            itinerary_info.append(f"Date: {formatted_date}\n" + "\n".join(day_info))
        
        locations_info = "\n\n".join(itinerary_info) if itinerary_info else "No specific itinerary provided"
        
        # Build image information string
        images_info = "\n".join(image_descriptions) if image_descriptions else "No photos uploaded"
        
        # Get travel date range info
        start_date = travel_date_range_data.get('start', 'Unknown')
        end_date = travel_date_range_data.get('end', 'Unknown')
        travel_period = f"{start_date} to {end_date}"
        
        # Prepare system prompt
        system_prompt = """You are a professional travel writer specializing in creating engaging and informative travel stories.
Please create a beautiful travel story based on the provided Fukui prefecture location information and travel dates.

The story should include:
1. An engaging introduction mentioning the travel period
2. Detailed descriptions and experiences for each location, organized by date
3. Emotional journey progression
4. Deep appreciation for Fukui's culture and beauty
5. A warm and memorable conclusion

Writing style requirements:
- Use English language
- Beautiful, emotional language
- Clear structure and logical flow
- Suitable for sharing on social media or blogs
- Approximately 800-1200 words
- Include specific dates and locations in the narrative
- Make the story feel personal and authentic
- Organize the story by travel dates"""

        # Prepare user prompt
        user_prompt = f"""Please create a Fukui travel story for me based on the following travel information:

Travel Period: {travel_period}

Travel Itinerary:
{locations_info}

Photo Information:
{images_info}

Please create a vivid and engaging travel story that makes readers feel like they experienced this Fukui journey themselves. Include the specific dates and locations in a natural way throughout the narrative. Organize the story by travel dates to show the progression of the journey."""

        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=2000,
            temperature=0.8
        )
        
        # Extract generated story
        story = response.choices[0].message.content
        
        return StoryResponse(
            story=story,
            success=True
        )
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid travel days data format")
    except openai.AuthenticationError:
        raise HTTPException(status_code=500, detail="OpenAI API authentication failed, please check API key")
    except openai.RateLimitError:
        raise HTTPException(status_code=429, detail="API rate limit exceeded, please try again later")
    except openai.APIError as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        logging.error(f"Story generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Story generation failed: {str(e)}")

if __name__ == "__main__":
    # 開發模式執行 - 優化設定以提高穩定性
    import signal
    import sys
    
    def signal_handler(sig, frame):
        print('\n🔄 正在關閉服務...')
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("🚀 正在啟動福井觀光智能助手後端服務...")
    print(f"📡 服務將在 http://0.0.0.0:8001 啟動")
    print(f"📊 健康檢查端點: http://localhost:8001/health")
    print("按 Ctrl+C 停止服務")
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8001,
        reload=False,  # 禁用自動重新載入以提高穩定性
        log_level="info",
        access_log=True,
        server_header=False,
        date_header=False
    )
