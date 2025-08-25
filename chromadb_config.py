
# ChromaDB 優化設定
import chromadb
from chromadb.config import Settings

# 優化設定
settings = Settings(
    is_persistent=True,
    anonymized_telemetry=False,  # 關閉遙測
    allow_reset=True
)
