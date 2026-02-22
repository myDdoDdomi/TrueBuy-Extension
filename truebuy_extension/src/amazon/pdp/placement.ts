// src/amazon/pdp/placement.ts

export interface AlternativeProduct {
  asin: string;
  title: string;
  rating: number;
}

export interface AnalysisResult {
  asin: string;
  title: string;
  rating: number;
  review_count: number;
  reliability_score: number;
  analysis_summary: string;
  integrity_verdict: string;
  product_sentiment: string;
  category: string;
  alternatives: AlternativeProduct[];
  last_updated: string;
  error?: string; // 에러 메시지 처리를 위한 필드 추가
}

/**
 * 로컬 상품 정보를 기반으로 기초 신뢰 점수 계산
 */
const calculateLocalScore = () => {
  let score = 70; 
  const ratingText = document.querySelector('#acrCustomerReviewText')?.textContent || "";
  const ratingValueText = document.querySelector('.a-icon-alt')?.textContent || "0";
  
  const reviewCount = parseInt(ratingText.replace(/[^0-9]/g, '')) || 0;
  const rating = parseFloat(ratingValueText.split(' ')[0]) || 0;

  const shipsFrom = document.querySelector('#tabular-buybox-container .tabular-buybox-text[style*="word-break"]')
    ?.textContent?.toLowerCase() || "";
  const isAmazonShipping = shipsFrom.includes("amazon");

  if (reviewCount > 1000) score += 20;
  else if (reviewCount < 50) score -= 25;

  if (rating >= 4.5) score += 15;
  else if (rating < 4.0) score -= 30;

  if (isAmazonShipping) score += 15;

  return Math.min(Math.max(score, 0), 100);
};

/**
 * 카테고리 추출 헬퍼
 */
const getTargetKeyword = () => {
  const breadcrumbs = Array.from(document.querySelectorAll('#wayfinding-breadcrumbs_container li a'))
    .map(el => el.textContent?.trim())
    .filter(t => t && !['Back to results', 'Home', 'Departments'].includes(t));

  if (breadcrumbs.length > 0) {
    const lastCrumb = breadcrumbs[breadcrumbs.length - 1] || "";
    if (lastCrumb.length > 30 && breadcrumbs.length > 1) {
      return breadcrumbs[breadcrumbs.length - 2];
    }
    return lastCrumb;
  }

  const title = document.querySelector('#productTitle')?.textContent?.trim() || "";
  const cleanTitle = title
    .replace(/(For|With|Compatible|and|New|Latest|Pro|Max|Mini)/gi, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 2)
    .join(" ");
  
  return cleanTitle.length > 0 ? cleanTitle : "Products";
};

/**
 * 상태별 아이콘 매핑
 */
const getStatusIcon = (verdict: string) => {
  const v = verdict.toLowerCase();
  if (v.includes("waiting")) return "⏳";
  if (v.includes("authentic")) return "🛡️";
  if (v.includes("suspicious")) return "🔍";
  return "🚫"; // High Risk
};

/**
 * 아마존 PDP 페이지에 TrueBuy UI 주입
 */
