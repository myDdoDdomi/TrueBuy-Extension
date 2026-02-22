// src/utils/ai.ts

/**
 * Gemini AI를 사용하여 리뷰의 진위 여부를 분석합니다.
 * 유료 사용자 체크 로직이 포함되어 있어, 무료 사용자의 경우 API 호출 없이 null을 반환합니다.
 */
export const analyzeWithGemini = async (data: { 
  asin: string, 
  title: string, 
  rating: number, 
  review_count: number, 
  reviews: string[] 
}) => {
  try {
    // Mixed Content(HTTPS->HTTP) 차단을 피하기 위해 Background Script로 요청 위임
    const response = await chrome.runtime.sendMessage({
      type: 'ANALYZE_PRODUCT',
      payload: data
    });

    if (response && response.success) {
      return response.data;
    }
    console.error("TrueBuy Server Analysis Failed (Background):", response?.error);
    return null;
  } catch (e) {
    console.error("Extension Message Passing Failed:", e);
    return null;
  }
};