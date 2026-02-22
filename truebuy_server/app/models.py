from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# 1. 확장 프로그램에서 서버로 보내는 데이터 규격
class ProductData(BaseModel):
    asin: str
    title: str
    rating: float
    review_count: int
    reviews: List[str] = []

# 2. 추천 상품 정보 규격
class AlternativeProduct(BaseModel):
    asin: str
    title: str
    rating: float

# 3. 최종 분석 결과 규격 (응답용)
class AnalysisResult(BaseModel):
    asin: str
    title: str
    rating: float
    review_count: int
    reliability_score: int
    analysis_summary: str
    integrity_verdict: Optional[str] = "Authentic"
    product_sentiment: Optional[str] = "Mixed"
    category: Optional[str] = None
    alternatives: List[AlternativeProduct]
    last_updated: datetime = datetime.now()