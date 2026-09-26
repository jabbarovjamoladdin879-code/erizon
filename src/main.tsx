import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useUiStore } from './store/uiStore';
// Lokal (self-hosted) Inter shrifti — tashqi CDN'siz, CSP bilan mos; lotin, kirill va latin-ext
import '@fontsource-variable/inter';
import './index.css';

// Birinchi chizishdan oldin mavzuni qo'llash (miltillashsiz, inline skriptsiz — CSP bilan mos)
const { theme, lang } = useUiStore.getState();
document.documentElement.classList.toggle('dark', theme === 'dark');
document.documentElement.lang = lang;

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
