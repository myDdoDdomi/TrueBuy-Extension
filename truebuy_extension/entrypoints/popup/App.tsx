// entrypoints/popup/App.tsx
import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [version, setVersion] = useState('Loading...');

  useEffect(() => {
    // Manifest에서 버전 정보 가져오기
    try {
      const manifest = chrome.runtime.getManifest();
      setVersion(`v${manifest.version}`);
    } catch (e) {
      setVersion('Unknown');
    }
  }, []);

  return (
    <div className="popup-container" style={{ width: '240px', padding: '20px', fontFamily: '"Amazon Ember", Arial, sans-serif', textAlign: 'center', backgroundColor: '#fff' }}>
      <div className="header" style={{ fontWeight: 900, fontSize: '18px', color: '#00B894', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        <span className="logo">🛡️</span>
        <span className="title">TrueBuy</span>
      </div>
      
      <div className="slogan" style={{ fontSize: '12px', color: '#555', marginBottom: '20px', lineHeight: '1.4' }}>
        AI-Powered Amazon<br/>Review Analysis
      </div>

      <div className="status-card" style={{ background: '#E6F7F4', border: '1px solid #B2EBDC', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
        <div className="status-text" style={{ fontSize: '13px', fontWeight: 700, color: '#00886D', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <span>✅</span>
          <span>Active</span>
        </div>
      </div>

      <div className="footer" style={{ fontSize: '10px', color: '#999', borderTop: '1px solid #eee', paddingTop: '12px' }}>
        Version <span id="version">{version}</span>
      </div>
    </div>
  );
}

export default App;