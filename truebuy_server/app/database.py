import os
import logging
from google.cloud import firestore

# 로거 설정
logger = logging.getLogger(__name__)

# 환경 변수에서 설정값 로드
# 배포 명령어(--set-env-vars)에서 전달한 값을 우선 사용합니다.
project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "truebuypjt")
database_id = os.environ.get("FIRESTORE_DB_ID", "truebuychromextension20260120")

db = None

try:
    # 1. Cloud Run 환경에서의 자동 인증 방식
    # 별도의 JSON 키 파일 경로가 없어도 구글 인프라의 권한을 자동으로 사용합니다.
    db = firestore.Client(
        project=project_id,
        database=database_id
    )
    logger.info(f"✅ Firestore Connected: Project='{project_id}', Database='{database_id}'")

except Exception as e:
    logger.error(f"🚨 Firestore Initialization Error: {e}")
    # 로컬 개발 환경에서 키 파일이 필요한 경우를 대비한 Fallback 로직
    key_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if key_path and os.util.path.exists(key_path):
        try:
            db = firestore.Client.from_service_account_json(key_path, database=database_id)
            logger.info("✅ Firestore Connected using Local JSON Key.")
        except Exception as local_e:
            logger.error(f"🚨 Local Firestore Init Failed: {local_e}")

def get_cached_analysis(asin: str):
    """Firestore에서 캐싱된 분석 결과 조회"""
    if db is None: 
        logger.error("❌ Firestore client is not initialized.")
        return None
    try:
        # 지정된 데이터베이스에서 'product_analyses' 컬렉션 조회
        doc = db.collection("product_analyses").document(asin).get()
        if doc.exists:
            return doc.to_dict()
        return None
    except Exception as e:
        logger.error(f"❌ Error fetching from Firestore: {e}")
        return None

def save_analysis(data: dict):
    """AI 분석 결과를 Firestore에 저장"""
    if db is None: 
        logger.error("❌ Firestore client is not initialized.")
        return
    try:
        # 'asin' 필드가 반드시 포함되어야 합니다.
        asin = data.get('asin')
        if not asin:
            logger.error("❌ Cannot save analysis: ASIN missing in data.")
            return

        # 지정된 데이터베이스에 데이터 저장
        db.collection("product_analyses").document(asin).set(data)
        logger.info(f"💾 Analysis for {asin} saved to Firestore.")
    except Exception as e:
        logger.error(f"❌ Error saving to Firestore: {e}")