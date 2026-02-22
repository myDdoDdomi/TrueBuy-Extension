// truebuy_extension/src/pipeline/storage.ts
import type { AnalysisResult } from '../amazon/pdp/placement';

interface CacheEntry {
  data: AnalysisResult;
  timestamp: number;
  version: number;
}

const CACHE_VERSION = 1; 
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

/**
 * 로컬 스토리지에서 분석 결과 조회 (디버깅 강화 버전)
 */
export const getLocalAnalysis = async (asin: string): Promise<AnalysisResult | null> => {
  try {
    console.log(`[TrueBuy Cache] Checking cache for ASIN: ${asin}`);
    
    const result = await chrome.storage.local.get(asin);
    console.log(`📦 [TrueBuy Cache] Raw storage result:`, result);

    const entry = result[asin] as CacheEntry;

    if (!entry) {
      console.log(`[TrueBuy Cache] Cache miss for ${asin}`);
      return null;
    }

    // 1. 버전 체크
    if (entry.version !== CACHE_VERSION) {
      console.warn(`[TrueBuy Cache] Cache version mismatch for ${asin}.`);
      await chrome.storage.local.remove(asin);
      return null;
    }

    // 2. 유효기간 체크
    const age = Date.now() - entry.timestamp;

    if (age > CACHE_TTL_MS) {
      console.log(`[TrueBuy Cache] Cache expired for ${asin}`);
      await chrome.storage.local.remove(asin);
      return null;
    }

    console.log(`[TrueBuy Cache] Cache hit for ${asin}`);
    return entry.data;

  } catch (error) {
    console.error("🚨 [TrueBuy Cache] Critical error during retrieval:", error);
    return null;
  }
};

/**
 * 분석 결과를 로컬 스토리지에 저장 (디버깅 강화 버전)
 */
export const saveLocalAnalysis = async (asin: string, data: AnalysisResult): Promise<void> => {
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };
    
    await chrome.storage.local.set({ [asin]: entry });
    console.log(`[TrueBuy Cache] Saved analysis to cache for ${asin}`);
    
    // 저장 직후 잘 들어갔는지 한 번 더 확인 (선택 사항)
    const verify = await chrome.storage.local.get(asin);
    if (verify[asin]) {
        console.log(`✨ [TrueBuy Cache] Verification successful for ${asin}`);
    }
  } catch (error) {
    console.error("🚨 [TrueBuy Cache] Failed to save cache:", error);
  }
};