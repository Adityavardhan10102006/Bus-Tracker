/**
 * VJIT College Bus Tracker — Unified Transit Gateway Portal
 * Conforms to UI-SPEC-1.0 and AG-MASTER-1.0-v2
 */
export function renderPortalHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VJIT College Bus Tracker — Transit Operations & Student Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --brand-navy: #103754;
      --brand-navy-dark: #0A2335;
      --brand-navy-light: #E0F2FE;
      --brand-red: #E51F35;
      --canvas-white: #FFFFFF;
      --canvas-light: #F8FAFC;
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
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--canvas-light);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    header {
      background: linear-gradient(135deg, var(--brand-navy) 0%, var(--brand-navy-dark) 100%);
      color: var(--canvas-white);
      padding: 24px 32px;
      box-shadow: 0 4px 12px rgba(16, 55, 84, 0.15);
    }

    .header-container {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .logo-img {
      height: 48px;
      width: auto;
      aspect-ratio: 241 / 194;
      object-fit: contain;
      background: white;
      padding: 4px 6px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }

    .brand-titles h1 {
      font-family: 'Outfit', 'Inter', sans-serif;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .brand-titles p {
      font-size: 13px;
      color: #93C5FD;
      font-weight: 500;
      margin-top: 2px;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: var(--canvas-white);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      background-color: #4ADE80;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7);
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
      100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
    }

    main {
      flex: 1;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 40px 24px;
    }

    .hero-banner {
      background: var(--canvas-white);
      border-radius: 16px;
      border: 1px solid var(--border-subtle);
      padding: 36px;
      margin-bottom: 40px;
      box-shadow: 0 4px 6px -1px rgba(16, 55, 84, 0.05);
    }

    .hero-banner h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 28px;
      color: var(--brand-navy);
      margin-bottom: 12px;
      font-weight: 700;
    }

    .hero-banner p {
      font-size: 16px;
      color: var(--text-secondary);
      line-height: 1.6;
      max-width: 860px;
    }

    .demo-notice {
      margin-top: 18px;
      padding: 12px 18px;
      background: #F1F5F9;
      border-left: 4px solid var(--brand-navy);
      border-radius: 6px;
      font-size: 13px;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 32px;
      margin-bottom: 40px;
    }

    .portal-card {
      background: var(--canvas-white);
      border-radius: 16px;
      border: 1px solid var(--border-subtle);
      padding: 36px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.25s ease;
      box-shadow: 0 4px 6px -1px rgba(16, 55, 84, 0.05);
      position: relative;
      overflow: hidden;
    }

    .portal-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 14px 25px -4px rgba(16, 55, 84, 0.12);
      border-color: var(--brand-navy-light);
    }

    .card-accent-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 6px;
    }

    .bar-student {
      background: linear-gradient(90deg, #103754 0%, #1E4E79 100%);
    }

    .bar-admin {
      background: linear-gradient(90deg, #E51F35 0%, #B91C1C 100%);
    }

    .card-header-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }

    .icon-student {
      background: var(--brand-navy-light);
      color: var(--brand-navy);
    }

    .icon-admin {
      background: #FEE2E2;
      color: var(--brand-red);
    }

    .portal-card h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: var(--brand-navy);
      margin-bottom: 12px;
    }

    .portal-card .card-desc {
      font-size: 15px;
      color: var(--text-secondary);
      line-height: 1.55;
      margin-bottom: 24px;
    }

    .feature-list {
      list-style: none;
      margin-bottom: 32px;
    }

    .feature-list li {
      font-size: 14px;
      color: var(--text-primary);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .feature-list li svg {
      width: 18px;
      height: 18px;
      color: var(--state-live);
      flex-shrink: 0;
    }

    .btn-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 14px 24px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      transition: background-color 0.2s, transform 0.1s;
      cursor: pointer;
    }

    .btn-student {
      background: var(--brand-navy);
      color: var(--canvas-white);
      border: none;
    }

    .btn-student:hover {
      background: #0D2D44;
    }

    .btn-admin {
      background: var(--brand-red);
      color: var(--canvas-white);
      border: none;
    }

    .btn-admin:hover {
      background: #B91C1C;
    }

    .telemetry-status-section {
      background: var(--canvas-white);
      border-radius: 16px;
      border: 1px solid var(--border-subtle);
      padding: 28px 36px;
      box-shadow: 0 4px 6px -1px rgba(16, 55, 84, 0.05);
    }

    .status-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .status-header h4 {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      color: var(--brand-navy);
      font-weight: 600;
    }

    .status-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .stat-pill {
      background: var(--canvas-light);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 14px 18px;
    }

    .stat-pill-label {
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--text-muted);
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }

    .stat-pill-val {
      font-size: 22px;
      font-weight: 700;
      color: var(--brand-navy);
    }

    footer {
      background: var(--canvas-white);
      border-top: 1px solid var(--border-subtle);
      padding: 24px 32px;
      margin-top: auto;
      text-align: center;
      font-size: 13px;
      color: var(--text-secondary);
    }

    footer a {
      color: var(--brand-navy);
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <header>
    <div class="header-container">
      <div class="brand-group">
        <img src="/assets/vjit-logo.png" alt="VJIT Official Emblem" class="logo-img">
        <div class="brand-titles">
          <h1>VJIT COLLEGE BUS TRACKER</h1>
          <p>Vidya Jyothi Institute of Technology • Aziz Nagar Gate, C.B. Post, Hyderabad</p>
        </div>
      </div>
      <div>
        <span class="badge-pill">
          <span class="pulse-dot"></span>
          LIVE MVP PLATFORM
        </span>
      </div>
    </div>
  </header>

  <main>
    <section class="hero-banner">
      <h2>College Transit Operations & Student Tracking Portal</h2>
      <p>
        Welcome to the authoritative transport platform for VJIT. Select your experience below to access live GPS telemetry,
        stop-by-stop arrival schedules, campus corridors, or administrative fleet controls.
      </p>
      <div class="demo-notice">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>
          <strong>Evaluation & Demo Mode Active:</strong> Bus positions along Hyderabad corridors are driven by live simulation and GPS ingestion pipelines. Simulated telemetry is clearly badged and distinguishable from physical vehicle hardware.
        </span>
      </div>
    </section>

    <section class="cards-grid">
      <!-- 1. Student / Faculty Mobile App Card -->
      <article class="portal-card">
        <div class="card-accent-bar bar-student"></div>
        <div>
          <div class="card-header-icon icon-student">
            <svg width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="5" y="2" width="14" height="20" rx="3" ry="3"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
          </div>
          <h3>Student & Faculty Experience</h3>
          <p class="card-desc">
            Responsive bus tracking optimized for mobile phones. View bus positions in real time, check arrival ETAs, monitor stop sequences, and view safety notices.
          </p>
          <ul class="feature-list">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Live Bus Location & Interactive Map
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Accurate Arrival ETAs & Stop Timeline
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Stale Signal & Offline Cached Fallback
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Role Sign-in: Student, Faculty, or Guest
            </li>
          </ul>
        </div>
        <a href="/app" class="btn-action btn-student" id="btn-open-student-app">
          Open Student & Faculty App &rarr;
        </a>
      </article>

      <!-- 2. Transport Administrator Console Card -->
      <article class="portal-card">
        <div class="card-accent-bar bar-admin"></div>
        <div>
          <div class="card-header-icon icon-admin">
            <svg width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
          </div>
          <h3>Transport Administrator Console</h3>
          <p class="card-desc">
            Desktop operations desk for Transport Coordinators, Super Admins, Technicians, Security, and Management with strict Role-Based Access Control.
          </p>
          <ul class="feature-list">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Fleet Operations Deck & Live Signal Matrix
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Bus Management: Create, Edit & Deactivate
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Routes & Stops Planner with Geofences
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
              GPS Hardware Tracker & Bus Association
            </li>
          </ul>
        </div>
        <a href="/admin" class="btn-action btn-admin" id="btn-open-admin-console">
          Open Transport Admin Console &rarr;
        </a>
      </article>
    </section>

    <!-- 3. System Health Overview -->
    <section class="telemetry-status-section">
      <div class="status-header">
        <h4>Institutional Transit Network Status</h4>
        <div style="font-size: 13px; color: var(--text-muted);" id="live-clock">
          Synchronized UTC / Asia:Kolkata
        </div>
      </div>
      <div class="status-stats-grid">
        <div class="stat-pill">
          <div class="stat-pill-label">Total Buses</div>
          <div class="stat-pill-val">6</div>
        </div>
        <div class="stat-pill">
          <div class="stat-pill-label">Live Tracking</div>
          <div class="stat-pill-val" style="color: var(--state-live);">3</div>
        </div>
        <div class="stat-pill">
          <div class="stat-pill-label">Stale Signals (>60s)</div>
          <div class="stat-pill-val" style="color: var(--state-stale);">1</div>
        </div>
        <div class="stat-pill">
          <div class="stat-pill-label">Transit Routes</div>
          <div class="stat-pill-val">4 Corridors</div>
        </div>
        <div class="stat-pill">
          <div class="stat-pill-label">Destination</div>
          <div class="stat-pill-val" style="font-size: 16px; line-height: 28px;">VJIT Campus Gate</div>
        </div>
      </div>
    </section>
  </main>

  <footer>
    &copy; 2026 Vidya Jyothi Institute of Technology (VJIT), Hyderabad. All rights reserved. •
    <a href="/health">System Health Check</a> •
    <a href="/version">Version & Environment</a>
  </footer>

  <script>
    function updateClock() {
      const now = new Date();
      const el = document.getElementById('live-clock');
      if (el) {
        el.textContent = 'Server Time: ' + now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
      }
    }
    setInterval(updateClock, 1000);
    updateClock();
  </script>
</body>
</html>`;
}
