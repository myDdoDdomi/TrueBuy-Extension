// src/popup/popup.ts

document.addEventListener('DOMContentLoaded', () => {
  // Manifest에서 버전 정보 가져오기
  const manifest = chrome.runtime.getManifest();
  
  // 버전 표시 (HTML에 id="version" 요소가 있다고 가정)
  const versionElement = document.getElementById('version');
  if (versionElement) {
    versionElement.textContent = `v${manifest.version}`;
  }
});