export const injectPdpUI = (analysis: AnalysisResult | null | { error: string }) => {
  const buyBox = document.querySelector('#buybox_feature_div') || document.querySelector('#desktop_buybox');
  if (!buyBox || document.querySelector('.truebuy-root')) return;

  const localScore = calculateLocalScore();
  const ratingText = document.querySelector('#acrCustomerReviewText')?.textContent || "";
  const reviewCount = parseInt(ratingText.replace(/[^0-9]/g, '')) || 0;

  // 기본 변수 설정
  let productScore = localScore;
  let integrityVerdict = "";
  let summary = "";
  let category = getTargetKeyword();
  let searchKeyword = `Best ${category} 2026`;
  const btnLine1 = 'Verified Best-in-Class :';
  
  // 기본 테마 (분석 전/로딩 중에는 중립적인 파란색 적용)
  let theme = { color: "#0088FF", bg: "#E6F3FF", border: "#B3D9FF" };

  // --- [분석 상태별 로직 분기] ---
  if (analysis === null) {
    // [1] 분석 대기 중 (Waiting) 상태
    integrityVerdict = "Waiting...";
    summary = "Analyzing product reviews via TrueBuy AI...";
  } else if ('error' in analysis) {
    // [1.5] 에러 상태 추가
    integrityVerdict = "Analysis Failed";
    summary = analysis.error || "Unable to analyze reviews at this time.";
    theme = { color: "#555555", bg: "#F2F4F8", border: "#E0E3E9" };
  } else {
    // [2] 분석 완료 상태
    integrityVerdict = analysis.integrity_verdict || analysis.verdict || 'Authentic';
    summary = analysis.analysis_summary || analysis.summary || "AI analysis completed.";
    
    // 점수 합산 (로컬 40% + AI 감성 60%)
    const sentimentMap: Record<string, number> = { "Positive": 95, "Mixed": 60, "Negative": 30 };
    const sentimentScore = sentimentMap[analysis.product_sentiment] || 50;
    productScore = Math.round((localScore * 0.4) + (sentimentScore * 0.6));

    // 분석된 카테고리 반영
    if (analysis.category) {
      category = analysis.category;
      searchKeyword = `Best ${category} 2026`;
    }

    // 점수 및 결과에 따른 테마 변경
    if (productScore < 60 || integrityVerdict.toLowerCase().includes("high risk")) {
      theme = { color: "#FF4757", bg: "#FFEDEE", border: "#FFC1C6" }; // Warning (Red)
    } else if (productScore < 80) {
      theme = { color: "#0088FF", bg: "#E6F3FF", border: "#B3D9FF" }; // Good (Blue)
    } else {
      theme = { color: "#00B894", bg: "#E6F7F4", border: "#B2EBDC" }; // Excellent (Green)
    }
  }

  // 리뷰가 너무 적은 경우 예외 처리
  if (reviewCount < 10) {
    integrityVerdict = 'Too Few Reviews';
    productScore = 0;
    theme = { color: "#555555", bg: "#F2F4F8", border: "#E0E3E9" };
    summary = 'Not enough reviews to analyze. Check alternatives for more verified feedback.';
  }

  // 분석 결과가 있고 신뢰도가 낮을 때만 추천 섹션 노출
  const showRecommendation = analysis !== null && !('error' in analysis) && (productScore < 80 || integrityVerdict !== 'Authentic');

  // UI 생성 및 스타일 적용
  const container = document.createElement('div');
  container.className = 'truebuy-root';
  container.style.cssText = `
    border: 1px solid ${theme.border};
    background: ${theme.bg};
    padding: 20px;
    border-radius: 8px;
    font-family: "Amazon Ember", Arial, sans-serif;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    margin-bottom: 10px;
  `;

  const searchUrl = `/s?k=${encodeURIComponent(searchKeyword)}&rh=p_72%3A1248879011%2Cp_6%3AATVPDKIKX0DER&s=review-count-rank&tag=truebuy04-20`;
  const icon = (reviewCount < 10) ? "⚠️" : getStatusIcon(integrityVerdict);

  container.innerHTML = `
    <div style="display: flex; align-items: center;">
      <span style="font-size: 13px; font-weight: 700; color: #555; margin-right: 8px;">Review Trust:</span>
      <span style="display: flex; align-items: center; gap: 6px; font-size: 18px; font-weight: 900; color: ${theme.color};">
        <span>${icon}</span>
        <span>${integrityVerdict}</span>
      </span>
    </div>
    
    <div style="font-size: 13px; line-height: 1.5; color: #333; margin-top: 12px;">
      ${summary}
    </div>

    ${showRecommendation ? `
      <div style="background: white; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; padding: 12px; margin-top: 15px;">
        <p style="font-size: 11.5px; color: #565959; margin: 0 0 10px 0;">View our AI-verified top pick:</p>
        <a href="${searchUrl}" target="_blank" style="display: block; text-align: center; background: #FFD814; border: 1px solid #FCD200; border-radius: 20px; padding: 12px; color: #0F1111; text-decoration: none;">
          <span style="font-size: 11px; font-weight: 400; display: block;">${btnLine1}</span>
          <span style="font-size: 15px; font-weight: 900; display: block;">${category}</span>
        </a>
      </div>
    ` : ''}
  `;

  const disclosure = document.createElement('div');
  disclosure.innerText = "As an Amazon Associate, I earn from qualifying purchases";
  disclosure.style.cssText = "font-size: 9px; color: #767676; text-align: center; margin-top: 4px;";

  const wrapper = document.createElement('div');
  wrapper.appendChild(container);
  wrapper.appendChild(disclosure);

  buyBox.prepend(wrapper);
};