import os
import json
import re
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from google import genai
from google.cloud import firestore

# app/database.py 파일에서도 동일한 DB ID 설정을 사용해야 캐싱이 작동합니다.
from app.database import get_cached_analysis, save_analysis
from app.models import AnalysisResult, AlternativeProduct

logger = logging.getLogger(__name__)

# --- [중요] 환경 변수 및 Firestore 초기화 ---
# .env에 설정하신 FIRESTORE_DB_ID를 읽어옵니다. 없으면 기본값인 '(default)'를 사용합니다.
db_id = os.environ.get("FIRESTORE_DB_ID", "truebuychromextension20260120")
project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "truebuypjt")

try:
    # database 파라미터를 명시하여 지정된 DB에 접속합니다.
    db = firestore.Client(project=project_id, database=db_id)
    logger.info(f"✅ Firestore client initialized: Project='{project_id}', DB='{db_id}'")
except Exception as e:
    logger.error(f"❌ Failed to initialize Firestore: {str(e)}")
    db = None

# Gemini SDK 클라이언트 설정
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

async def get_reliability_analysis(asin: str, title: str, rating: float, review_count: int, reviews: list[str] = None) -> AnalysisResult:
    # 1. Firestore 캐시 확인 (14일 유효)
    # 주의: app/database.py 내의 함수도 반드시 동일한 db_id를 바라보고 있어야 합니다.
    cached_data = get_cached_analysis(asin)
    if cached_data:
        last_updated = cached_data.get('last_updated')
        # Firestore에서 가져온 datetime 객체는 이미 timezone.utc인 경우가 많습니다.
        if last_updated and (datetime.now(timezone.utc) - last_updated < timedelta(days=14)):
            logger.info(f"📦 [Cache Hit] Using Cached Data for ASIN: {asin}")
            return AnalysisResult(**cached_data)

    if reviews is None: reviews = []
    reviews_text = "\n---\n".join(reviews) if reviews else "No text reviews available."
    
    # 2. AI 분석 프롬프트 (JSON 응답 유도)
    prompt = f"""
            Analyze Amazon reviews for: "{title}".
            Objective: Separate Review Integrity (authenticity) from Product Sentiment (quality).

            Return ONLY JSON in English:
            {{
            "integrity_score": number,
            "integrity_verdict": "Authentic" | "Suspicious" | "High Risk",
            "product_sentiment": "Positive" | "Mixed" | "Negative",
            "summary": "2-3 concise sentences. Focus on factual evidence of quality and risks.",
            "alternatives": [{{ "asin": "ASIN", "title": "Product Name", "rating": 4.5 }}],
            "category": "Short Category"
            }}

            Constraints: 30-50 words, English only, no conversational fillers.

            Reviews:
            {reviews_text}
            """
    
    try:
        # 3. Gemini API 호출 (재시도 로직 포함)
        response = None
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model="gemini-2.5-flash-lite", 
                    contents=prompt,
                    config={"response_mime_type": "application/json"}
                )
                break
            except Exception as e:
                if attempt < max_retries - 1 and ("503" in str(e) or "429" in str(e)):
                    wait_time = 2 ** attempt
                    logger.warning(f"⚠️ API Busy ({attempt+1}/{max_retries}). Retrying in {wait_time}s...")
                    await asyncio.sleep(wait_time)
                else:
                    raise e

        # JSON 파싱 및 데이터 매핑
        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            raw_text = re.sub(r"^```json|^```|```$", "", raw_text).strip()

        analysis_json = json.loads(raw_text)
        
        result = AnalysisResult(
            asin=asin, title=title, rating=rating, review_count=review_count,
            reliability_score=int(analysis_json.get('integrity_score', 70)),
            analysis_summary=analysis_json.get('summary', 'Analysis complete'),
            integrity_verdict=analysis_json.get('integrity_verdict', 'Authentic'),
            product_sentiment=analysis_json.get('product_sentiment', 'Mixed'),
            category=analysis_json.get('category', 'General'),
            alternatives=[
                AlternativeProduct(
                    asin=alt.get('asin', 'Unknown'), 
                    title=alt.get('title', 'Alternative Product'), 
                    rating=alt.get('rating', 0.0)
                ) for alt in analysis_json.get('alternatives', [])
            ],
            last_updated=datetime.now(timezone.utc)
        )
        
        # 4. 데이터베이스 저장
        # save_analysis 내부에서도 반드시 os.environ.get("FIRESTORE_DB_ID")를 사용하여 초기화해야 합니다.
        save_data = result.dict() if hasattr(result, 'dict') else result.model_dump()
        save_analysis(save_data)
        
        logger.info(f"✅ AI Analysis complete and saved for ASIN: {asin}")
        return result

    except Exception as e:
        logger.error(f"❌ AI Analysis failed for ASIN {asin}: {str(e)}")
        return AnalysisResult(
            asin=asin, title=title, rating=rating, review_count=review_count,
            reliability_score=50, 
            analysis_summary="Analysis failed. Basic info only.", 
            alternatives=[],
            last_updated=datetime.now(timezone.utc)
        )