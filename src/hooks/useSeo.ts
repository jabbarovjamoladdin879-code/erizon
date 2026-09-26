import { useEffect } from 'react';

const SITE = 'Erizon Mall';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Har sahifa uchun alohida title, meta-tavsif va Open Graph teglari */
export function useSeo(title: string, description?: string): void {
  useEffect(() => {
    const full = title ? `${title} — ${SITE}` : `${SITE} — Beruniy`;
    document.title = full;
    setMeta('property', 'og:title', full);
    setMeta('property', 'og:url', window.location.href);
    if (description) {
      setMeta('name', 'description', description);
      setMeta('property', 'og:description', description);
    }
  }, [title, description]);
}
