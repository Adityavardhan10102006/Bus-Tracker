/**
 * VJIT College Bus Tracker — Student & Faculty Mobile Experience
 * Conforms to UI-SPEC-1.0 and AG-MASTER-1.0-v2
 */
export function renderMobileHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>VJIT Bus Tracker — Student & Faculty</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#103754">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="VJIT Bus Tracker">
  <link rel="apple-touch-icon" href="/assets/vjit-logo.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <script>
    (function(){
      try {
        var p = localStorage.getItem('vjit_theme_preference') || 'system';
        var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var isDark = p === 'dark' || (p === 'system' && d);
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        document.documentElement.classList.toggle('theme-dark', isDark);
        document.documentElement.classList.toggle('theme-light', !isDark);
      } catch(e) {}
    })();
  </script>
  <style>
    :root, [data-theme="light"] {
      --brand-navy: #103754;
      --brand-navy-sub: #1E4E79;
      --brand-navy-dark: #0A2335;
      --brand-navy-light: #E0F2FE;
      --brand-red: #E51F35;
      --brand-red-dark: #B91C1C;
      --brand-red-light: #FEE2E2;
      --canvas-white: #FFFFFF;
      --canvas-light: #F8FAFC;
      --canvas-card: #FFFFFF;
      --canvas-elevated: #FFFFFF;
      --border-subtle: #E2E8F0;
      --border-strong: #CBD5E1;
      --text-primary: #0F172A;
      --text-secondary: #475569;
      --text-muted: #94A3B8;
      --state-live: #16A34A;
      --state-live-bg: #DCFCE7;
      --state-stale: #D97706;
      --state-stale-bg: #FEF3C7;
      --state-unavail: #DC2626;
      --state-unavail-bg: #FEE2E2;
      --state-idle: #64748B;
      --state-idle-bg: #F1F5F9;
      --demo-purple: #7C3AED;
      --demo-purple-bg: #F3E8FF;
      --input-bg: #FFFFFF;
      --input-border: #CBD5E1;
      --header-bg: #103754;
      --card-bg: #FFFFFF;
      --map-bg: #E2E8F0;
      --app-outer-bg: #0F172A;
      --shadow-sm: 0 2px 6px rgba(16, 55, 84, 0.05);
      --shadow-md: 0 4px 12px rgba(16, 55, 84, 0.12);
    }

    [data-theme="dark"] {
      --brand-navy: #38BDF8;
      --brand-navy-sub: #60A5FA;
      --brand-navy-dark: #0B132B;
      --brand-navy-light: #1E3A8A;
      --brand-red: #EF4444;
      --brand-red-dark: #DC2626;
      --brand-red-light: #7F1D1D;
      --canvas-white: #1E293B;
      --canvas-light: #0B132B;
      --canvas-card: #1E293B;
      --canvas-elevated: #243247;
      --border-subtle: #334155;
      --border-strong: #475569;
      --text-primary: #F8FAFC;
      --text-secondary: #CBD5E1;
      --text-muted: #94A3B8;
      --state-live: #22C55E;
      --state-live-bg: #052E16;
      --state-stale: #F59E0B;
      --state-stale-bg: #451A03;
      --state-unavail: #EF4444;
      --state-unavail-bg: #450A0A;
      --state-idle: #94A3B8;
      --state-idle-bg: #1E293B;
      --demo-purple: #C084FC;
      --demo-purple-bg: #3B0764;
      --input-bg: #0F172A;
      --input-border: #475569;
      --header-bg: #0E2238;
      --card-bg: #1E293B;
      --map-bg: #0F172A;
      --app-outer-bg: #030712;
      --shadow-sm: 0 2px 6px rgba(0, 0, 0, 0.35);
      --shadow-md: 0 4px 14px rgba(0, 0, 0, 0.55);
    }

    /* Smooth theme transitions */
    body, .app-viewport, header, .content-area, .bus-card-vertical, .tab-bar, .modal-card, .search-input, .route-chip, .timeline-container, .map-ctrl-btn {
      transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }

    @media (prefers-reduced-motion: reduce) {
      *, ::before, ::after {
        transition-duration: 0.001ms !important;
        animation-duration: 0.001ms !important;
      }
    }

    /* Theme Switcher Header Component */
    .theme-toggle-cluster {
      display: inline-flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 8px;
      padding: 2px;
      gap: 2px;
    }
    .theme-toggle-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      width: 26px;
      height: 24px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      font-size: 11px;
    }
    .theme-toggle-btn:hover {
      color: #FFFFFF;
      background: rgba(255, 255, 255, 0.15);
    }
    .theme-toggle-btn.active {
      background: #FFFFFF;
      color: #103754;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    [data-theme="dark"] .theme-toggle-btn.active {
      background: #38BDF8;
      color: #0B132B;
    }

    /* Dark theme specific component enhancements */
    [data-theme="dark"] body {
      background-color: var(--app-outer-bg);
    }
    [data-theme="dark"] header {
      background: var(--header-bg);
      border-bottom: 1px solid var(--border-subtle);
    }
    [data-theme="dark"] .home-greeting-card {
      background: linear-gradient(135deg, #132B45 0%, #0E2238 100%);
      border: 1px solid var(--border-subtle);
    }
    [data-theme="dark"] .search-input {
      background: var(--input-bg);
      border-color: var(--input-border);
      color: var(--text-primary);
    }
    [data-theme="dark"] .search-input:focus {
      border-color: #38BDF8;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.25);
    }
    [data-theme="dark"] .route-chip {
      background: var(--canvas-card);
      border-color: var(--border-subtle);
      color: var(--text-secondary);
    }
    [data-theme="dark"] .route-chip.active {
      background: #1E3A8A;
      border-color: #38BDF8;
      color: #93C5FD;
    }
    [data-theme="dark"] .bus-card-vertical {
      background: var(--canvas-card);
      border-color: var(--border-subtle);
      box-shadow: var(--shadow-sm);
    }
    [data-theme="dark"] .bus-card-vertical:hover {
      border-color: #38BDF8;
      box-shadow: var(--shadow-md);
    }
    [data-theme="dark"] .bus-id-badge {
      background: #1E3A8A;
      color: #38BDF8;
    }
    [data-theme="dark"] .bus-metrics-strip {
      background: var(--canvas-light);
    }
    [data-theme="dark"] .metric-strip-item-val {
      color: #38BDF8;
    }
    [data-theme="dark"] .bus-card-action-bar {
      border-color: var(--border-subtle);
    }
    [data-theme="dark"] .btn-track-action {
      background: #1E4E79;
    }
    [data-theme="dark"] .btn-track-action:hover {
      background: #2563EB;
    }
    [data-theme="dark"] .detail-top-nav {
      background: var(--canvas-card);
      border-color: var(--border-subtle);
    }
    [data-theme="dark"] .btn-back-to-list {
      color: #38BDF8;
    }
    [data-theme="dark"] .btn-back-to-list:hover {
      background: rgba(56, 189, 248, 0.15);
    }
    [data-theme="dark"] #detail-geometry-notice {
      background: var(--canvas-light);
      border-color: var(--border-subtle);
      color: var(--text-primary);
    }
    [data-theme="dark"] .map-tracker-container {
      background: var(--map-bg);
    }
    [data-theme="dark"] .leaflet-tile-pane {
      filter: brightness(0.65) invert(1) contrast(3.2) hue-rotate(200deg) saturate(0.28) brightness(0.75);
    }
    [data-theme="dark"] .map-ctrl-btn {
      background: var(--canvas-card);
      border-color: var(--border-strong);
      color: var(--text-primary);
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    }
    [data-theme="dark"] .map-ctrl-btn:hover {
      background: var(--canvas-elevated);
      color: #38BDF8;
    }
    [data-theme="dark"] .timeline-container {
      background: var(--canvas-card);
      border-color: var(--border-subtle);
    }
    [data-theme="dark"] .timeline-title {
      color: var(--text-primary);
    }
    [data-theme="dark"] .stop-dot {
      background: var(--canvas-card);
      border-color: var(--border-strong);
    }
    [data-theme="dark"] .stop-timeline-list::before {
      background: var(--border-subtle);
    }
    [data-theme="dark"] .stop-item-name {
      color: #F8FAFC;
    }
    [data-theme="dark"] .stop-item-meta {
      color: #94A3B8;
    }
    [data-theme="dark"] .bus-corridor-title {
      color: #F8FAFC;
    }
    [data-theme="dark"] .bus-reg-label {
      color: #94A3B8;
    }
    [data-theme="dark"] .tab-bar {
      background: var(--canvas-card);
      border-color: var(--border-subtle);
    }
    [data-theme="dark"] .tab-btn.active {
      color: #38BDF8;
    }
    [data-theme="dark"] .modal-card {
      background: var(--canvas-card);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
    }
    [data-theme="dark"] .modal-card h3 {
      color: var(--text-primary) !important;
    }
    [data-theme="dark"] .btn-close-modal {
      background: var(--border-subtle);
      color: var(--text-secondary);
    }
    [data-theme="dark"] .role-select-item {
      background: var(--canvas-light);
      border-color: var(--border-subtle) !important;
      color: var(--text-primary);
    }
    [data-theme="dark"] .role-select-item.active {
      border-color: #38BDF8 !important;
      background: rgba(56, 189, 248, 0.1);
    }
    [data-theme="dark"] .leaflet-popup-content-wrapper,
    [data-theme="dark"] .leaflet-popup-tip {
      background: #1E293B;
      color: #F8FAFC;
      box-shadow: 0 4px 14px rgba(0,0,0,0.6);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #0F172A;
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    }

    /* Outer Wrapper for responsive device framing */
    .app-viewport {
      width: 100%;
      max-width: 440px;
      min-height: 100vh;
      background: var(--canvas-light);
      display: flex;
      flex-direction: column;
      position: relative;
      box-shadow: 0 0 40px rgba(0, 0, 0, 0.4);
    }

    @media (min-width: 768px) {
      body {
        padding: 24px 0;
      }
      .app-viewport {
        min-height: 844px;
        height: 844px;
        border-radius: 36px;
        border: 10px solid #1E293B;
        overflow: hidden;
      }
      .desktop-frame-toggle-bar {
        display: flex;
        justify-content: center;
        margin-bottom: 12px;
        gap: 12px;
      }
    }

    .desktop-frame-toggle-bar {
      display: none;
    }

    .frame-btn {
      background: #334155;
      color: #F8FAFC;
      border: none;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 12px;
      cursor: pointer;
      font-weight: 500;
    }
    .frame-btn.active {
      background: var(--brand-red);
    }

    /* Top App Header */
    header {
      background: var(--brand-navy);
      color: var(--canvas-white);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-logo {
      height: 32px;
      width: auto;
      aspect-ratio: 241 / 194;
      object-fit: contain;
      background: white;
      padding: 2px 4px;
      border-radius: 4px;
    }

    .header-text h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 14.5px;
      font-weight: 700;
      letter-spacing: -0.01em;
      line-height: 1.2;
    }

    .header-text p {
      font-size: 10px;
      color: #93C5FD;
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .role-badge {
      background: rgba(255, 255, 255, 0.16);
      color: var(--canvas-white);
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Status Banners */
    .offline-banner {
      display: none;
      background: #FEE2E2;
      border-bottom: 1px solid #FCA5A5;
      color: #991B1B;
      padding: 8px 14px;
      font-size: 12px;
      font-weight: 600;
      align-items: center;
      gap: 8px;
    }

    /* Main Scrollable Content Area */
    .content-area {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* Home Greeting Banner */
    .home-greeting-card {
      background: linear-gradient(135deg, #103754 0%, #1E4E79 100%);
      color: white;
      padding: 16px;
      margin: 12px 14px 6px 14px;
      border-radius: 14px;
      box-shadow: 0 4px 12px rgba(16, 55, 84, 0.15);
    }

    .greeting-title {
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 700;
    }

    .greeting-subtitle {
      font-size: 12px;
      color: #BFDBFE;
      margin-top: 2px;
    }

    .greeting-status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 11px;
    }

    .greeting-pill {
      background: rgba(255, 255, 255, 0.2);
      padding: 3px 8px;
      border-radius: 12px;
      font-weight: 600;
      color: #E0F2FE;
    }

    /* Search Bar */
    .search-filter-bar {
      padding: 8px 14px 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .search-input-wrap {
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 10px 12px 10px 36px;
      border: 1px solid var(--border-strong);
      border-radius: 10px;
      font-size: 13.5px;
      outline: none;
      font-family: inherit;
      background: white;
      transition: all 0.2s;
    }

    .search-input:focus {
      border-color: var(--brand-navy);
      box-shadow: 0 0 0 2px var(--brand-navy-light);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: var(--text-muted);
    }

    .route-tabs-scroll {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 2px;
      scrollbar-width: none;
    }
    .route-tabs-scroll::-webkit-scrollbar {
      display: none;
    }

    .route-chip {
      background: var(--canvas-card);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 11.5px;
      font-weight: 500;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.15s;
    }

    .route-chip.active {
      background: var(--brand-navy);
      color: var(--canvas-white);
      border-color: var(--brand-navy);
      font-weight: 600;
    }

    /* Vertical Available Bus Cards List */
    .buses-list-section {
      padding: 0 14px 14px 14px;
    }

    .section-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 8px 0 10px 0;
    }

    .section-heading-text {
      font-size: 11.5px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.04em;
    }

    .buses-vertical-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .bus-card-vertical {
      background: var(--canvas-card);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 14px;
      box-shadow: 0 2px 6px rgba(16, 55, 84, 0.05);
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
    }

    .bus-card-vertical:hover, .bus-card-vertical:active {
      border-color: var(--brand-navy);
      box-shadow: 0 4px 12px rgba(16, 55, 84, 0.12);
      transform: translateY(-1px);
    }

    .bus-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .bus-badge-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .bus-id-badge {
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: var(--brand-navy);
      background: var(--brand-navy-light);
      padding: 3px 8px;
      border-radius: 6px;
    }

    .btn-star-bus {
      background: transparent;
      border: none;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      padding: 2px 4px;
      color: var(--text-muted);
      transition: transform 0.15s ease, color 0.15s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-star-bus:hover {
      transform: scale(1.2);
    }
    .btn-star-bus.starred {
      color: #F59E0B;
      filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.4));
    }

    .bus-reg-label {
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .status-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .badge-live {
      background: var(--state-live-bg);
      color: var(--state-live);
    }

    .badge-stale {
      background: var(--state-stale-bg);
      color: var(--state-stale);
    }

    .badge-unavail {
      background: var(--state-unavail-bg);
      color: var(--state-unavail);
    }

    .badge-idle {
      background: var(--state-idle-bg);
      color: var(--state-idle);
    }

    .badge-demo {
      background: var(--demo-purple-bg);
      color: var(--demo-purple);
    }

    .bus-corridor-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .bus-metrics-strip {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      background: var(--canvas-light);
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 10px;
      font-size: 11.5px;
    }

    .metric-strip-item-lbl {
      color: var(--text-muted);
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 600;
    }

    .metric-strip-item-val {
      color: var(--brand-navy);
      font-weight: 700;
      margin-top: 1px;
    }

    .bus-card-action-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 10px;
      font-size: 12px;
    }

    .freshness-indicator-text {
      color: var(--text-secondary);
      font-size: 11.5px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .btn-track-action {
      background: var(--brand-navy);
      color: white;
      border: none;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 11.5px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Bus Detail Screen Styling */
    .detail-top-nav {
      background: var(--canvas-card);
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .btn-back-to-list {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: none;
      border: none;
      color: var(--brand-navy);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 6px;
    }

    .btn-back-to-list:hover {
      background: var(--brand-navy-light);
    }

    /* Distinction Banner: Live Hardware vs Simulated Demo Data */
    .data-distinction-banner {
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      font-weight: 600;
      border-bottom: 1px solid transparent;
    }

    .distinction-demo {
      background: #F5F3FF;
      border-color: #DDD6FE;
      color: #6D28D9;
    }

    .distinction-live {
      background: #ECFDF5;
      border-color: #A7F3D0;
      color: #065F46;
    }

    .distinction-stale {
      background: #FFFBEB;
      border-color: #FDE68A;
      color: #92400E;
    }

    /* Leaflet & SVG Map Container */
    .map-tracker-container {
      position: relative;
      width: 100%;
      height: 260px;
      background: #E2E8F0;
    }

    #leaflet-map {
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    .map-controls-overlay {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .map-ctrl-btn {
      background: var(--canvas-card);
      border: 1px solid var(--border-strong);
      color: var(--brand-navy);
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    /* Timeline Stops */
    .timeline-container {
      background: var(--canvas-card);
      padding: 16px;
      border-top: 1px solid var(--border-subtle);
    }

    .timeline-title {
      font-family: 'Outfit', sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .stop-timeline-list {
      display: flex;
      flex-direction: column;
      position: relative;
      padding-left: 20px;
    }

    .stop-timeline-list::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 8px;
      bottom: 12px;
      width: 2px;
      background: var(--border-strong);
    }

    .stop-timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding-bottom: 14px;
      position: relative;
      cursor: pointer;
    }

    .stop-dot {
      position: absolute;
      left: -20px;
      top: 3px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: white;
      border: 2px solid var(--border-strong);
      z-index: 2;
    }

    .stop-timeline-item.departed .stop-dot {
      background: var(--text-muted);
      border-color: var(--text-muted);
    }

    .stop-timeline-item.next-stop .stop-dot {
      background: var(--state-live);
      border-color: white;
      box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.3);
    }

    .stop-timeline-item.destination .stop-dot {
      background: var(--brand-red);
      border-color: white;
      box-shadow: 0 0 0 3px rgba(229, 31, 53, 0.3);
    }

    .stop-item-content {
      flex: 1;
    }

    .stop-item-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .stop-item-meta {
      font-size: 11px;
      color: var(--text-secondary);
      margin-top: 1px;
    }

    /* Bottom Tab Bar */
    .tab-bar {
      background: var(--canvas-white);
      border-top: 1px solid var(--border-subtle);
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      padding: 6px 0;
      position: sticky;
      bottom: 0;
      z-index: 100;
    }

    .tab-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 10.5px;
      font-weight: 600;
      padding: 6px 0;
      cursor: pointer;
    }

    .tab-btn svg {
      width: 20px;
      height: 20px;
    }

    .tab-btn.active {
      color: var(--brand-navy);
    }

    /* Simulation Toolbar at Bottom */
    .demo-floating-bar {
      background: #1E293B;
      color: #F8FAFC;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
      border-top: 1px solid #334155;
    }

    .btn-step-demo {
      background: var(--brand-red);
      color: white;
      border: none;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Modal Overlay */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-overlay.open {
      display: flex;
    }

    .modal-card {
      background: var(--canvas-white);
      border-radius: 16px;
      width: 100%;
      max-width: 380px;
      padding: 24px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    }

    .btn-close-modal {
      width: 100%;
      margin-top: 12px;
      padding: 10px;
      background: var(--border-subtle);
      border: none;
      border-radius: 8px;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
    }
  </style>
</head>
<body>
  <!-- Desktop frame toggle -->
  <div class="desktop-frame-toggle-bar">
    <button class="frame-btn active" id="btn-toggle-frame">iPhone Mobile Frame</button>
    <a href="/admin" class="frame-btn" style="text-decoration:none;">Switch to Admin Console &rarr;</a>
    <a href="/" class="frame-btn" style="text-decoration:none;">Portal Home</a>
  </div>

  <div class="app-viewport" id="mobile-viewport">
    <!-- Header -->
    <header>
      <div class="header-brand">
        <img src="/assets/vjit-logo.png" alt="VJIT Logo" class="header-logo">
        <div class="header-text">
          <h1>VJIT BUS TRACKER</h1>
          <p>Vidya Jyothi Institute of Technology</p>
        </div>
      </div>
      <div class="header-actions">
        <div class="theme-toggle-cluster" role="radiogroup" aria-label="Appearance Theme">
          <button type="button" class="theme-toggle-btn" data-theme-choice="light" data-theme-btn="light" aria-label="Light mode" title="Light mode">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          </button>
          <button type="button" class="theme-toggle-btn" data-theme-choice="system" data-theme-btn="system" aria-label="Follow device theme" title="System mode (Auto)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          </button>
          <button type="button" class="theme-toggle-btn" data-theme-choice="dark" data-theme-btn="dark" aria-label="Dark mode" title="Dark mode">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          </button>
        </div>
        <button class="role-badge" id="btn-role-trigger">
          <span id="role-text">STU</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
      </div>
    </header>

    <!-- PWA Install Prompt Banner -->
    <div id="pwa-install-banner" style="display:none; background:linear-gradient(135deg, #1E4E79 0%, #103754 100%); color:white; padding:10px 14px; font-size:12px; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.15);">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:16px;">📲</span>
        <span>Install <strong>VJIT Bus Tracker</strong> for fast offline access</span>
      </div>
      <div style="display:flex; gap:6px;">
        <button id="btn-install-pwa" style="background:var(--brand-red); color:white; border:none; padding:4px 10px; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer;">Install</button>
        <button id="btn-dismiss-install" style="background:transparent; color:#CBD5E1; border:none; padding:4px 6px; font-size:13px; cursor:pointer;">&times;</button>
      </div>
    </div>

    <!-- Network Offline Banner -->
    <div class="offline-banner" id="offline-banner">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
      <span>Network disconnected. Showing cached timetable and stops.</span>
    </div>

    <!-- Main Content Area -->
    <div class="content-area" id="tab-content-area">
      <!-- 1. HOME SCREEN: BUS LIST & SEARCH -->
      <div id="tab-pane-buses">
        <div class="home-greeting-card">
          <div class="greeting-title" id="greeting-text">Hello, Student / Faculty 👋</div>
          <div class="greeting-subtitle">Vidya Jyothi Institute of Technology • Campus Transit</div>
          <div class="greeting-status-row">
            <span class="greeting-pill" id="greeting-active-count">● 4 of 6 Buses Live</span>
            <span style="color:#BFDBFE; font-size:10.5px;">Morning & Evening Corridors</span>
          </div>
        </div>

        <div class="search-filter-bar">
          <div class="search-input-wrap">
            <svg class="search-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="bus-search-input" class="search-input" placeholder="Search by bus number, corridor, or stop...">
          </div>
          <div class="route-tabs-scroll" id="route-chips-container">
            <button class="route-chip active" data-route="ALL">All Corridors</button>
            <button class="route-chip" data-route="FAVORITES" id="chip-filter-favorites" style="display:inline-flex; align-items:center; gap:4px;">★ Starred</button>
            <button class="route-chip" data-route="00000000-0000-4000-8000-000000000012">R-12 Mehdipatnam</button>
            <button class="route-chip" data-route="00000000-0000-4000-8000-000000000005">R-05 Kukatpally</button>
            <button class="route-chip" data-route="00000000-0000-4000-8000-000000000008">R-08 LB Nagar</button>
            <button class="route-chip" data-route="00000000-0000-4000-8000-000000000021">R-21 Secunderabad</button>
          </div>
        </div>

        <div class="buses-list-section">
          <div class="section-header-row">
            <span class="section-heading-text">Available Campus Buses (<span id="bus-count-num">6</span>)</span>
            <span id="btn-refresh-list" style="cursor:pointer; font-size:11.5px; color:var(--brand-navy); font-weight:600;">Live updates &#x21bb;</span>
          </div>
          <div class="buses-vertical-list" id="buses-list-container">
            <!-- Dynamically populated bus cards -->
          </div>
          <div id="buses-empty-state" style="display:none; text-align:center; padding:36px 16px; color:var(--text-secondary);">
            <div style="font-size:24px; margin-bottom:8px;">🔍</div>
            <div style="font-weight:700; font-size:14px; color:var(--brand-navy);">No buses match your filter</div>
            <p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Try searching for a different bus number or stop name.</p>
          </div>
        </div>
      </div>

      <!-- 2. BUS DETAIL SCREEN (WITH CLEAR NAVIGATION BACK TO LIST) -->
      <div id="tab-pane-detail" style="display:none;">
        <div class="detail-top-nav">
          <button class="btn-back-to-list" id="btn-back-to-buses">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            <span>Back to Bus List</span>
          </button>
          <div style="font-family:'Outfit'; font-weight:700; color:var(--brand-navy);" id="detail-nav-title">Bus 12</div>
        </div>

        <!-- Telemetry Data Source Indicator (Visible distinction between live GPS vs simulated demo) -->
        <div id="detail-data-distinction" class="data-distinction-banner distinction-demo">
          <div style="font-size:16px;">🟣</div>
          <div>
            <div id="detail-source-title">SIMULATED DEMO DATA (Step #3)</div>
            <div style="font-size:10.5px; opacity:0.85;" id="detail-source-desc">Evaluated under local simulation. Not real GPS hardware telemetry.</div>
          </div>
        </div>

        <!-- Route Geometry Source Indicator (Road-following vs Saved vs Straight-line fallback) -->
        <div id="detail-geometry-notice" style="display:none; padding:6px 14px; font-size:11px; font-weight:600; background:#F8FAFC; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; justify-content:space-between;">
          <span id="detail-geometry-text">🗺️ Road-Following Geometry</span>
          <span id="detail-geometry-dist" style="font-size:10.5px; color:var(--text-muted);">14.2 km</span>
        </div>

        <!-- Map & Route Canvas -->
        <div class="map-tracker-container">
          <div id="map-tiles-warning" style="display:none; position:absolute; top:8px; left:8px; right:56px; background:rgba(217,119,6,0.92); color:white; padding:6px 10px; border-radius:6px; font-size:11px; z-index:25; backdrop-filter:blur(4px); box-shadow:0 2px 6px rgba(0,0,0,0.2);">
            ⚠️ Map tile service slow or unavailable; route coordinates & live telemetry remain active.
          </div>
          <div class="map-controls-overlay">
            <button class="map-ctrl-btn" id="btn-recenter" title="Recenter on Bus">&#8982;</button>
            <button class="map-ctrl-btn" id="btn-fit-route" title="Fit Entire Route Corridor">&#x26F6;</button>
            <button class="map-ctrl-btn" id="btn-toggle-fallback" title="Toggle Accessible Route Card">&#9776;</button>
          </div>
          <div id="leaflet-map"></div>
          <div id="route-fallback-view" style="display:none; position:absolute; inset:0; z-index:20; background:#103754; color:white; padding:16px; overflow-y:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.2); padding-bottom:8px; margin-bottom:10px;">
              <div>
                <span style="font-size:10px; text-transform:uppercase; font-weight:700; color:#93C5FD;">Accessible Progression Card</span>
                <div style="font-size:15px; font-weight:700;" id="fallback-route-title">Route 12: Mehdipatnam Express</div>
              </div>
              <span class="status-badge badge-live" id="fallback-status-badge">LIVE GPS</span>
            </div>
            <div id="fallback-progression-content" style="font-size:12.5px; line-height:1.6;"></div>
          </div>
        </div>

        <!-- Bus Details Strip -->
        <div class="detail-bus-card" style="background:var(--canvas-card); padding:14px; border-bottom:1px solid var(--border-subtle);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <div style="font-family:'Outfit'; font-size:18px; font-weight:700; color:var(--text-primary);" id="detail-bus-num">Bus 12</div>
              <div style="font-size:12.5px; color:var(--text-secondary); margin-top:2px;" id="detail-route-name">Route 12: Mehdipatnam Express</div>
            </div>
            <div style="text-align:right;">
              <span class="status-badge badge-live" id="detail-status-pill">LIVE GPS</span>
              <div style="font-size:11px; color:var(--text-muted); margin-top:4px;" id="detail-freshness-text">8s ago</div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-top:12px; background:var(--canvas-light); border-radius:10px; padding:10px; text-align:center;">
            <div>
              <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:600;">Registration</div>
              <div style="font-weight:700; font-size:12px; color:var(--text-primary);" id="detail-reg-num">TS 09 UB 4412</div>
            </div>
            <div>
              <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:600;">Speed</div>
              <div style="font-weight:700; font-size:12px; color:var(--text-primary);" id="detail-speed-val">38 km/h</div>
            </div>
            <div>
              <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); font-weight:600;">Next Arrival</div>
              <div style="font-weight:700; font-size:12px; color:var(--state-live);" id="detail-eta-val">5 mins</div>
            </div>
          </div>
        </div>        <!-- Timeline Stops & Arrival Estimates -->
        <div class="timeline-container">
          <div class="timeline-title">
            <span>Route Stops & Arrival Estimates</span>
            <span style="font-size:11px; color:var(--text-muted); font-weight:500;">Tap stop for details</span>
          </div>
          <div class="stop-timeline-list" id="detail-stops-timeline">
            <!-- Dynamically populated stops -->
          </div>
          <button id="btn-view-route-schedule" style="margin-top:14px; width:100%; background:var(--canvas-light); border:1px solid var(--border-strong); color:var(--brand-navy); font-weight:600; font-size:12px; padding:10px; border-radius:8px; cursor:pointer;">
            View Full Corridor Route Details &amp; Schedule &rarr;
          </button>
        </div>
      </div>

      <!-- 3. ROUTES DIRECTORY & DETAILS TAB (Screen 3: ROUTE DETAILS) -->
      <div id="tab-pane-routes" style="display:none; padding:16px;">
        <!-- Subpane A: Route Directory List -->
        <div id="routes-directory-view">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h2 style="font-family:'Outfit'; font-size:18px; color:var(--brand-navy);">Transit Corridors Directory</h2>
            <span style="font-size:11.5px; color:var(--text-muted); font-weight:600;">Tap corridor to inspect</span>
          </div>
          <div id="routes-directory-list" style="display:flex; flex-direction:column; gap:12px;"></div>
        </div>

        <!-- Subpane B: Route Details View (Screen 3: ROUTE DETAILS) -->
        <div id="route-detail-view" style="display:none;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <button class="btn-back-to-list" id="btn-back-to-routes" style="background:none; border:none; color:var(--brand-navy); font-weight:700; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
              <span>Back to Corridors</span>
            </button>
            <button id="btn-route-to-buses" style="background:var(--brand-navy-light); color:var(--brand-navy); border:none; border-radius:6px; padding:6px 12px; font-size:11.5px; font-weight:600; cursor:pointer;">
              Bus List &rarr;
            </button>
          </div>

          <div style="background:white; border:1px solid var(--border-subtle); border-radius:14px; padding:16px; margin-bottom:16px; box-shadow:0 1px 4px rgba(0,0,0,0.05);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
              <span id="route-detail-code" style="font-family:'Outfit'; font-weight:700; color:var(--brand-navy); background:var(--brand-navy-light); padding:2px 8px; border-radius:4px; font-size:12px;">R-12</span>
              <span id="route-detail-status-pill" class="status-badge badge-live">ACTIVE CORRIDOR</span>
            </div>
            <h3 id="route-detail-name" style="font-family:'Outfit'; font-size:17px; color:var(--brand-navy); margin-bottom:4px;">Route 12: Mehdipatnam Express</h3>
            <p id="route-detail-endpoints" style="font-size:12.5px; color:var(--text-secondary); margin-bottom:12px;">Mehdipatnam (Rethi Bowli) &rarr; VJIT Main Campus</p>
            
            <div style="background:var(--canvas-light); border-radius:8px; padding:10px 12px; font-size:12px; color:var(--text-secondary); display:flex; justify-content:space-between;">
              <span>Total Stops: <strong id="route-detail-stops-count">6 stops</strong></span>
              <span>Total Distance: <strong>24.5 km</strong></span>
            </div>
          </div>

          <!-- Operating Buses on this Route -->
          <div style="margin-bottom:16px;">
            <div style="font-family:'Outfit'; font-size:13.5px; font-weight:700; color:var(--brand-navy); margin-bottom:8px;">Buses Assigned to this Route</div>
            <div id="route-assigned-buses-list" style="display:flex; flex-direction:column; gap:8px;"></div>
          </div>

          <!-- Complete Stops Sequence -->
          <div>
            <div style="font-family:'Outfit'; font-size:13.5px; font-weight:700; color:var(--brand-navy); margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
              <span>Stops Sequence (Direction: Campus Bound)</span>
              <span style="font-size:11px; color:var(--text-muted); font-weight:500;">Scheduled Timetable</span>
            </div>
            <div id="route-detail-stops-list" class="stop-timeline-list" style="background:white; border:1px solid var(--border-subtle); border-radius:14px; padding:16px 16px 16px 36px; box-shadow:0 1px 4px rgba(0,0,0,0.05);"></div>
          </div>
        </div>
      </div>

      <!-- 4. ALERTS TAB -->
      <div id="tab-pane-alerts" style="display:none; padding:16px;">
        <h2 style="font-family:'Outfit'; font-size:18px; color:var(--brand-navy); margin-bottom:12px;">Service Alerts & Notices</h2>
        <div id="alerts-directory-list" style="display:flex; flex-direction:column; gap:12px;"></div>
      </div>

      <!-- 5. USER ACCESS, PASS & SETTINGS TAB (Screen 4: USER ACCESS & SETTINGS) -->
      <div id="tab-pane-profile" style="display:none; padding:16px;">
        <h2 style="font-family:'Outfit'; font-size:18px; color:var(--brand-navy); margin-bottom:12px;">Access, Pass &amp; Preferences</h2>

        <!-- Expired Session / Error Alert Banner (Hidden by default) -->
        <div id="session-feedback-alert" style="display:none; background:#FEF2F2; border:1px solid #FCA5A5; color:#991B1B; padding:12px 14px; border-radius:10px; margin-bottom:14px; font-size:12.5px;">
          <div style="font-weight:700; margin-bottom:2px;">⚠️ Session Alert</div>
          <div id="session-feedback-message">Session expired. Please re-authenticate via Institutional SSO.</div>
          <button id="btn-reauth-action" style="margin-top:8px; background:#DC2626; color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:600; font-size:11.5px; cursor:pointer;">Re-authenticate Session</button>
        </div>

        <!-- Digital Pass Card -->
        <div style="background:linear-gradient(135deg, #103754 0%, #0A2335 100%); color:white; border-radius:16px; padding:20px; box-shadow:0 8px 20px rgba(16, 55, 84, 0.25); position:relative; overflow:hidden; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:12px; margin-bottom:14px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <img src="/assets/vjit-logo.png" alt="VJIT" style="height:26px; background:white; padding:1px 4px; border-radius:3px;">
              <span style="font-family:'Outfit'; font-size:13px; font-weight:700; letter-spacing:0.02em;">VJIT TRANSPORT CARD</span>
            </div>
            <span style="background:#16A34A; color:white; font-size:10px; font-weight:700; padding:2px 8px; border-radius:12px; text-transform:uppercase;">VALID &bull; 2026-27</span>
          </div>

          <div style="font-size:11px; text-transform:uppercase; color:#93C5FD; font-weight:600;">Pass Holder</div>
          <div style="font-family:'Outfit'; font-size:17px; font-weight:700; margin-top:2px;" id="profile-name">Rahul Varma</div>
          <div style="font-size:12px; color:#E0F2FE;" id="profile-email">21b01a0501@vjit.ac.in</div>

          <div style="margin-top:14px; padding-top:12px; border-top:1px dashed rgba(255,255,255,0.2); display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px;">
            <div>
              <div style="font-size:10px; color:#93C5FD; text-transform:uppercase;">Authorized Corridor</div>
              <div style="font-weight:700;" id="pass-corridor-name">Route 12 (Mehdipatnam)</div>
            </div>
            <div>
              <div style="font-size:10px; color:#93C5FD; text-transform:uppercase;">Designated Boarding</div>
              <div style="font-weight:700;" id="pass-stop-name">Sun City Bandlaguda</div>
            </div>
          </div>

          <!-- Cryptographic Rotating QR Pass (HMAC-SHA256) -->
          <div style="margin-top:16px; background:white; border-radius:8px; padding:12px; display:flex; flex-direction:column; align-items:center;">
            <div style="letter-spacing:4px; font-family:monospace; font-size:20px; color:#0F172A; font-weight:900;">|| | |||| | |||||| || |</div>
            <div style="font-size:10px; color:#64748B; margin-top:4px; font-family:monospace;" id="pass-token-label">VJIT-PASS-2026-21B01A0501</div>
          </div>
        </div>

        <!-- Identity & Access Control Card -->
        <div style="background:var(--canvas-white); border:1px solid var(--border-subtle); border-radius:12px; padding:16px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <div style="font-family:'Outfit'; font-size:14px; font-weight:700; color:var(--brand-navy);">Identity &amp; Access Control</div>
            <span class="status-badge badge-live" id="session-auth-badge">AUTHENTICATED</span>
          </div>
          <div style="font-size:12px; color:var(--text-secondary); line-height:1.6; margin-bottom:12px;">
            Active User: <strong id="settings-user-name">Rahul Varma</strong><br>
            Institutional Email: <strong id="settings-user-email">21b01a0501@vjit.ac.in</strong><br>
            Current Role: <strong id="settings-user-role">Student (STU)</strong><br>
            Security Mechanism: <strong>Bearer JWT Token (Cryptographically Signed)</strong>
          </div>
          <div style="display:flex; gap:8px;">
            <button id="btn-settings-switch-role" style="flex:1; background:var(--brand-navy); color:white; border:none; padding:10px; border-radius:8px; font-weight:600; font-size:12px; cursor:pointer;">
              Switch Demo Persona &rarr;
            </button>
            <button id="btn-test-expired-session" style="background:var(--canvas-light); color:var(--text-secondary); border:1px solid var(--border-strong); padding:10px 12px; border-radius:8px; font-weight:600; font-size:12px; cursor:pointer;" title="Simulate expired session to test auth error handling">
              Simulate Expired Session
            </button>
          </div>
        </div>

        <!-- Appearance & Theme Preferences -->
        <div style="background:var(--canvas-white); border:1px solid var(--border-subtle); border-radius:12px; padding:16px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="font-family:'Outfit'; font-size:14px; font-weight:700; color:var(--brand-navy);">Appearance &amp; Theme</div>
            <span id="theme-status-label" style="font-size:11px; font-weight:600; color:var(--brand-navy); background:var(--brand-navy-light); padding:2px 8px; border-radius:12px;">System (Auto)</span>
          </div>
          <p style="font-size:12px; color:var(--text-secondary); margin-bottom:12px;">Comfortable daytime and nighttime transit views with automatic sync.</p>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;" id="profile-theme-grid">
            <button type="button" class="profile-theme-btn" data-theme-choice="light" data-theme-btn="light" style="padding:10px 6px; border-radius:8px; border:1px solid var(--border-subtle); background:var(--canvas-light); color:var(--text-primary); font-size:12px; font-weight:600; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px;">
              <span>☀️ Light</span>
              <span style="font-size:10px; color:var(--text-muted); font-weight:400;">Day</span>
            </button>
            <button type="button" class="profile-theme-btn" data-theme-choice="system" data-theme-btn="system" style="padding:10px 6px; border-radius:8px; border:1px solid var(--border-subtle); background:var(--canvas-light); color:var(--text-primary); font-size:12px; font-weight:600; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px;">
              <span>💻 System</span>
              <span style="font-size:10px; color:var(--text-muted); font-weight:400;">Auto</span>
            </button>
            <button type="button" class="profile-theme-btn" data-theme-choice="dark" data-theme-btn="dark" style="padding:10px 6px; border-radius:8px; border:1px solid var(--border-subtle); background:var(--canvas-light); color:var(--text-primary); font-size:12px; font-weight:600; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px;">
              <span>🌙 Dark</span>
              <span style="font-size:10px; color:var(--text-muted); font-weight:400;">Night</span>
            </button>
          </div>
        </div>

        <!-- Notification & Delay Preferences -->
        <div style="background:var(--canvas-white); border:1px solid var(--border-subtle); border-radius:12px; padding:16px; margin-bottom:16px;">
          <h3 style="font-family:'Outfit'; font-size:14px; font-weight:700; color:var(--brand-navy); margin-bottom:10px;">Transit Notification Preferences</h3>
          <div style="display:flex; flex-direction:column; gap:10px; font-size:12.5px;">
            <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
              <div>
                <div style="font-weight:600; color:var(--text-primary);">Approaching Stop Alert</div>
                <div style="font-size:11px; color:var(--text-muted);">Notify 5 minutes before bus arrives at your stop</div>
              </div>
              <input type="checkbox" id="pref-approaching-stops" checked style="accent-color:var(--brand-navy); width:18px; height:18px;">
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
              <div>
                <div style="font-weight:600; color:var(--text-primary);">Transit Delay Notifications</div>
                <div style="font-size:11px; color:var(--text-muted);">Alert if vehicle is delayed more than 10 minutes</div>
              </div>
              <input type="checkbox" id="pref-delays" checked style="accent-color:var(--brand-navy); width:18px; height:18px;">
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center; opacity:0.85;">
              <div>
                <div style="font-weight:600; color:var(--text-primary);">Emergency Broadcast SMS (Mandatory)</div>
                <div style="font-size:11px; color:var(--text-muted);">Immediate safety alerts from Transport Cell</div>
              </div>
              <input type="checkbox" checked disabled style="accent-color:var(--brand-navy); width:18px; height:18px;">
            </label>
          </div>
        </div>

        <!-- Campus Transport Emergency Desk -->
        <div style="background:var(--canvas-white); border:1px solid var(--border-subtle); border-radius:12px; padding:16px; margin-bottom:16px;">
          <h3 style="font-size:13.5px; font-weight:700; color:var(--brand-navy); margin-bottom:8px;">Campus Transport Emergency Desk</h3>
          <p style="font-size:12.5px; color:var(--text-secondary); line-height:1.6;">
            Central Transport Cell: <a href="tel:9848012345" style="color:var(--brand-navy); font-weight:700;">+91 98480 12345</a><br>
            Campus Gate Security Post: <a href="tel:04023338548" style="color:var(--brand-navy); font-weight:700;">040-2333-8548</a><br>
            Medical Emergency / Ambulance: <a href="tel:9440099999" style="color:var(--brand-red); font-weight:700;">+91 94400 99999</a>
          </p>
        </div>
      </div>
    </div>

    <!-- Floating Demo Simulation Step Bar -->
    <div class="demo-floating-bar">
      <span>Simulation Engine: <strong id="demo-step-indicator">Step #3</strong></span>
      <button class="btn-step-demo" id="btn-step-sim">Advance 10s &rarr;</button>
    </div>

    <!-- Bottom Navigation Tab Bar -->
    <nav class="tab-bar">
      <button class="tab-btn active" data-tab="buses">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
        Buses
      </button>
      <button class="tab-btn" data-tab="routes">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        Routes
      </button>
      <button class="tab-btn" data-tab="alerts">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        Alerts
      </button>
      <button class="tab-btn" data-tab="profile">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        Pass &amp; Settings
      </button>
    </nav>
  </div>

  <!-- Role Switcher Modal -->
  <div class="modal-overlay" id="role-modal">
    <div class="modal-card">
      <h3 style="font-family:'Outfit'; font-size:18px; color:var(--brand-navy); margin-bottom:6px;">Select Demo Persona</h3>
      <p style="font-size:12.5px; color:var(--text-secondary); margin-bottom:16px;">Demonstrate Role-Based Access Control and personalization:</p>
      <div class="role-select-item active" data-role="STU" style="border:1px solid var(--border-subtle); padding:10px 14px; border-radius:8px; margin-bottom:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-weight:600;">Rahul Varma (Student)</div>
          <div style="font-size:11px; color:var(--text-muted);">Assigned to Route 12 (Mehdipatnam)</div>
        </div>
        <span>&rarr;</span>
      </div>
      <div class="role-select-item" data-role="FAC" style="border:1px solid var(--border-subtle); padding:10px 14px; border-radius:8px; margin-bottom:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-weight:600;">Dr. S. Rao (Faculty Coordinator)</div>
          <div style="font-size:11px; color:var(--text-muted);">Assigned to Route 05 (Kukatpally)</div>
        </div>
        <span>&rarr;</span>
      </div>
      <div class="role-select-item" data-role="COR" style="border:1px solid var(--border-subtle); padding:10px 14px; border-radius:8px; margin-bottom:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-weight:600;">K. Ramesh (Transport Coordinator)</div>
          <div style="font-size:11px; color:var(--text-muted);">Transport Operations Control Desk</div>
        </div>
        <span>&rarr;</span>
      </div>
      <button class="btn-close-modal" id="btn-close-role-modal">Cancel</button>
    </div>
  </div>  </div>
  </div>

  <!-- Stop Details Modal -->
  <div class="modal-overlay" id="stop-details-modal">
    <div class="modal-card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--text-muted);" id="modal-stop-sequence">Stop #4</span>
        <button onclick="window.closeStopModal()" style="background:none; border:none; font-size:22px; cursor:pointer; color:var(--text-secondary);">&times;</button>
      </div>
      <h3 id="modal-stop-name" style="margin-bottom:4px; font-family:'Outfit'; font-size:17px; color:var(--brand-navy);">Sun City Bandlaguda</h3>
      <p id="modal-stop-corridor" style="margin-bottom:12px; font-size:12.5px; color:var(--text-secondary);">Route 12: Mehdipatnam Express</p>
      
      <div style="background:var(--canvas-light); border:1px solid var(--border-subtle); border-radius:10px; padding:12px; margin-bottom:14px; font-size:12.5px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
          <div>Morning Pickup:</div><div style="font-weight:700; color:var(--brand-navy);" id="modal-stop-morning-time">08:25 AM</div>
          <div>Evening Dropoff:</div><div style="font-weight:700; color:var(--brand-navy);" id="modal-stop-evening-time">04:45 PM</div>
          <div>Geofence Radius:</div><div style="font-weight:600; color:var(--state-live);">100 meters (Highlighted on Map)</div>
          <div>Live Stop Status:</div><div style="font-weight:700; color:var(--state-live);" id="modal-stop-live-status">Approaching</div>
        </div>
      </div>
      
      <button class="btn-close-modal" onclick="window.closeStopModal()">Close &amp; Dismiss Geofence</button>
    </div>
  </div>

  <script>
    // App State
    let appState = {
      buses: [],
      routes: [],
      alerts: [],
      selectedBusId: '00000000-0000-4000-8000-000000000001',
      selectedRouteFilter: 'ALL',
      favoriteBusIds: (function() {
        try { return JSON.parse(localStorage.getItem('vjit_favorite_buses') || '[]'); } catch(_) { return []; }
      })(),
      activeStopGeofence: null,
      currentTab: 'buses',
      currentUser: null,
      searchQuery: '',
      isFallbackView: false,
      mapInstance: null,
      tileLayer: null,
      busMarker: null,
      routePolyline: null,
      stopMarkers: [],
      userInteractedWithMap: false,
      currentRenderedRouteId: null,
      lastRenderedStopCount: 0,
      themePreference: localStorage.getItem('vjit_theme_preference') || 'system',
      resolvedTheme: 'light'
    };
    window.appState = appState;

    function initThemeSystem() {
      const THEME_KEY = 'vjit_theme_preference';
      function getPreference() {
        return localStorage.getItem(THEME_KEY) || 'system';
      }
      function resolveEffectiveTheme(pref) {
        if (pref === 'light') return 'light';
        if (pref === 'dark') return 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      function applyTheme(preference) {
        appState.themePreference = preference;
        const effective = resolveEffectiveTheme(preference);
        appState.resolvedTheme = effective;
        document.documentElement.setAttribute('data-theme', effective);
        document.documentElement.classList.toggle('theme-dark', effective === 'dark');
        document.documentElement.classList.toggle('theme-light', effective === 'light');
        
        // Update header and settings buttons
        document.querySelectorAll('[data-theme-choice], [data-theme-btn]').forEach(btn => {
          const choice = btn.getAttribute('data-theme-choice') || btn.getAttribute('data-theme-btn');
          if (choice === preference) {
            btn.classList.add('active');
            btn.style.borderColor = effective === 'dark' ? '#38BDF8' : 'var(--brand-navy)';
          } else {
            btn.classList.remove('active');
            btn.style.borderColor = '';
          }
        });
        const lbl = document.getElementById('theme-status-label');
        if (lbl) {
          lbl.textContent = preference === 'system' ? 'System (Auto)' : (preference === 'dark' ? 'Dark Mode' : 'Light Mode');
        }

        // Seamless tile layer swap without viewport shift
        updateMapTileTheme(effective === 'dark');
      }

      function updateMapTileTheme(isDark) {
        if (!appState.mapInstance || !appState.tileLayer) return;
        // Spec rule: If dark tile provider requires credentials (e.g. cartocdn dark_all/{z}/{x}/{y}{r}.png),
        // retain reliable OpenStreetMap tiles with CSS tile-pane night filter to avoid breaking map or watermarks
        const targetUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        appState.tileLayer.setUrl(targetUrl);
        
        // Also update polyline color if present
        if (appState.routePolyline) {
          const bus = appState.buses.find(b => b.id === appState.selectedBusId);
          const route = bus ? appState.routes.find(r => r.id === bus.route_id) : null;
          const isFallback = route && route.geometry_source === 'STRAIGHT_LINE_FALLBACK';
          appState.routePolyline.setStyle({
            color: isFallback ? '#F59E0B' : (isDark ? '#38BDF8' : '#103754')
          });
        }
      }

      window.setThemePreference = function(pref) {
        localStorage.setItem(THEME_KEY, pref);
        applyTheme(pref);
      };

      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-theme-choice], [data-theme-btn]');
        if (btn) {
          const choice = btn.getAttribute('data-theme-choice') || btn.getAttribute('data-theme-btn');
          if (choice) window.setThemePreference(choice);
        }
      });

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (getPreference() === 'system') {
          applyTheme('system');
        }
      });

      window.addEventListener('storage', (e) => {
        if (e.key === THEME_KEY && e.newValue) {
          applyTheme(e.newValue);
        }
      });

      applyTheme(getPreference());
    }

    function saveMobileMapState() {
      try {
        if (!appState.mapInstance) return;
        const center = appState.mapInstance.getCenter();
        const zoom = appState.mapInstance.getZoom();
        const stateToSave = {
          selectedBusId: appState.selectedBusId,
          selectedRouteFilter: appState.selectedRouteFilter,
          center: [center.lat, center.lng],
          zoom: zoom,
          userInteracted: appState.userInteractedWithMap,
          savedAt: Date.now()
        };
        localStorage.setItem('vjit_mobile_map_state', JSON.stringify(stateToSave));
      } catch (_) {}
    }

    function loadSavedMobileMapState() {
      try {
        const raw = localStorage.getItem('vjit_mobile_map_state');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.savedAt && (Date.now() - parsed.savedAt < 86400000)) {
          return parsed;
        }
        return null;
      } catch (_) {
        return null;
      }
    }

    // DOM Elements
    const busesListContainer = document.getElementById('buses-list-container');
    const routeChipsContainer = document.getElementById('route-chips-container');
    const searchInput = document.getElementById('bus-search-input');
    const roleModal = document.getElementById('role-modal');
    const roleText = document.getElementById('role-text');
    const offlineBanner = document.getElementById('offline-banner');

    // Online/Offline detection & Synchronization State
    let lastSyncTime = null;
    let isAppOffline = !navigator.onLine;

    function formatTimeLabel(date) {
      if (!date) return 'Never';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function showOfflineNotice() {
      offlineBanner.style.display = 'flex';
      const syncLabel = lastSyncTime
        ? formatTimeLabel(lastSyncTime)
        : (localStorage.getItem('vjit_last_sync_time') || 'Never synchronized');
      offlineBanner.innerHTML = '<div style="display:flex; flex-direction:column; gap:2px;">' +
        '<div style="font-weight:700; display:flex; align-items:center; gap:6px;"><span>📡</span> Offline Mode Active</div>' +
        '<div style="font-size:11px; opacity:0.95;">Displaying cached campus route directory & timetables. Last synchronized at ' + syncLabel + '. Live telemetry paused.</div>' +
        '</div>';
    }

    window.addEventListener('online', () => {
      isAppOffline = false;
      offlineBanner.style.display = 'none';
      loadAllData();
    });

    window.addEventListener('offline', () => {
      isAppOffline = true;
      showOfflineNotice();
      renderApp();
    });

    if (!navigator.onLine) showOfflineNotice();

    // Fetch snapshot, routes, alerts
    async function loadAllData() {
      try {
        const [snapshotRes, routesRes, alertsRes, meRes] = await Promise.all([
          fetch('/api/v1/snapshot').then(r => r.json()),
          fetch('/api/v1/routes').then(r => r.json()),
          fetch('/api/v1/alerts').then(r => r.json()),
          fetch('/api/v1/me').then(r => r.json())
        ]);

        appState.buses = snapshotRes.buses || [];
        appState.routes = routesRes.routes || [];
        appState.alerts = alertsRes.alerts || [];
        appState.currentUser = meRes.user || null;
        lastSyncTime = new Date();
        isAppOffline = false;

        try {
          localStorage.setItem('vjit_cached_routes', JSON.stringify(appState.routes));
          localStorage.setItem('vjit_last_sync_time', formatTimeLabel(lastSyncTime));
        } catch (_) {}

        offlineBanner.style.display = 'none';

        if (appState.currentUser) {
          roleText.textContent = appState.currentUser.role;
          document.getElementById('profile-name').textContent = appState.currentUser.name;
          document.getElementById('profile-email').textContent = appState.currentUser.email;
        }

        renderApp();
      } catch (err) {
        isAppOffline = true;
        if (appState.routes.length === 0) {
          try {
            const cached = localStorage.getItem('vjit_cached_routes');
            if (cached) appState.routes = JSON.parse(cached);
          } catch (_) {}
        }
        showOfflineNotice();
        renderApp();
      }
    }

    function renderApp() {
      renderBusesList();
      if (appState.currentTab === 'detail') {
        renderBusDetail();
      }
      renderRoutesDirectory();
      renderAlertsList();
      renderPassTab();
    }

    // Render Home Buses List
    function renderBusesList() {
      let filtered = appState.buses;
      if (appState.selectedRouteFilter === 'FAVORITES') {
        filtered = filtered.filter(b => appState.favoriteBusIds.includes(b.bus_id));
      } else if (appState.selectedRouteFilter !== 'ALL') {
        filtered = filtered.filter(b => b.route_id === appState.selectedRouteFilter);
      }
      if (appState.searchQuery) {
        const q = appState.searchQuery.toLowerCase();
        filtered = filtered.filter(b => {
          const busMatch = b.bus_number.toLowerCase().includes(q) || b.route_name.toLowerCase().includes(q) || b.registration.toLowerCase().includes(q);
          const route = appState.routes.find(r => r.id === b.route_id);
          const stopMatch = route && route.stops && route.stops.some(s => s.name.toLowerCase().includes(q));
          return busMatch || stopMatch;
        });
      }

      document.getElementById('bus-count-num').textContent = filtered.length;
      const liveCount = appState.buses.filter(b => b.state === 'LIVE_HW' || b.state === 'LIVE_PHONE').length;
      document.getElementById('greeting-active-count').textContent = '● ' + liveCount + ' of ' + appState.buses.length + ' Buses Live';

      busesListContainer.innerHTML = '';
      const emptyState = document.getElementById('buses-empty-state');

      if (filtered.length === 0) {
        emptyState.style.display = 'block';
        if (appState.selectedRouteFilter === 'FAVORITES') {
          emptyState.innerHTML = '<div style="font-size:24px; margin-bottom:8px;">⭐️</div>' +
            '<div style="font-weight:700; font-size:14px; color:var(--brand-navy);">No Starred Buses</div>' +
            '<p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Tap the ☆ star on any bus card to pin your daily commute for 1-tap tracking.</p>';
        } else if (appState.buses.length === 0) {
          emptyState.innerHTML = '<div style="font-size:24px; margin-bottom:8px;">🚍</div>' +
            '<div style="font-weight:700; font-size:14px; color:var(--brand-navy);">No buses scheduled</div>' +
            '<p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Coordinators can add buses from the Buses page.</p>';
        } else {
          emptyState.innerHTML = '<div style="font-size:24px; margin-bottom:8px;">🔍</div>' +
            '<div style="font-weight:700; font-size:14px; color:var(--brand-navy);">No buses match your filter</div>' +
            '<p style="font-size:12px; color:var(--text-muted); margin-top:4px;">Try searching for a different bus number or stop name.</p>';
        }
        return;
      }
      emptyState.style.display = 'none';

      filtered.forEach(bus => {
        let badgeClass = 'badge-live';
        let badgeText = 'LIVE GPS';
        if (bus.is_simulated) {
          badgeClass = 'badge-demo';
          badgeText = bus.state === 'LIVE_PHONE' ? 'DRIVER PHONE (DEMO)' : 'DEMO SIMULATION';
        } else if (bus.state === 'LIVE_HW') {
          badgeClass = 'badge-live';
          badgeText = 'LIVE HW GPS';
        } else if (bus.state === 'LIVE_PHONE') {
          badgeClass = 'badge-demo';
          badgeText = 'DRIVER PHONE';
        }
        if (bus.state === 'STALE') { badgeClass = 'badge-stale'; badgeText = 'STALE GPS'; }
        if (bus.state === 'UNAVAILABLE') { badgeClass = 'badge-unavail'; badgeText = 'UNAVAILABLE'; }
        if (bus.state === 'NOT_RUNNING') { badgeClass = 'badge-idle'; badgeText = 'OUTSIDE SHIFT'; }

        const etaLabel = bus.next_stop
          ? (bus.is_simulated ? bus.next_stop.eta_formatted + ' (Demo)' : (bus.state.startsWith('LIVE') ? bus.next_stop.eta_formatted : bus.next_stop.eta_formatted + ' (Stale)'))
          : (bus.state === 'UNAVAILABLE' ? 'Unavailable' : (bus.state === 'NOT_RUNNING' ? 'Next Shift' : 'At Terminal'));

        const etaColor = bus.next_stop ? 'var(--state-live)' : 'var(--text-muted)';

        const freshnessLabel = bus.age_seconds !== null
          ? 'Updated ' + bus.age_seconds + 's ago' + (bus.state === 'STALE' ? ' (Stale)' : '')
          : (bus.state === 'UNAVAILABLE' ? 'No signal received' : 'In depot / standby');

        const isStarred = appState.favoriteBusIds.includes(bus.bus_id);
        const starBtnHtml = '<button type="button" class="btn-star-bus ' + (isStarred ? 'starred' : '') + '" onclick="event.stopPropagation(); window.toggleFavoriteBus(\\\'' + bus.bus_id + '\\\');" aria-label="' + (isStarred ? 'Remove from favorites' : 'Add to favorites') + '" title="' + (isStarred ? 'Starred bus' : 'Star this bus') + '">' + (isStarred ? '★' : '☆') + '</button>';

        const card = document.createElement('div');
        card.className = 'bus-card-vertical';
        card.onclick = () => openBusDetail(bus.bus_id);

        card.innerHTML = \`
          <div class="bus-card-header">
            <div class="bus-badge-group">
              <span class="bus-id-badge">\${bus.bus_number}</span>
              \${starBtnHtml}
              <span class="bus-reg-label">\${bus.registration}</span>
            </div>
            <span class="status-badge \${badgeClass}">\${badgeText}</span>
          </div>

          <div class="bus-corridor-title">\${bus.route_name}</div>

          <div class="bus-metrics-strip">
            <div>
              <div class="metric-strip-item-lbl">Next Scheduled Stop</div>
              <div class="metric-strip-item-val">\${bus.next_stop ? bus.next_stop.name : 'Terminal'}</div>
            </div>
            <div>
              <div class="metric-strip-item-lbl">Arrival Estimate</div>
              <div class="metric-strip-item-val" style="color:\${etaColor};">\${etaLabel}</div>
            </div>
          </div>

          <div class="bus-card-action-bar">
            <div class="freshness-indicator-text">
              <span>\${freshnessLabel}</span>
            </div>
            <button class="btn-track-action" onclick="event.stopPropagation(); openBusDetail('\${bus.bus_id}');">
              Track Bus Live &rarr;
            </button>
          </div>
        \`;
        busesListContainer.appendChild(card);
      });
    }

    // Open Bus Detail Screen
    window.openBusDetail = (busId) => {
      appState.selectedBusId = busId;
      appState.currentTab = 'detail';

      // Hide home list, show detail view
      document.getElementById('tab-pane-buses').style.display = 'none';
      document.getElementById('tab-pane-routes').style.display = 'none';
      document.getElementById('tab-pane-alerts').style.display = 'none';
      document.getElementById('tab-pane-profile').style.display = 'none';
      document.getElementById('tab-pane-detail').style.display = 'block';

      renderBusDetail();
      setTimeout(() => {
        if (appState.mapInstance) {
          appState.mapInstance.invalidateSize();
        }
      }, 150);
    };

    // Back to Bus List
    document.getElementById('btn-back-to-buses').onclick = () => {
      appState.currentTab = 'buses';
      document.getElementById('tab-pane-detail').style.display = 'none';
      document.getElementById('tab-pane-buses').style.display = 'block';
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === 'buses');
      });
    };

    // Render Selected Bus Detail Screen
    function renderBusDetail() {
      const bus = appState.buses.find(b => b.bus_id === appState.selectedBusId) || appState.buses[0];
      if (!bus) return;

      const etaDetailText = bus.next_stop
        ? (bus.state.startsWith('LIVE') ? bus.next_stop.eta_formatted : bus.next_stop.eta_formatted + ' (Demo Est.)')
        : (bus.state === 'UNAVAILABLE' ? 'Unavailable' : (bus.state === 'NOT_RUNNING' ? 'Next Shift' : 'At Terminal'));

      const freshDetailText = bus.age_seconds !== null
        ? bus.age_seconds + 's ago' + (bus.state === 'STALE' ? ' (Stale)' : '')
        : (bus.state === 'UNAVAILABLE' ? 'No signal' : 'In depot');

      document.getElementById('detail-nav-title').textContent = bus.bus_number;
      document.getElementById('detail-bus-num').textContent = bus.bus_number;
      document.getElementById('detail-route-name').textContent = bus.route_name;
      document.getElementById('detail-reg-num').textContent = bus.registration;
      document.getElementById('detail-speed-val').textContent = (bus.speed_kmh ? Math.round(bus.speed_kmh) : 0) + ' km/h';
      document.getElementById('detail-eta-val').textContent = etaDetailText;
      document.getElementById('detail-freshness-text').textContent = freshDetailText;

      // Status pill
      let badgeClass = 'badge-live';
      let badgeText = 'LIVE GPS';
      if (bus.state === 'STALE') { badgeClass = 'badge-stale'; badgeText = 'STALE GPS'; }
      if (bus.state === 'UNAVAILABLE') { badgeClass = 'badge-unavail'; badgeText = 'UNAVAILABLE'; }
      if (bus.state === 'NOT_RUNNING') { badgeClass = 'badge-idle'; badgeText = 'OUTSIDE SHIFT'; }
      if (bus.state === 'LIVE_PHONE') { badgeClass = 'badge-demo'; badgeText = 'DRIVER PHONE'; }
      const pill = document.getElementById('detail-status-pill');
      pill.className = 'status-badge ' + badgeClass;
      pill.textContent = badgeText;

      // Telemetry Data Source Distinction Banner
      const distinction = document.getElementById('detail-data-distinction');
      const distTitle = document.getElementById('detail-source-title');
      const distDesc = document.getElementById('detail-source-desc');

      if (isAppOffline) {
        distinction.className = 'data-distinction-banner distinction-stale';
        const syncLabel = lastSyncTime
          ? formatTimeLabel(lastSyncTime)
          : (localStorage.getItem('vjit_last_sync_time') || 'Earlier');
        distTitle.textContent = 'OFFLINE CACHE (LAST SYNC ' + syncLabel + ')';
        distDesc.textContent = 'Network disconnected. Telemetry feed paused; coordinates are NOT live.';
      } else if (bus.state === 'STALE') {
        distinction.className = 'data-distinction-banner distinction-stale';
        distTitle.textContent = 'STALE GPS TELEMETRY (>60s DELAY)';
        distDesc.textContent = 'Vehicle telemetry has aged past threshold. Showing last reported fix.';
      } else if (bus.state === 'LIVE_HW') {
        if (bus.is_simulated || bus.telemetry_source === 'DEMO_SIMULATION') {
          distinction.className = 'data-distinction-banner distinction-demo';
          distTitle.textContent = 'SIMULATED DEMO TELEMETRY';
          distDesc.textContent = 'Demonstration corridor simulation. Physical GPS hardware pending.';
        } else {
          distinction.className = 'data-distinction-banner distinction-live';
          distTitle.textContent = 'LIVE HARDWARE GPS TELEMETRY';
          distDesc.textContent = 'In-bus GPS tracker unit streaming over cellular at 10s cadence.';
        }
      } else if (bus.state === 'UNAVAILABLE') {
        distinction.className = 'data-distinction-banner distinction-stale';
        distTitle.textContent = 'LOCATION UNAVAILABLE / VEHICLE IN DEPOT';
        distDesc.textContent = 'No telemetry signal currently reported by hardware tracker or driver device.';
      } else if (bus.state === 'NOT_RUNNING') {
        distinction.className = 'data-distinction-banner distinction-stale';
        distTitle.textContent = 'OUTSIDE SHIFT / DEPOT STANDBY';
        distDesc.textContent = 'Bus is not currently operating an active student transit run.';
      } else {
        distinction.className = 'data-distinction-banner distinction-demo';
        distTitle.textContent = 'SIMULATED DEMO TELEMETRY (STEP #' + (bus.stepIndex || 3) + ')';
        distDesc.textContent = 'Demonstration corridor simulation. Not live GPS hardware.';
      }

      // Initialize or update Leaflet Map
      initOrUpdateMap(bus);

      // Render Stops Timeline
      renderStopsTimeline(bus);
    }

    // Leaflet Map Initialization & Rendering
    function initOrUpdateMap(bus) {
      const mapContainer = document.getElementById('leaflet-map');
      if (!mapContainer || typeof L === 'undefined') return;

      const hasValidFix = bus && typeof bus.latitude === 'number' && !isNaN(bus.latitude) &&
        typeof bus.longitude === 'number' && !isNaN(bus.longitude) &&
        bus.latitude !== null && bus.longitude !== null &&
        bus.latitude >= -90 && bus.latitude <= 90 && bus.longitude >= -180 && bus.longitude <= 180 &&
        bus.state !== 'UNAVAILABLE' && bus.state !== 'NOT_RUNNING';

      const defaultCenter = [17.3616, 78.3245]; // VJIT Main Campus
      const lat = hasValidFix ? bus.latitude : defaultCenter[0];
      const lng = hasValidFix ? bus.longitude : defaultCenter[1];

      // Restore saved view state if available
      const savedState = loadSavedMobileMapState();

      if (!appState.mapInstance) {
        let initialCenter = [lat, lng];
        let initialZoom = hasValidFix ? 14 : 13;

        if (savedState && Array.isArray(savedState.center) && savedState.center.length === 2) {
          initialCenter = savedState.center;
          if (typeof savedState.zoom === 'number') initialZoom = savedState.zoom;
          if (savedState.userInteracted) appState.userInteractedWithMap = true;
        }

        appState.mapInstance = L.map('leaflet-map', {
          zoomControl: false,
          attributionControl: false
        }).setView(initialCenter, initialZoom);

        const isDarkInitial = (document.documentElement.getAttribute('data-theme') || appState.resolvedTheme) === 'dark';
        // Spec rule: If dark tile provider requires credentials (e.g. cartocdn dark_all/{z}/{x}/{y}{r}.png),
        // retain reliable OpenStreetMap tiles with CSS tile-pane night filter to avoid breaking map or watermarks
        const initialTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        const tileLayer = L.tileLayer(initialTileUrl, {
          maxZoom: 18,
          subdomains: 'abc'
        }).addTo(appState.mapInstance);
        appState.tileLayer = tileLayer;

        tileLayer.on('tileerror', () => {
          const warn = document.getElementById('map-tiles-warning');
          if (warn) warn.style.display = 'block';
        });

        tileLayer.on('load', () => {
          const warn = document.getElementById('map-tiles-warning');
          if (warn) warn.style.display = 'none';
        });

        appState.mapInstance.on('movestart zoomstart', (e) => {
          if (e && e.originalEvent) {
            appState.userInteractedWithMap = true;
          }
        });

        appState.mapInstance.on('moveend zoomend', () => {
          saveMobileMapState();
        });
      }

      // Handle Route Polyline & Stops
      const route = bus ? appState.routes.find(r => r.id === bus.route_id) : null;
      const geomNotice = document.getElementById('detail-geometry-notice');
      const geomText = document.getElementById('detail-geometry-text');
      const geomDist = document.getElementById('detail-geometry-dist');

      if (route) {
        if (geomNotice && geomText && geomDist) {
          geomNotice.style.display = 'flex';
          const distKm = route.distance_meters ? (route.distance_meters / 1000).toFixed(1) + ' km' : '';
          geomDist.textContent = distKm;

          if (route.geometry_source === 'ROUTING_PROVIDER') {
            geomNotice.style.background = '#ECFDF5';
            geomNotice.style.color = '#065F46';
            geomText.innerHTML = '⚡ <strong>Road-Following Route</strong> (OSRM Engine)';
          } else if (route.geometry_source === 'SAVED_GEOMETRY') {
            geomNotice.style.background = '#EFF6FF';
            geomNotice.style.color = '#1E40AF';
            geomText.innerHTML = '💾 <strong>Verified Corridor</strong> (Saved Geometry)';
          } else {
            geomNotice.style.background = '#FFFBEB';
            geomNotice.style.color = '#92400E';
            geomText.innerHTML = '⚠️ <strong>Direct Waypoint Lines</strong> (Straight-Line Fallback)';
          }
        }

        const stops = route.stops || [];
        const stopsChanged = appState.currentRenderedRouteId !== route.id || appState.lastRenderedStopCount !== stops.length;

        if (stopsChanged || !appState.routePolyline) {
          if (appState.routePolyline) {
            appState.mapInstance.removeLayer(appState.routePolyline);
            appState.routePolyline = null;
          }
          appState.stopMarkers.forEach(m => appState.mapInstance.removeLayer(m));
          appState.stopMarkers = [];

          let polyPoints = [];
          const isFallback = route.geometry_source === 'STRAIGHT_LINE_FALLBACK';
          if (route.polyline && Array.isArray(route.polyline) && route.polyline.length >= 2) {
            polyPoints = route.polyline;
          } else if (stops.length >= 2) {
            polyPoints = stops.map(s => [s.latitude, s.longitude]);
          }

          if (polyPoints.length > 0) {
            const isDarkNow = (document.documentElement.getAttribute('data-theme') || appState.resolvedTheme) === 'dark';
            const routeLineColor = isFallback ? '#F59E0B' : (isDarkNow ? '#38BDF8' : '#103754');
            appState.routePolyline = L.polyline(polyPoints, {
              color: routeLineColor,
              weight: isFallback ? 3 : 5,
              opacity: 0.9,
              dashArray: isFallback ? '6, 6' : undefined
            }).addTo(appState.mapInstance);
          }

          stops.forEach((s, idx) => {
            const isDest = idx === stops.length - 1;
            const isDarkNow = (document.documentElement.getAttribute('data-theme') || appState.resolvedTheme) === 'dark';
            const stopBorder = isDarkNow ? '#0F172A' : '#FFFFFF';
            const stopIcon = L.divIcon({
              className: 'custom-stop-pin',
              html: '<div style="background:' + (isDest ? '#E51F35' : (isDarkNow ? '#2563EB' : '#1E4E79')) + '; color:white; width:20px; height:20px; border-radius:50%; border:2px solid ' + stopBorder + '; box-shadow:0 1px 4px rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">' + (idx + 1) + '</div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            });
            const marker = L.marker([s.latitude, s.longitude], { icon: stopIcon }).addTo(appState.mapInstance);
            marker.bindPopup('<strong>Stop #' + (idx + 1) + ': ' + s.name + '</strong><br>Scheduled: ' + (s.scheduled_time || 'N/A'));
            appState.stopMarkers.push(marker);
          });

          appState.currentRenderedRouteId = route.id;
          appState.lastRenderedStopCount = stops.length;

          if (!hasValidFix && !appState.userInteractedWithMap && polyPoints.length > 1) {
            appState.mapInstance.fitBounds(polyPoints, { padding: [24, 24] });
          }
        }
      } else {
        if (geomNotice) geomNotice.style.display = 'none';
      }

      // Smooth Vehicle Marker Update (In place, no route line flicker or viewport jumping)
      if (hasValidFix) {
        const busPopupContent = '<strong>' + bus.bus_number + '</strong> (' + bus.registration + ')<br>' +
          bus.route_name + '<br>' +
          'Speed: <strong>' + Math.round(bus.speed_kmh || 0) + ' km/h</strong> • ' +
          (bus.age_seconds !== null ? bus.age_seconds + 's ago' : 'Live');

        if (appState.busMarker) {
          appState.busMarker.setLatLng([bus.latitude, bus.longitude]);
          appState.busMarker.setPopupContent(busPopupContent);
        } else {
          const busIcon = L.divIcon({
            className: 'custom-bus-marker',
            html: '<div style="background:#E51F35; color:white; border:2px solid white; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; box-shadow:0 3px 10px rgba(229,31,53,0.5);">' + (bus.bus_number.replace('Bus ', 'B') || 'B') + '</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });
          appState.busMarker = L.marker([bus.latitude, bus.longitude], { icon: busIcon }).addTo(appState.mapInstance);
          appState.busMarker.bindPopup(busPopupContent);
        }

        if (!appState.userInteractedWithMap) {
          appState.mapInstance.panTo([bus.latitude, bus.longitude], { animate: true, duration: 0.8 });
        }
      } else {
        if (appState.busMarker) {
          appState.mapInstance.removeLayer(appState.busMarker);
          appState.busMarker = null;
        }
      }

      setTimeout(() => {
        if (appState.mapInstance) appState.mapInstance.invalidateSize();
      }, 100);
    }

    // Render Stops Timeline
    function renderStopsTimeline(bus) {
      const container = document.getElementById('detail-stops-timeline');
      container.innerHTML = '';

      const route = appState.routes.find(r => r.id === bus.route_id);
      if (!route || !route.stops || route.stops.length === 0) {
        container.innerHTML = '<div style="font-size:12.5px; color:var(--text-muted);">No stops defined for this corridor.</div>';
        return;
      }

      route.stops.forEach((s, idx) => {
        const isDest = idx === route.stops.length - 1;
        const isNext = bus.next_stop && bus.next_stop.id === s.id;
        const isPassed = !isNext && idx < (bus.next_stop ? route.stops.findIndex(x => x.id === bus.next_stop.id) : 0);

        let itemClass = 'stop-timeline-item';
        if (isPassed) itemClass += ' departed';
        if (isNext) itemClass += ' next-stop';
        if (isDest) itemClass += ' destination';

        const item = document.createElement('div');
        item.className = itemClass;
        item.onclick = () => openStopModal(s, route.name, idx + 1);

        item.innerHTML = \`
          <div class="stop-dot"></div>
          <div class="stop-item-content">
            <div class="stop-item-name">\${s.name} \${isDest ? '★' : ''}</div>
            <div class="stop-item-meta">
              <span>Scheduled: \${s.scheduled_time}</span>
              \${isNext ? '<strong style="color:var(--state-live); margin-left:8px;">● Arriving in ' + (bus.next_stop ? bus.next_stop.eta_formatted : '5 mins') + '</strong>' : ''}
              \${isPassed ? '<span style="color:var(--text-muted); margin-left:8px;">Departed</span>' : ''}
            </div>
          </div>
        \`;
        container.appendChild(item);
      });
    }

    // Toggle Favorite Bus
    window.toggleFavoriteBus = (busId) => {
      const idx = appState.favoriteBusIds.indexOf(busId);
      if (idx >= 0) {
        appState.favoriteBusIds.splice(idx, 1);
      } else {
        appState.favoriteBusIds.push(busId);
      }
      try {
        localStorage.setItem('vjit_favorite_buses', JSON.stringify(appState.favoriteBusIds));
      } catch (_) {}
      renderBusesList();
    };

    // Close Stop Modal & Clean Up Geofence
    window.closeStopModal = () => {
      const modal = document.getElementById('stop-details-modal');
      if (modal) modal.classList.remove('open');
      if (appState.activeStopGeofence && appState.mapInstance) {
        appState.mapInstance.removeLayer(appState.activeStopGeofence);
        appState.activeStopGeofence = null;
      }
    };

    // Open Stop Modal & Render 100m Geofence on Map
    window.openStopModal = (stop, corridorName, seq) => {
      document.getElementById('modal-stop-sequence').textContent = 'Stop #' + seq;
      document.getElementById('modal-stop-name').textContent = stop.name;
      document.getElementById('modal-stop-corridor').textContent = corridorName;
      document.getElementById('modal-stop-morning-time').textContent = stop.scheduled_time;
      document.getElementById('modal-stop-evening-time').textContent = '04:45 PM';
      document.getElementById('modal-stop-live-status').textContent = 'Scheduled';

      // Visual Geofence 100m Circle on Leaflet Map
      if (appState.activeStopGeofence && appState.mapInstance) {
        appState.mapInstance.removeLayer(appState.activeStopGeofence);
        appState.activeStopGeofence = null;
      }

      if (appState.mapInstance && typeof stop.latitude === 'number' && typeof stop.longitude === 'number') {
        const isDarkNow = (document.documentElement.getAttribute('data-theme') || appState.resolvedTheme) === 'dark';
        appState.activeStopGeofence = L.circle([stop.latitude, stop.longitude], {
          radius: 100, // 100-meter arrival geofence per Spec 10 & Part I.5
          color: isDarkNow ? '#38BDF8' : '#16A34A',
          fillColor: isDarkNow ? '#0284C7' : '#22C55E',
          fillOpacity: 0.25,
          weight: 2,
          dashArray: '4, 4'
        }).addTo(appState.mapInstance);

        appState.activeStopGeofence.bindPopup('<strong>Stop #' + seq + ' Arrival Geofence (100m)</strong><br>' + stop.name);
        appState.mapInstance.setView([stop.latitude, stop.longitude], 15, { animate: true });
        appState.userInteractedWithMap = true;
      }

      document.getElementById('stop-details-modal').classList.add('open');
    };

    // Recenter map on bus or route
    document.getElementById('btn-recenter').onclick = () => {
      const bus = appState.buses.find(b => b.bus_id === appState.selectedBusId);
      if (!appState.mapInstance) return;
      appState.userInteractedWithMap = false;

      const hasValidFix = bus && typeof bus.latitude === 'number' && !isNaN(bus.latitude) &&
        typeof bus.longitude === 'number' && !isNaN(bus.longitude) &&
        bus.latitude !== null && bus.longitude !== null &&
        bus.state !== 'UNAVAILABLE' && bus.state !== 'NOT_RUNNING';

      if (hasValidFix) {
        appState.mapInstance.setView([bus.latitude, bus.longitude], 15, { animate: true });
      } else if (appState.routePolyline) {
        appState.mapInstance.fitBounds(appState.routePolyline.getBounds(), { padding: [24, 24], animate: true });
      } else {
        appState.mapInstance.setView([17.3616, 78.3245], 14, { animate: true });
      }
      saveMobileMapState();
    };

    // Fit Entire Route Corridor
    document.getElementById('btn-fit-route').onclick = () => {
      if (!appState.mapInstance) return;
      if (appState.routePolyline) {
        appState.mapInstance.fitBounds(appState.routePolyline.getBounds(), { padding: [30, 30], animate: true });
        appState.userInteractedWithMap = true;
        saveMobileMapState();
      } else {
        const bus = appState.buses.find(b => b.bus_id === appState.selectedBusId);
        const route = bus ? appState.routes.find(r => r.id === bus.route_id) : null;
        if (route && route.stops && route.stops.length > 0) {
          const latLngs = route.stops.map(s => [s.latitude, s.longitude]);
          appState.mapInstance.fitBounds(latLngs, { padding: [30, 30], animate: true });
          appState.userInteractedWithMap = true;
          saveMobileMapState();
        }
      }
    };

    // Toggle Fallback
    document.getElementById('btn-toggle-fallback').onclick = () => {
      appState.isFallbackView = !appState.isFallbackView;
      const fb = document.getElementById('route-fallback-view');
      fb.style.display = appState.isFallbackView ? 'block' : 'none';
      if (appState.isFallbackView) {
        const bus = appState.buses.find(b => b.bus_id === appState.selectedBusId);
        const route = appState.routes.find(r => r.id === bus.route_id);
        document.getElementById('fallback-route-title').textContent = bus ? bus.bus_number + ': ' + bus.route_name : 'Accessible View';
        let html = '<div style="margin-bottom:12px; font-weight:600;">Stop Progression List:</div>';
        if (route && route.stops) {
          route.stops.forEach((s, i) => {
            html += '<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.1);">' + (i + 1) + '. ' + s.name + ' — ' + s.scheduled_time + '</div>';
          });
        }
        document.getElementById('fallback-progression-content').innerHTML = html;
      }
    };

    // Render Routes Directory
    function renderRoutesDirectory() {
      const list = document.getElementById('routes-directory-list');
      list.innerHTML = '';
      appState.routes.forEach(r => {
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--canvas-card); border:1px solid var(--border-subtle); border-radius:12px; padding:14px; box-shadow:0 1px 4px rgba(0,0,0,0.05); cursor:pointer; transition:transform 0.15s, border-color 0.15s;';
        card.onmouseenter = () => { card.style.borderColor = 'var(--brand-navy)'; };
        card.onmouseleave = () => { card.style.borderColor = 'var(--border-subtle)'; };
        card.onclick = () => openRouteDetail(r.id);

        card.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
          '<span style="font-family:Outfit, sans-serif; font-weight:700; color:var(--brand-navy); background:var(--brand-navy-light); padding:2px 8px; border-radius:4px; font-size:12px;">' + r.code + '</span>' +
          '<span style="font-size:11.5px; color:var(--text-muted); font-weight:600;">' + r.active_buses + ' Active Bus(es) &rarr;</span>' +
          '</div>' +
          '<div style="font-weight:700; font-size:14px; color:var(--text-primary);">' + r.name + '</div>' +
          '<div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">' + r.origin + ' &rarr; ' + r.destination + '</div>' +
          '<div style="margin-top:8px; font-size:11.5px; color:var(--text-muted); display:flex; justify-content:space-between;">' +
          '<span>' + (r.stops ? r.stops.length : 0) + ' defined campus stops</span>' +
          '<span style="color:var(--brand-navy); font-weight:600;">Inspect Corridor Details</span>' +
          '</div>';
        list.appendChild(card);
      });
    }

    // Open Detailed Route Screen (Screen 3: ROUTE DETAILS)
    window.openRouteDetail = (routeId) => {
      appState.selectedRouteId = routeId;
      const route = appState.routes.find(r => r.id === routeId);
      if (!route) return;

      // Switch to routes tab
      switchToTab('routes');

      // Hide directory, show detail view
      document.getElementById('routes-directory-view').style.display = 'none';
      document.getElementById('route-detail-view').style.display = 'block';

      // Route headers
      document.getElementById('route-detail-code').textContent = route.code;
      document.getElementById('route-detail-name').textContent = route.name;
      document.getElementById('route-detail-endpoints').innerHTML = route.origin + ' &rarr; ' + route.destination;
      document.getElementById('route-detail-stops-count').textContent = (route.stops ? route.stops.length : 0) + ' stops';

      // Assigned buses on this corridor
      const assignedBuses = appState.buses.filter(b => b.route_id === route.id);
      const busesList = document.getElementById('route-assigned-buses-list');
      busesList.innerHTML = '';
      if (assignedBuses.length === 0) {
        busesList.innerHTML = '<div style="font-size:12px; color:var(--text-muted); background:var(--canvas-light); padding:10px 14px; border-radius:8px;">No buses currently assigned to this transit corridor.</div>';
      } else {
        assignedBuses.forEach(b => {
          let badgeClass = 'badge-live';
          let badgeText = 'LIVE GPS';
          if (b.state === 'STALE') { badgeClass = 'badge-stale'; badgeText = 'STALE GPS'; }
          if (b.state === 'UNAVAILABLE') { badgeClass = 'badge-unavail'; badgeText = 'UNAVAILABLE'; }
          if (b.state === 'NOT_RUNNING') { badgeClass = 'badge-idle'; badgeText = 'OUTSIDE SHIFT'; }
          if (b.state === 'LIVE_PHONE') { badgeClass = 'badge-demo'; badgeText = 'DRIVER PHONE'; }

          const item = document.createElement('div');
          item.style.cssText = 'background:var(--canvas-light); border:1px solid var(--border-subtle); border-radius:10px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;';
          item.onclick = () => openBusDetail(b.bus_id);
          item.innerHTML = '<div>' +
            '<div style="display:flex; align-items:center; gap:8px;">' +
            '<span style="font-weight:700; color:var(--brand-navy); font-size:13.5px;">' + b.bus_number + '</span>' +
            '<span class="status-badge ' + badgeClass + '" style="font-size:9.5px; padding:1px 6px;">' + badgeText + '</span>' +
            '</div>' +
            '<div style="font-size:11.5px; color:var(--text-secondary); margin-top:2px;">Reg: ' + b.registration + ' &bull; Next: ' + (b.next_stop ? b.next_stop.name : 'Terminal') + '</div>' +
            '</div>' +
            '<button class="btn-route-bus-track" style="background:var(--brand-navy); color:white; border:none; padding:7px 12px; border-radius:6px; font-weight:600; font-size:11.5px; cursor:pointer;">' +
            'Track Live &rarr;' +
            '</button>';
          busesList.appendChild(item);
        });
      }

      // Ordered stops sequence
      const stopsList = document.getElementById('route-detail-stops-list');
      stopsList.innerHTML = '';
      if (route.stops && route.stops.length > 0) {
        route.stops.forEach((s, idx) => {
          const isDest = idx === route.stops.length - 1;
          const item = document.createElement('div');
          item.className = 'stop-timeline-item' + (isDest ? ' destination' : '');
          item.onclick = () => openStopModal(s, route.name, idx + 1);
          item.innerHTML = '<div class="stop-dot"></div>' +
            '<div class="stop-item-content">' +
            '<div style="display:flex; justify-content:space-between; align-items:center;">' +
            '<div class="stop-item-name">Stop #' + (idx + 1) + ': ' + s.name + (isDest ? ' ★' : '') + '</div>' +
            '<span style="font-size:11px; font-weight:700; color:var(--brand-navy); background:var(--canvas-light); padding:2px 6px; border-radius:4px;">' + s.scheduled_time + '</span>' +
            '</div>' +
            '<div class="stop-item-meta" style="margin-top:3px;">' +
            '<span>Morning Pickup: <strong>' + s.scheduled_time + '</strong></span> &bull; ' +
            '<span>Evening Drop: <strong>04:45 PM</strong></span>' +
            '</div>' +
            '</div>';
          stopsList.appendChild(item);
        });
      }
    };

    // Back from Route Detail to Routes Directory
    document.getElementById('btn-back-to-routes').onclick = () => {
      document.getElementById('route-detail-view').style.display = 'none';
      document.getElementById('routes-directory-view').style.display = 'block';
    };

    // Shortcut: Route Detail -> Bus List
    document.getElementById('btn-route-to-buses').onclick = () => {
      switchToTab('buses');
    };

    // Bus Detail -> Route Schedule shortcut
    document.getElementById('btn-view-route-schedule').onclick = () => {
      const bus = appState.buses.find(b => b.bus_id === appState.selectedBusId);
      if (bus) {
        openRouteDetail(bus.route_id);
      }
    };

    // Render Alerts
    function renderAlertsList() {
      const list = document.getElementById('alerts-directory-list');
      list.innerHTML = '';
      appState.alerts.forEach(a => {
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--canvas-card); border:1px solid var(--border-subtle); border-radius:12px; padding:14px; box-shadow:0 1px 4px rgba(0,0,0,0.05);';
        card.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
          '<span class="status-badge ' + (a.severity === 'CRITICAL' ? 'badge-unavail' : (a.severity === 'WARNING' ? 'badge-stale' : 'badge-idle')) + '">' + a.severity + '</span>' +
          '<span style="font-size:11px; color:var(--text-muted);">' + new Date(a.created_at).toLocaleTimeString() + '</span>' +
          '</div>' +
          '<div style="font-weight:700; font-size:13.5px; color:var(--brand-navy);">' + a.title + '</div>' +
          '<p style="font-size:12px; color:var(--text-secondary); margin-top:4px; line-height:1.5;">' + a.message + '</p>';
        list.appendChild(card);
      });
    }

    // Render User Access, Pass & Settings (Screen 4)
    function renderPassTab() {
      if (!appState.currentUser) return;
      const u = appState.currentUser;
      document.getElementById('profile-name').textContent = u.name;
      document.getElementById('profile-email').textContent = u.email;
      document.getElementById('settings-user-name').textContent = u.name;
      document.getElementById('settings-user-email').textContent = u.email;

      let roleLabel = 'Student (STU)';
      let passToken = 'VJIT-PASS-2026-21B01A0501';
      let corridorName = 'Route 12: Mehdipatnam Express';
      let stopName = 'Sun City Bandlaguda';

      if (u.role === 'FAC') {
        roleLabel = 'Faculty Coordinator (FAC)';
        passToken = 'VJIT-PASS-2026-FAC-COORD-88';
        corridorName = 'Route 05: Kukatpally IT Corridor';
        stopName = 'Kukatpally Y Junction';
      } else if (u.role === 'COR') {
        roleLabel = 'Transport Coordinator (COR)';
        passToken = 'VJIT-PASS-2026-ADMIN-STAFF-01';
        corridorName = 'Fleet Operations All Corridors';
        stopName = 'Central Transport Control Desk';
      }

      document.getElementById('settings-user-role').textContent = roleLabel;
      document.getElementById('pass-token-label').textContent = passToken;
      document.getElementById('pass-corridor-name').textContent = corridorName;
      document.getElementById('pass-stop-name').textContent = stopName;
    }

    // Session feedback & simulation handlers (Priority 4)
    document.getElementById('btn-test-expired-session').onclick = () => {
      document.getElementById('session-feedback-alert').style.display = 'block';
      const badge = document.getElementById('session-auth-badge');
      badge.className = 'status-badge badge-unavail';
      badge.textContent = 'SESSION EXPIRED (401)';
    };

    document.getElementById('btn-reauth-action').onclick = async () => {
      document.getElementById('session-feedback-alert').style.display = 'none';
      const badge = document.getElementById('session-auth-badge');
      badge.className = 'status-badge badge-live';
      badge.textContent = 'AUTHENTICATED';
      await loadAllData();
    };

    document.getElementById('btn-settings-switch-role').onclick = () => {
      roleModal.classList.add('open');
    };

    // Helper: Switch between bottom tabs
    function switchToTab(tab) {
      appState.currentTab = tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

      document.getElementById('tab-pane-buses').style.display = tab === 'buses' ? 'block' : 'none';
      document.getElementById('tab-pane-detail').style.display = tab === 'detail' ? 'block' : 'none';
      document.getElementById('tab-pane-routes').style.display = tab === 'routes' ? 'block' : 'none';
      document.getElementById('tab-pane-alerts').style.display = tab === 'alerts' ? 'block' : 'none';
      document.getElementById('tab-pane-profile').style.display = tab === 'profile' ? 'block' : 'none';

      if (tab === 'routes') {
        document.getElementById('routes-directory-view').style.display = 'block';
        document.getElementById('route-detail-view').style.display = 'none';
      }

      const contentArea = document.getElementById('tab-content-area');
      if (contentArea) contentArea.scrollTop = 0;
    }
    window.switchToTab = switchToTab;
    window.loadAllData = loadAllData;
    window.renderApp = renderApp;

    // Tab Bar Navigation Listeners
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        switchToTab(btn.dataset.tab);
      };
    });

    // Desktop iPhone Frame Toggle
    let isPhoneFrame = true;
    const btnToggleFrame = document.getElementById('btn-toggle-frame');
    if (btnToggleFrame) {
      btnToggleFrame.onclick = () => {
        isPhoneFrame = !isPhoneFrame;
        const vp = document.getElementById('mobile-viewport');
        if (isPhoneFrame) {
          vp.style.maxWidth = '440px';
          vp.style.borderRadius = '36px';
          btnToggleFrame.textContent = 'iPhone Mobile Frame (440px)';
          btnToggleFrame.classList.add('active');
        } else {
          vp.style.maxWidth = '900px';
          vp.style.borderRadius = '16px';
          btnToggleFrame.textContent = 'Expanded Responsive View (900px)';
          btnToggleFrame.classList.remove('active');
        }
        if (appState.mapInstance) {
          setTimeout(() => appState.mapInstance.invalidateSize(), 200);
        }
      };
    }

    // Search and Filter Listeners
    searchInput.oninput = (e) => {
      appState.searchQuery = e.target.value.trim();
      renderBusesList();
    };

    document.querySelectorAll('.route-chip').forEach(chip => {
      chip.onclick = () => {
        document.querySelectorAll('.route-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        appState.selectedRouteFilter = chip.dataset.route;
        renderBusesList();
      };
    });

    // Step Simulation Handler
    document.getElementById('btn-step-sim').onclick = async () => {
      try {
        const res = await fetch('/api/v1/demo/tick', { method: 'POST' }).then(r => r.json());
        if (res.success) {
          document.getElementById('demo-step-indicator').textContent = 'Step #' + res.state.stepIndex;
          await loadAllData();
        }
      } catch (err) {}
    };

    document.getElementById('btn-refresh-list').onclick = loadAllData;

    // Role switcher modal
    document.getElementById('btn-role-trigger').onclick = () => roleModal.classList.add('open');
    document.getElementById('btn-close-role-modal').onclick = () => roleModal.classList.remove('open');
    document.querySelectorAll('.role-select-item').forEach(item => {
      item.onclick = async () => {
        const role = item.dataset.role;
        await fetch('/api/v1/auth/switch-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role })
        });
        roleModal.classList.remove('open');
        await loadAllData();
      };
    });

    // Service Worker Registration & PWA Install Support
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }

    let deferredInstallPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'flex';
    });

    const btnInstall = document.getElementById('btn-install-pwa');
    if (btnInstall) {
      btnInstall.onclick = async () => {
        if (deferredInstallPrompt) {
          deferredInstallPrompt.prompt();
          await deferredInstallPrompt.userChoice;
          deferredInstallPrompt = null;
        }
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
      };
    }

    const btnDismissInstall = document.getElementById('btn-dismiss-install');
    if (btnDismissInstall) {
      btnDismissInstall.onclick = () => {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.style.display = 'none';
      };
    }

    // Window resize & orientation change map handling
    window.addEventListener('resize', () => {
      if (appState.mapInstance) appState.mapInstance.invalidateSize();
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        if (appState.mapInstance) appState.mapInstance.invalidateSize();
      }, 200);
    });

    // Initialize theme system (Light, Dark, System)
    initThemeSystem();

    // Polling every 10s
    setInterval(loadAllData, 10000);
    loadAllData();
  </script>
</body>
</html>`;
}
