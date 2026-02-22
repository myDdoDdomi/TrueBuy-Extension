//import { defineBackground } from 'wxt/client';

export default defineBackground(() => {
  //console.log('TrueBuy Background Service Worker Started');

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ANALYZE_PRODUCT') {
      const API_BASE_URL = import.meta.env.WXT_API_URL;
      
      fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message.payload),
      })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server Error: ${res.status}`);
        return await res.json();
      })
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.toString() }));

      return true; // 비동기 응답을 위해 true 반환 필수
    }
  });
});