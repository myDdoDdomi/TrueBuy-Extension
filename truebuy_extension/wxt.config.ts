// wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'TrueBuy™ - Amazon AI Review Analyzer',
    version: '2.0.0',
    description: 'Instant AI-powered review summary and trust analysis for Amazon shoppers.',
    permissions: ['storage'], 
    host_permissions: [
      'https://*.amazon.com/*', 
      'https://*.amazon.co.uk/*',
      'https://*.amazon.ca/*',
      'https://*.amazon.com.au/*',
      'https://*.amazon.in/*',
      'https://*.amazon.sg/*',
      'https://*.amazon.ae/*',
      // [중요] 배포용 HTTPS 서버 주소를 추가합니다.
      'https://truebuy-backend-172879499858.us-central1.run.app/*'
    ],
  },
});