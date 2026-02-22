// src/amazon/srp/discovery.ts

/**
 * 아마존 SRP에서 상품 카드들의 루트 요소를 찾습니다.
 * 주요 타겟: 클래스 's-result-item'을 가진 요소들 중 광고가 아닌 실제 상품
 */
export const findCardRoots = (container: Document | HTMLElement): HTMLElement[] => {
  // s-result-item은 아마존 검색 결과의 표준 단위입니다.
  const items = Array.from(container.querySelectorAll('.s-result-item'));
  
  return items.filter((item) => {
    const el = item as HTMLElement;
    // ASIN 데이터가 있는 것만 진짜 상품으로 간주 (광고나 빈 섹션 제외)
    const asin = el.dataset.asin;
    return !!asin && asin.length > 0;
  }) as HTMLElement[];
};

/**
 * 무한 스크롤(Lazy Loading)을 감지하기 위한 관찰 대상 루트를 반환합니다.
 */
export const getSrpObserverRoot = (doc: Document): HTMLElement | null => {
  return doc.querySelector('.s-main-slot') || doc.body;
};