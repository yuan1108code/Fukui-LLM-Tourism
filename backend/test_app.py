#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
福井觀光智能助手 - 簡化版後端服務 (測試用)
提供基本的 API 介面用於前端測試
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# FastAPI 應用程式
app = FastAPI(
    title="福井觀光智能助手 API (測試版)",
    description="簡化版 API 服務，用於前端測試",
    version="1.0.0"
)

# 設定 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 模擬資料
MOCK_LOCATIONS = [
    {
        "id": "location_1",
        "title": "永平寺",
        "content": "永平寺是福井縣著名的禪寺，由道元禪師於1244年創建。這裡是曹洞宗的根本道場，以其嚴謹的禪修生活而聞名。寺廟建築群坐落在群山環繞的幽靜環境中，擁有超過700年的歷史。",
        "metadata": {"source_type": "shrines", "title": "永平寺"},
        "coordinates": {"lat": 36.05, "lng": 136.33}
    },
    {
        "id": "location_2", 
        "title": "東尋坊",
        "content": "東尋坊是福井縣最著名的海岸景觀，以其壯麗的柱狀節理懸崖而聞名。這些高達25公尺的玄武岩柱狀節理，是約1200萬年前火山活動形成的天然奇觀。",
        "metadata": {"source_type": "locations", "title": "東尋坊"},
        "coordinates": {"lat": 36.24, "lng": 136.13}
    },
    {
        "id": "location_3",
        "title": "福井城址",
        "content": "福井城是福井市的象徵性歷史遺址，由結城秀康於1606年建造。雖然主要建築已不存在，但石垣和護城河仍然保存完好，現在是福井縣廳所在地。",
        "metadata": {"source_type": "locations", "title": "福井城址"},
        "coordinates": {"lat": 36.064, "lng": 136.221}
    }
]

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

# API 路由
@app.get("/")
async def root():
    """根路徑"""
    return {"message": "福井觀光智能助手 API (測試版) 正在執行中", "status": "active"}

@app.get("/health")
async def health_check():
    """健康檢查"""
    return {
        "status": "healthy",
        "database_stats": {"collection_name": "test", "document_count": len(MOCK_LOCATIONS)},
        "openai_configured": False,
        "mode": "test"
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """聊天問答端點 (模擬回應)"""
    try:
        # 簡單的關鍵字匹配
        query_lower = request.message.lower()
        
        if "永平寺" in query_lower or "禪寺" in query_lower:
            answer = "永平寺是福井縣最著名的禪寺之一，由道元禪師於1244年創建。這裡是曹洞宗的根本道場，以嚴謹的禪修生活而聞名。寺廟建築群位於群山環繞的幽靜環境中，是體驗日本禪宗文化的絕佳場所。"
            sources = [{"title": "永平寺", "type": "shrines", "content": MOCK_LOCATIONS[0]["content"]}]
        elif "東尋坊" in query_lower or "海岸" in query_lower or "懸崖" in query_lower:
            answer = "東尋坊是福井縣最壯麗的自然景觀，以其高達25公尺的柱狀節理懸崖而聞名。這些玄武岩formations是約1200萬年前火山活動的產物，被譽為日本海岸最美的景色之一。"
            sources = [{"title": "東尋坊", "type": "locations", "content": MOCK_LOCATIONS[1]["content"]}]
        elif "福井城" in query_lower or "歷史" in query_lower or "城址" in query_lower:
            answer = "福井城址是福井市的歷史象徵，由結城秀康於1606年建造。雖然主要建築已不存在，但保存完好的石垣和護城河仍能讓人感受到當年的宏偉規模。"
            sources = [{"title": "福井城址", "type": "locations", "content": MOCK_LOCATIONS[2]["content"]}]
        elif "神社" in query_lower:
            answer = "福井縣有許多歷史悠久的神社，包括著名的永平寺。這些宗教建築不僅是信仰中心，也是重要的文化遺產。每座神社都有其獨特的歷史背景和建築特色。"
            sources = [{"title": "永平寺", "type": "shrines", "content": MOCK_LOCATIONS[0]["content"]}]
        elif "景點" in query_lower or "觀光" in query_lower:
            answer = "福井縣擁有豐富的觀光資源，從東尋坊的壯麗海岸線到永平寺的禪宗文化，再到福井城址的歷史遺跡。每個景點都展現了福井獨特的自然美景與文化底蘊。"
            sources = [
                {"title": "東尋坊", "type": "locations", "content": MOCK_LOCATIONS[1]["content"]},
                {"title": "永平寺", "type": "shrines", "content": MOCK_LOCATIONS[0]["content"]}
            ]
        else:
            answer = f"感謝您的提問！目前我正在測試模式運行。您問的是：「{request.message}」\n\n我可以為您介紹福井縣的著名景點，例如：\n• 永平寺 - 著名的禪寺\n• 東尋坊 - 壯麗的海岸懸崖\n• 福井城址 - 歷史遺跡\n\n請嘗試詢問這些景點的相關資訊！"
            sources = []
        
        return ChatResponse(
            answer=answer,
            sources=sources if request.include_sources else [],
            success=True
        )
        
    except Exception as e:
        return ChatResponse(
            answer="抱歉，處理您的問題時發生錯誤。目前系統正在測試模式運行。",
            sources=[],
            success=False,
            error=str(e)
        )

@app.get("/locations", response_model=LocationsResponse)
async def get_locations(limit: int = 50, search: Optional[str] = None):
    """取得位置資料用於地圖顯示"""
    try:
        locations = []
        for loc in MOCK_LOCATIONS[:limit]:
            locations.append(LocationData(**loc))
        
        return LocationsResponse(
            locations=locations,
            total_count=len(locations),
            success=True
        )
        
    except Exception as e:
        return LocationsResponse(
            locations=[],
            total_count=0,
            success=False,
            error=str(e)
        )

@app.get("/search")
async def search_locations(query: str, limit: int = 10):
    """搜尋特定景點或神社"""
    try:
        results = []
        query_lower = query.lower()
        
        for loc in MOCK_LOCATIONS[:limit]:
            if query_lower in loc["title"].lower() or query_lower in loc["content"].lower():
                results.append({
                    "title": loc["title"],
                    "type": loc["metadata"]["source_type"],
                    "content": loc["content"][:300] + "..." if len(loc["content"]) > 300 else loc["content"],
                    "metadata": loc["metadata"]
                })
        
        return {
            "query": query,
            "results": results,
            "total_found": len(results)
        }
        
    except Exception as e:
        return {
            "query": query,
            "results": [],
            "total_found": 0,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    print("🏯 啟動福井觀光智能助手 API (測試版)")
    print("📡 服務網址: http://localhost:8000")
    print("📖 API 文件: http://localhost:8000/docs")
    uvicorn.run("test_app:app", host="0.0.0.0", port=8000, reload=True)
