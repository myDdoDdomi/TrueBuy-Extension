// src/amazon/pdp/parse.ts

export interface PdpData {
  asin: string;
  title: string;
  rating: number;
  review_count: number;
  reviews: string[];
}

export const parsePdp = (): PdpData | null => {
  // 1. ASIN 추출
  const asinEl = document.querySelector('#ASIN') as HTMLInputElement;
  const asin = asinEl?.value || window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1];
  
  if (!asin) return null;

  // 2. 상품 제목
  const title = document.querySelector('#productTitle')?.textContent?.trim() || 'Unknown Product';

  // 3. 평점 및 리뷰 수 추출 (서버 전송 필수 데이터)
  const ratingText = document.querySelector('#acrCustomerReviewText')?.textContent || "";
  const reviewCount = parseInt(ratingText.replace(/[^0-9]/g, '')) || 0;
  const ratingVal = parseFloat(document.querySelector('.a-icon-alt')?.textContent?.split(' ')[0] || "0");

  // 4. 리뷰 텍스트 수집 (최근/도움이 된 리뷰 타겟팅)
  const reviewEls = document.querySelectorAll('.review-text-content span');
  const reviews = Array.from(reviewEls)
    .map(el => el.textContent?.trim() || '')
    .filter(text => text.length > 30) // 너무 짧은 인사말 등 제외
    .slice(0, 10); // Gemini Nano 토큰 제한을 고려해 상위 10개 추출

  return { asin, title, rating: ratingVal, review_count: reviewCount, reviews };
};