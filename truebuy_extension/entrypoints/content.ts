import { findCardRoots, getSrpObserverRoot } from '@/src/amazon/srp/discovery';
import { parseCard } from '@/src/amazon/srp/parse';
import { ensureTrueBuyUI } from '@/src/amazon/srp/placement';
import { parsePdp } from '@/src/amazon/pdp/parse';
import { analyzeWithGemini } from '@/src/utils/ai';
import { injectPdpUI } from '@/src/amazon/pdp/placement';
import { getLocalAnalysis, saveLocalAnalysis } from '@/src/pipeline/storage';

export default defineContentScript({
  matches: ['*://*.amazon.com/*'],
  async main() {
    // 로그를 변경하여 최신 코드 적용 여부를 확인합니다.
    // console.log('🛡️ TrueBuy Active (v1.1 - L1 Cache Integrated)');

    const runPdpLogic = async () => {
      const path = window.location.pathname;
      if (!(path.includes('/dp/') || path.includes('/gp/product/'))) return;

      // console.log('🔍 PDP Detected. Checking cache & analysis...');
      
      const pdpData = parsePdp(); 
      if (!pdpData || !pdpData.asin) return;

      const asin = pdpData.asin.toUpperCase();

      // 1. [L1 Cache] 로컬 스토리지 확인 (가장 먼저 실행)
      // 서버 호출 전 이미 저장된 데이터가 있는지 확인합니다.
      const cachedData = await getLocalAnalysis(asin);
      
      if (cachedData) {
        // console.log(`✅ [TrueBuy] Using Local Cache for ASIN: ${asin}`);
        injectPdpUI(cachedData);
        return;
      }

      // 2. 캐시가 없으면 즉시 로컬 점수 UI 주입 (Instant Feedback)
      injectPdpUI(null);

      // 3. AI 분석 실행 (리뷰가 있을 때만)
      if (pdpData.reviews.length > 0) {
        try {
          // console.log(`🤖 Requesting Backend Analysis for ASIN: ${asin}`);
          const analysis = await analyzeWithGemini(pdpData);
          
          if (analysis) {
            // [L1 Cache 저장]
            await saveLocalAnalysis(asin, analysis);
            
            // UI 갱신 (기존 .truebuy-root 제거 후 재주입)
            const existingUI = document.querySelector('.truebuy-root');
            if (existingUI) existingUI.parentElement?.remove();
            
            injectPdpUI(analysis);
            // console.log('✨ AI Analysis updated successfully.');
          }
        } catch (error) {
          console.error('❌ AI Analysis failed:', error);
          
          // [수정] 에러 발생 시 UI 업데이트 (무한 로딩 방지)
          const existingUI = document.querySelector('.truebuy-root');
          if (existingUI) existingUI.parentElement?.remove();
          
          injectPdpUI({ error: "Server is busy or unreachable. Please try again later." } as any);
        }
      } else {
        // console.log('ℹ️ Zero reviews detected. Using Local Score only.');
      }
    };

    // --- [1] 초기 실행 ---
    runPdpLogic();

    // --- [2] SRP 로직: 검색 결과 페이지 ---
    const observerRoot = getSrpObserverRoot(document);
    if (observerRoot) {
      const processSrp = () => {
        const cards = findCardRoots(document);
        cards.forEach((cardRoot) => {
          if (cardRoot.dataset.truebuyProcessed === 'true') return;
          const data = parseCard(cardRoot);
          if (data) {
            ensureTrueBuyUI(data); 
            cardRoot.dataset.truebuyProcessed = 'true'; 
          }
        });
      };
      processSrp();
      const srpObserver = new MutationObserver(processSrp);
      srpObserver.observe(observerRoot, { childList: true, subtree: true });
    }

    // --- [3] SPA 네비게이션 대응 (URL 변경 감지) ---
    // 아마존은 페이지 새로고침 없이 상품을 이동하므로 URL 변화를 감시해야 합니다.
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        // console.log('🔄 Navigation detected, re-running analysis...');
        setTimeout(runPdpLogic, 1000); // DOM 로드 대기
      }
    });
    urlObserver.observe(document, { subtree: true, childList: true });
  },
});