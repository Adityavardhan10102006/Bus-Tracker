/**
 * VJIT Theme System: Light, Dark, and System Preferences
 * Conforms to UI-SPEC-1.0 and WCAG 2.1 AA Accessibility Guidelines
 */

import { VJIT_COLORS, VJIT_DARK_COLORS } from './tokens.js';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'vjit_theme_preference';

/**
 * Resolves effective theme from user preference and host system state
 */
export function resolveTheme(preference: ThemePreference, systemIsDark: boolean): ResolvedTheme {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return systemIsDark ? 'dark' : 'light';
}

/**
 * Generates unified CSS variable definitions for light and dark themes
 */
export function generateThemeCss(): string {
  return `
    :root, [data-theme="light"] {
      --brand-navy: ${VJIT_COLORS.brandNavy};
      --brand-navy-sub: ${VJIT_COLORS.brandNavySub};
      --brand-navy-dark: ${VJIT_COLORS.brandNavyDark};
      --brand-navy-light: ${VJIT_COLORS.brandNavyLight};
      --brand-red: ${VJIT_COLORS.brandRed};
      --brand-red-dark: ${VJIT_COLORS.brandRedDark};
      --brand-red-light: ${VJIT_COLORS.brandRedLight};
      --canvas-white: ${VJIT_COLORS.canvasWhite};
      --canvas-light: ${VJIT_COLORS.canvasLight};
      --canvas-card: ${VJIT_COLORS.canvasCard};
      --canvas-elevated: #FFFFFF;
      --border-subtle: ${VJIT_COLORS.borderSubtle};
      --border-strong: ${VJIT_COLORS.borderStrong};
      --text-primary: ${VJIT_COLORS.textPrimary};
      --text-secondary: ${VJIT_COLORS.textSecondary};
      --text-muted: ${VJIT_COLORS.textMuted};
      --state-live: ${VJIT_COLORS.stateLive};
      --state-live-bg: ${VJIT_COLORS.stateLiveLight};
      --state-live-border: #86EFAC;
      --state-stale: ${VJIT_COLORS.stateStale};
      --state-stale-bg: ${VJIT_COLORS.stateStaleLight};
      --state-stale-border: #CBD5E1;
      --state-unavail: ${VJIT_COLORS.stateUnavail};
      --state-unavail-bg: ${VJIT_COLORS.stateUnavailLight};
      --state-unavail-border: #FCA5A5;
      --state-idle: ${VJIT_COLORS.stateIdle};
      --state-idle-bg: ${VJIT_COLORS.stateIdleLight};
      --state-idle-border: #FDE68A;
      --demo-purple: #7C3AED;
      --demo-purple-bg: #F3E8FF;
      --input-bg: #FFFFFF;
      --table-header-bg: #F8FAFC;
      --table-row-hover: #F8FAFC;
      --shadow-color: rgba(16, 55, 84, 0.08);
      --map-bg: #E2E8F0;
    }

    [data-theme="dark"] {
      --brand-navy: #38BDF8;
      --brand-navy-sub: #60A5FA;
      --brand-navy-dark: #0B132B;
      --brand-navy-light: #1E3A8A;
      --brand-red: ${VJIT_DARK_COLORS.brandRed};
      --brand-red-dark: ${VJIT_DARK_COLORS.brandRedDark};
      --brand-red-light: ${VJIT_DARK_COLORS.brandRedLight};
      --canvas-white: ${VJIT_DARK_COLORS.canvasWhite};
      --canvas-light: ${VJIT_DARK_COLORS.canvasLight};
      --canvas-card: ${VJIT_DARK_COLORS.canvasCard};
      --canvas-elevated: ${VJIT_DARK_COLORS.canvasElevated};
      --border-subtle: ${VJIT_DARK_COLORS.borderSubtle};
      --border-strong: ${VJIT_DARK_COLORS.borderStrong};
      --text-primary: ${VJIT_DARK_COLORS.textPrimary};
      --text-secondary: ${VJIT_DARK_COLORS.textSecondary};
      --text-muted: ${VJIT_DARK_COLORS.textMuted};
      --state-live: ${VJIT_DARK_COLORS.stateLive};
      --state-live-bg: ${VJIT_DARK_COLORS.stateLiveLight};
      --state-live-border: ${VJIT_DARK_COLORS.stateLiveBorder};
      --state-stale: ${VJIT_DARK_COLORS.stateStale};
      --state-stale-bg: ${VJIT_DARK_COLORS.stateStaleLight};
      --state-stale-border: ${VJIT_DARK_COLORS.stateStaleBorder};
      --state-unavail: ${VJIT_DARK_COLORS.stateUnavail};
      --state-unavail-bg: ${VJIT_DARK_COLORS.stateUnavailLight};
      --state-unavail-border: ${VJIT_DARK_COLORS.stateUnavailBorder};
      --state-idle: ${VJIT_DARK_COLORS.stateIdle};
      --state-idle-bg: ${VJIT_DARK_COLORS.stateIdleLight};
      --state-idle-border: ${VJIT_DARK_COLORS.stateIdleBorder};
      --demo-purple: #C084FC;
      --demo-purple-bg: #3B0764;
      --input-bg: #0F172A;
      --table-header-bg: #142238;
      --table-row-hover: #23354E;
      --shadow-color: rgba(0, 0, 0, 0.4);
      --map-bg: #0F172A;
    }
  `;
}

/**
 * Returns headless pre-rendering initialization script for head to prevent flash of wrong theme
 */
export function getThemePreloadScript(): string {
  return `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var isDark=p==='dark'||(p==='system'&&d);document.documentElement.setAttribute('data-theme',isDark?'dark':'light');document.documentElement.classList.toggle('theme-dark',isDark);document.documentElement.classList.toggle('theme-light',!isDark);}catch(e){}})();`;
}
