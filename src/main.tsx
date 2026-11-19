import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// Kendi sitesinde (https, iframe değil) çevrimdışı çalışma + "ana ekrana ekle"
try {
  if ('serviceWorker' in navigator && location.protocol === 'https:' && window.self === window.top) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
} catch { /* izin yok (ör. gömülü görünüm) */ }
