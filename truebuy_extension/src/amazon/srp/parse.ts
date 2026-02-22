// src/amazon/srp/parse.ts

export const parseCard = (cardRoot: HTMLElement): SrpCard | null => {
  const asin = cardRoot.dataset.asin || cardRoot.querySelector('[data-csa-c-asin]')?.getAttribute('data-csa-c-asin');
  if (!asin) return null;

  // 1. 제목 추출
  const titleEl = cardRoot.querySelector('h2') || cardRoot.querySelector('.a-text-bold');
  const title = titleEl?.textContent?.trim() || 'Unknown Product';

  // 2. 평점 추출 (보내주신 HTML의 aria-label 타겟팅)
  const ratingEl = cardRoot.querySelector('[aria-label*="out of 5 stars"]');
  const ratingText = ratingEl?.getAttribute('aria-label') || "0";
  const rating = parseFloat(ratingText.match(/(\d+\.\d+|\d+)/)?.[0] || "0");

  // 3. 리뷰 수 추출 (보내주신 HTML 구조 완벽 대응)
  // 우선순위 1: aria-label="49 ratings" (가장 정확함)
  // 우선순위 2: (49) 형태의 텍스트
  const reviewLink = cardRoot.querySelector('a[aria-label*="ratings"], a[aria-label*="reviews"]');
  const reviewTextSpan = cardRoot.querySelector('.s-underline-text .a-size-mini');
  
  let reviewCount = 0;
  let rawText = "";

  if (reviewLink) {
    rawText = reviewLink.getAttribute('aria-label') || "";
  } 
  
  if (!rawText || rawText.includes("stars")) { // 별점 label과 헷갈릴 경우
    rawText = reviewTextSpan?.textContent || reviewLink?.textContent || "0";
  }

  // 숫자 추출 로직 (K, M 대응 포함)
  const sanitized = rawText.replace(/[(),]/g, '').toUpperCase();
  const numMatch = sanitized.match(/(\d+\.?\d*)/);
  
  if (numMatch) {
    let baseNum = parseFloat(numMatch[0]);
    if (sanitized.includes('K')) baseNum *= 1000;
    if (sanitized.includes('M')) baseNum *= 1000000;
    reviewCount = Math.floor(baseNum);
  }

  // 4. UI 삽입 위치 (보내주신 HTML의 reviews-block 바로 아래)
  const ratingRow = cardRoot.querySelector('[data-cy="reviews-block"]') || 
                    cardRoot.querySelector('.a-row.a-size-small');

  return { cardRoot, asin, title, rating, reviewCount, ratingRow: ratingRow as HTMLElement };
};