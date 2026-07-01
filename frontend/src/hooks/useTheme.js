import { useEffect } from 'react';

const MQ = window.matchMedia('(prefers-color-scheme: dark)');

// Derive lighter/darker tones from a hex accent for bg, border, hover variants
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function applyAccent(hex) {
  if (!hex) return;
  const root = document.documentElement;
  const [r, g, b] = hexToRgb(hex);
  root.style.setProperty('--accent',        hex);
  root.style.setProperty('--accent-hover',  `color-mix(in srgb, ${hex} 85%, #000)`);
  root.style.setProperty('--accent-active', `color-mix(in srgb, ${hex} 75%, #000)`);
  root.style.setProperty('--accent-bg',     `rgba(${r},${g},${b},0.10)`);
  root.style.setProperty('--accent-border', `rgba(${r},${g},${b},0.25)`);
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    root.removeAttribute('data-theme');
  } else {
    if (MQ.matches) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
  }
}

export function useTheme() {
  useEffect(() => {
    const saved = (() => {
      try { return JSON.parse(localStorage.getItem('sf_settings') || '{}'); } catch { return {}; }
    })();
    applyTheme(saved.theme || 'light');
    if (saved.accentColor) applyAccent(saved.accentColor);

    const listener = () => {
      const current = (() => {
        try { return JSON.parse(localStorage.getItem('sf_settings') || '{}'); } catch { return {}; }
      })();
      if ((current.theme || 'system') === 'system') applyTheme('system');
    };
    MQ.addEventListener('change', listener);
    return () => MQ.removeEventListener('change', listener);
  }, []);
}
