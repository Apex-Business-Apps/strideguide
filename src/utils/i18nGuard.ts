import { useEffect } from 'react';

// i18n guard: highlights any raw key leaking to UI (e.g., "app.badges.offline")
export function assertHumanizedCopy(root = document.body) {
  const bad = [];
  const isKey = (t: string) => /\b[a-z0-9]+(\.[a-z0-9_]+)+\b/i.test(t); // foo.bar.baz
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const s = n.textContent?.trim();
      if (s && isKey(s)) bad.push({ node: n, text: s });
    }
    n.childNodes.forEach(walk);
  };
  walk(root);
  if (bad.length) {
    console.warn("[i18n] Unresolved keys rendered:", bad.map(b => b.text));
    // Optional: visually flag in dev builds
    if (import.meta.env.DEV) {
      bad.forEach(({ node }) => {
        const span = document.createElement('span');
        span.style.background = '#FFEDD5';
        span.style.color = '#9A3412';
        span.style.padding = '2px 4px';
        span.style.borderRadius = '6px';
        span.title = 'Unresolved i18n key';
        span.textContent = node.textContent || '';
        node.parentNode?.replaceChild(span, node);
      });
    }
  }
  return bad.length === 0;
}

// Hook to run the guard on component updates
export function useI18nGuard() {
  useEffect(() => {
    if (import.meta.env.DEV) {
      const timer = setTimeout(() => {
        assertHumanizedCopy();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);
}