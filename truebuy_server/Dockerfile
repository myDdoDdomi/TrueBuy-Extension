# 1. Python 3.11 환경 사용
FROM python:3.11-slim

# 2. 서버 내부 작업 디렉토리 설정
WORKDIR /server

# 3. 라이브러리 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. 전체 프로젝트 복사 (app 폴더 포함)
COPY . .

# 5. Cloud Run 포트 설정
ENV PORT 8080

# 6. [중요] 실행 경로 수정: app 폴더 안의 main 파일 내 app 객체 실행
# 구조가 app/main.py 이므로 'app.main:app'으로 지정합니다.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]