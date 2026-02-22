// src/amazon/srp/placement.ts

import { SrpCard, parseCard } from './parse';

// 페이지 내 상품들의 통계를 계산하는 헬퍼 함수
const getPageStats = () => {
  const allCards = Array.from(document.querySelectorAll('.s-result-item'))
    .map(el => parseCard(el as HTMLElement))
    .filter(c => c !== null && c.reviewCount > 0);

  if (allCards.length === 0) return { avgRating: 4.2, avgReviews: 100 };

  const avgRating = allCards.reduce((acc, c) => acc + c!.rating, 0) / allCards.length;
  const avgReviews = allCards.reduce((acc, c) => acc + c!.reviewCount, 0) / allCards.length;

  return { avgRating, avgReviews };
};

export const ensureTrueBuyUI = (card: SrpCard) => {
  if (card.cardRoot.querySelector('.truebuy-root')) return;

  // 페이지 통계 가져오기
  const { avgRating, avgReviews } = getPageStats();

  const container = document.createElement('div');
  container.className = 'truebuy-root';
  const shadow = container.attachShadow({ mode: 'open' });

  // --- [상대적 허리스틱 판정 로직] ---
  let status = 'High';
  let color = '#00B894'; 
  let bgColor = '#E6F7F4'; 
  let borderColor = '#B2EBDC';

  if (card.reviewCount < 20) {
    status = 'Too few reviews';
    color = '#6b7280';
    bgColor = '#f3f4f6';
    borderColor = '#d1d5db';
  } 
  // Low: 절대 평점이 낮거나, 평균보다 현저히 리뷰가 적을 때
  else if (card.rating < 3.8 || (card.rating < 4.0 && card.reviewCount < avgReviews * 0.5)) {
    status = 'Low';
    color = '#FF4757'; 
    bgColor = '#FFEDEE';
    borderColor = '#FFC1C6';
  } 
  // Moderate: 시장 평균 근처이거나 리뷰 수가 조금 부족할 때
  else if (card.rating < 4.3 || card.reviewCount < avgReviews) {
    status = 'Moderate';
    color = '#0088FF'; 
    bgColor = '#E6F3FF';
    borderColor = '#B3D9FF';
  }
  // High: 평점과 리뷰 수 모두 시장 평균 이상일 때
  else {
    status = 'High';
    // 기본 설정값 사용
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display: flex; /* 고정 너비를 위해 flex로 통일 */
    flex-direction: column;
    max-width: 257px; /* 요구하신 257px 고정 */
    box-sizing: border-box; /* 패딩 포함 너비 계산 */
    background: ${bgColor}; 
    border: 1px solid ${borderColor}; 
    border-radius: 4px;
    padding: 8px 12px; /* 가독성을 위해 패딩 약간 조정 */
    margin-top: 6px; 
    font-family: "Amazon Ember", Arial, sans-serif;
    font-size: 11px; 
    color: ${color};
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    overflow: hidden; /* 내부 텍스트 돌출 방지 */
  `;

  const topRow = document.createElement('div');
  topRow.style.cssText = `
  display: flex; 
  justify-content: space-between; /* 양 끝 정렬의 핵심 */
  align-items: center; 
  width: 100%; /* 부모 너비(257px)를 가득 채움 */
  font-weight: 700; 
  white-space: nowrap;
  box-sizing: border-box;
  `;
  topRow.innerHTML = `<span>🔍 Pre-Check: ${status}</span>`;

  const listArea = document.createElement('div');
  listArea.style.cssText = `display: none; margin-top: 8px; padding-top: 8px; border-top: 1px solid ${color}44; font-size: 11px; color: #1f2937; min-width: 180px;`;

  const disclosure = document.createElement('div');
  disclosure.style.cssText = "display: none; font-size: 9px; color: #767676; text-align: center;";
  disclosure.innerText = "As an Amazon Associate, I earn from qualifying purchases";

  if (status !== 'High') {
    const btn = document.createElement('span');
    btn.style.cssText = `cursor: pointer; color: #007185; font-size: 10px; font-weight: bold; margin-left: 4px; text-decoration: underline;`;
    btn.textContent = 'Alternatives ▼';
    
    btn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      if (listArea.style.display === 'none') {
        const allCardElements = Array.from(document.querySelectorAll('.s-result-item'));
        const highQualityCards = allCardElements
          .map(el => parseCard(el as HTMLElement))
          .filter(c => c !== null && c.rating >= 4.4 && c.reviewCount >= avgReviews && c.asin !== card.asin)
          .sort((a, b) => (b?.reviewCount || 0) - (a?.reviewCount || 0))
          .slice(0, 3);

        if (highQualityCards.length > 0) {
          listArea.innerHTML = `<div style="margin-bottom:6px; font-weight:bold;">Top Trusted Alternatives:</div>`;
          highQualityCards.forEach((c, idx) => {
            const item = document.createElement('div');
            item.style.cssText = `margin: 4px 0; display: flex; justify-content: space-between; gap: 8px;`;
            const link = document.createElement('a');
            link.href = `/dp/${c!.asin}?tag=truebuy04-20`;
            link.target = '_blank';
            link.style.cssText = `flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color: #007185; text-decoration: none;`;
            link.textContent = `${idx + 1}. ${c!.title}`;
            const info = document.createElement('span');
            info.style.cssText = `white-space:nowrap; color:#374151; font-weight: bold;`;
            info.textContent = `⭐${c!.rating}`;
            item.appendChild(link); item.appendChild(info); listArea.appendChild(item);
          });
        } else {
          listArea.innerHTML = `<div>No direct alternatives found on this page.</div>`;
        }

        // Add 2-Tier Button to SRP with Affiliate Tag
        const btnLine1 = 'Verified Best-in-Class :';
        const category = card.title.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).slice(0, 3).join(" ");
        const searchUrl = `/s?k=${encodeURIComponent(category)}&rh=p_72:1248879011&tag=truebuy04-20`;

        const buttonHTML = `
          <a href="${searchUrl}" target="_blank" style="display: block; text-align: center; background: #FFD814; border: 1px solid #FCD200; border-radius: 20px; padding: 6px; margin-top: 4px; color: #0F1111; text-decoration: none;">
            <span style="font-size: 11px; font-weight: 400; display: block;">${btnLine1}</span>
            <span style="font-size: 15px; font-weight: 900; display: block;">${category}</span>
          </a>
        `;
        const btnContainer = document.createElement('div');
        btnContainer.innerHTML = buttonHTML;
        listArea.appendChild(btnContainer);

        listArea.style.display = 'block'; disclosure.style.display = 'block'; btn.textContent = 'Close ▲'; wrapper.style.display = 'flex'; 
      } else {
        listArea.style.display = 'none'; disclosure.style.display = 'none'; btn.textContent = 'Alternatives ▼'; wrapper.style.display = 'inline-flex';
      }
    };
    topRow.appendChild(btn);
  }

  wrapper.appendChild(topRow);
  wrapper.appendChild(listArea);
  shadow.appendChild(wrapper);
  shadow.appendChild(disclosure);

  if (card.ratingRow) {
    card.ratingRow.insertAdjacentElement('afterend', container);
  }
};