from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import traceback
import logging
import os
from dotenv import load_dotenv

# 내부 모듈 임포트
from app.models import AnalysisResult, ProductData
from app.services import get_reliability_analysis

# 1. 환경 변수 로드 (로컬 개발 시 .env 파일 사용)
load_dotenv()

# 2. 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 3. 보안 설정: 고정된 익스텐션 ID
EXTENSION_ID = "afpamdbbhdhbjdkgojgfddihhogkmkch"

app = FastAPI(
    title="TrueBuy Backend API",
    description="Amazon product reliability analysis proxy server",
    version="2.0.0"
)

# 4. CORS 설정: 특정 익스텐션 및 로컬 환경만 허용
# 운영 환경에서는 "*" 대신 구체적인 Origin을 명시하여 보안을 강화합니다.
environment = os.getenv("ENV", "production")

if environment == "development":
    origins = [
        f"chrome-extension://{EXTENSION_ID}",
        "http://localhost:3000",
        "http://127.0.0.1:8000",
    ]
else:
    origins = [f"chrome-extension://{EXTENSION_ID}"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["POST", "GET"], # 필요한 메서드만 허용
    allow_headers=["*"],
)

@app.post("/analyze", response_model=AnalysisResult)
async def analyze(request: ProductData):
    """
    아마존 상품 데이터를 받아 AI 분석 및 신뢰도 점수를 반환합니다.
    """
    logger.info(f"📥 Received analysis request for ASIN: {request.asin}")
    
    try:
        # 서비스 로직 실행: AI 분석 및 캐싱 처리 (Firestore L2 캐시 포함)
        result = await get_reliability_analysis(
            asin=request.asin,
            title=request.title,
            rating=request.rating,
            review_count=request.review_count,
            reviews=request.reviews
        )
        
        logger.info(f"✅ Successfully analyzed ASIN: {request.asin}")
        return result

    except Exception as e:
        # 🚨 상세 에러 로그 기록 (Cloud Run 로그에서 확인 가능)
        logger.error("🚨 SERVER INTERNAL ERROR DETECTED")
        logger.error(f"Error Message: {str(e)}", exc_info=True)
        
        # 클라이언트 보안을 위해 에러 메시지 정제
        raise HTTPException(
            status_code=500, 
            detail="AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
        )

@app.get("/health")
async def health_check():
    """
    Cloud Run의 상태 체크 및 버전 확인용 엔드포인트
    """
    return {
        "status": "online", 
        "version": "2.0.0",
        "environment": os.getenv("ENV", "production")
    }