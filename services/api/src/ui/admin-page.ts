/**
 * VJIT College Bus Tracker — Transport Administrator Web Console
 * Conforms to UI-SPEC-1.0 and AG-MASTER-1.0-v2
 */
export function renderAdminHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VJIT Fleet Operations Desk — Transport Admin Console</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <style>
    :root {
      --brand-navy: #103754;
      --brand-navy-sub: #1E4E79;
      --brand-navy-dark: #0A2335;
      --brand-navy-light: #E0F2FE;
      --brand-red: #E51F35;
      --brand-red-dark: #B91C1C;
      --brand-red-light: #FEE2E2;
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
      --state-idle: #64748B;
      --state-idle-bg: #F1F5F9;
    }

    /* Route Studio & Mapping Styles */
    .studio-container {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 16px;
    }
    @media (max-width: 900px) {
      .studio-container {
        grid-template-columns: 1fr;
      }
    }
    .studio-map-pane {
      position: relative;
      height: 480px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--border-strong);
      background: #E2E8F0;
    }
    #admin-route-map {
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    .studio-stop-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-bottom: 1px solid var(--border-subtle);
      font-size: 12px;
      background: white;
      transition: background 0.15s;
    }
    .studio-stop-row:hover {
      background: #F8FAFC;
    }
    .studio-stop-seq {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: var(--brand-navy);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 10.5px;
      flex-shrink: 0;
    }
    .studio-btn-icon {
      background: white;
      border: 1px solid var(--border-subtle);
      border-radius: 4px;
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 11px;
      color: var(--text-secondary);
      transition: all 0.15s;
    }
    .studio-btn-icon:hover:not(:disabled) {
      background: var(--brand-navy-light);
      color: var(--brand-navy);
      border-color: var(--brand-navy);
    }
    .studio-btn-icon:disabled {
      opacity: 0.35;
      cursor: not-allowed;
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

    /* Top Nav Bar */
    .admin-navbar {
      background: var(--brand-navy);
      color: var(--canvas-white);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 2px 8px rgba(16, 55, 84, 0.15);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-img {
      height: 38px;
      width: auto;
      aspect-ratio: 241 / 194;
      object-fit: contain;
      background: white;
      padding: 2px 5px;
      border-radius: 4px;
    }

    .brand-title-wrap h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 17px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    .brand-title-wrap p {
      font-size: 11px;
      color: #93C5FD;
      font-weight: 500;
    }

    .nav-user-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .role-switcher-dropdown {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 6px 12px;
      border-radius: 8px;
    }

    .role-switcher-dropdown label {
      font-size: 11px;
      color: #BFDBFE;
      font-weight: 600;
      text-transform: uppercase;
    }

    .role-select {
      background: transparent;
      border: none;
      color: white;
      font-weight: 600;
      font-size: 13px;
      outline: none;
      cursor: pointer;
    }

    .role-select option {
      background: var(--brand-navy-dark);
      color: white;
    }

    /* Simulation Control Bar */
    .sim-dock-bar {
      background: #0F172A;
      color: white;
      padding: 8px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      border-bottom: 1px solid #334155;
    }

    .sim-btn-group {
      display: flex;
      gap: 8px;
    }

    .btn-sim-action {
      background: #334155;
      color: white;
      border: 1px solid #475569;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-sim-action:hover {
      background: #475569;
    }

    .btn-sim-primary {
      background: var(--brand-red);
      border-color: var(--brand-red-dark);
    }
    .btn-sim-primary:hover {
      background: var(--brand-red-dark);
    }

    /* Layout Structure */
    .admin-layout {
      flex: 1;
      display: flex;
      min-height: calc(100vh - 110px);
    }

    /* Sidebar Navigation */
    .admin-sidebar {
      width: 240px;
      background: var(--canvas-white);
      border-right: 1px solid var(--border-subtle);
      padding: 20px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex-shrink: 0;
    }

    .sidebar-category-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.05em;
      padding: 12px 12px 4px 12px;
    }

    .nav-link-btn {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      color: var(--text-secondary);
      font-size: 13.5px;
      font-weight: 500;
      text-decoration: none;
      border: none;
      background: transparent;
      width: 100%;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s;
    }

    .nav-link-btn:hover {
      background: var(--canvas-light);
      color: var(--brand-navy);
    }

    .nav-link-btn.active {
      background: var(--brand-navy-light);
      color: var(--brand-navy);
      font-weight: 600;
    }

    .nav-link-btn svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    /* Main Content */
    .admin-main-content {
      flex: 1;
      padding: 32px;
      max-width: 1400px;
      overflow-y: auto;
    }

    .page-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .page-title h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: var(--brand-navy);
    }

    .page-title p {
      font-size: 13.5px;
      color: var(--text-secondary);
      margin-top: 2px;
    }

    .btn-create {
      background: var(--brand-red);
      color: white;
      border: none;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background-color 0.15s;
    }

    .btn-create:hover {
      background: var(--brand-red-dark);
    }

    /* Metrics Grid */
    .counters-deck-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .counter-card {
      background: var(--canvas-white);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      padding: 18px 20px;
      box-shadow: 0 1px 3px rgba(16, 55, 84, 0.05);
    }

    .counter-card-lbl {
      font-size: 11.5px;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.04em;
    }

    .counter-card-val {
      font-family: 'Outfit', sans-serif;
      font-size: 28px;
      font-weight: 700;
      color: var(--brand-navy);
      margin-top: 6px;
    }

    /* Data Tables */
    .data-table-container {
      background: var(--canvas-white);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(16, 55, 84, 0.03);
    }

    .table-toolbar {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .table-search-input {
      padding: 8px 14px;
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      font-size: 13px;
      width: 280px;
      font-family: inherit;
    }

    .table-search-input:focus {
      outline: none;
      border-color: var(--brand-navy);
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13.5px;
    }

    table.data-table th {
      background: var(--canvas-light);
      padding: 12px 18px;
      font-weight: 600;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-subtle);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    table.data-table td {
      padding: 14px 18px;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-primary);
    }

    table.data-table tr:last-child td {
      border-bottom: none;
    }

    table.data-table tr:hover td {
      background: #F8FAFC;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .badge-live { background: var(--state-live-bg); color: var(--state-live); }
    .badge-stale { background: var(--state-stale-bg); color: var(--state-stale); }
    .badge-unavail { background: var(--state-unavail-bg); color: var(--state-unavail); }
    .badge-idle { background: var(--state-idle-bg); color: var(--state-idle); }
    .badge-active { background: #DCFCE7; color: #15803D; }
    .badge-maint { background: #FEF3C7; color: #B45309; }
    .badge-retired { background: #F1F5F9; color: #64748B; }
    .badge-demo { background: #F3E8FF; color: #7E22CE; border: 1px solid #D8B4FE; }

    .btn-table-action {
      background: transparent;
      border: 1px solid var(--border-strong);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-table-action:hover {
      background: var(--canvas-light);
      color: var(--brand-navy);
      border-color: var(--brand-navy);
    }

    .btn-table-danger {
      color: var(--brand-red);
      border-color: #FCA5A5;
    }
    .btn-table-danger:hover {
      background: #FEE2E2;
      color: var(--brand-red-dark);
      border-color: var(--brand-red);
    }

    /* Modal Styling */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(2px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .modal-overlay.open {
      display: flex;
    }

    .admin-modal-card {
      background: var(--canvas-white);
      border-radius: 16px;
      width: 100%;
      max-width: 520px;
      box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.25);
      overflow: hidden;
    }

    .modal-head {
      background: var(--brand-navy);
      color: white;
      padding: 18px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-head h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 700;
    }

    .modal-close-x {
      background: none;
      border: none;
      color: white;
      font-size: 22px;
      cursor: pointer;
    }

    .modal-body {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 6px;
    }

    .form-control {
      width: 100%;
      padding: 9px 12px;
      border: 1px solid var(--border-strong);
      border-radius: 8px;
      font-size: 13.5px;
      font-family: inherit;
      outline: none;
    }

    .form-control:focus {
      border-color: var(--brand-navy);
      box-shadow: 0 0 0 2px var(--brand-navy-light);
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .modal-foot {
      padding: 16px 24px;
      background: var(--canvas-light);
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    .btn-secondary {
      background: white;
      border: 1px solid var(--border-strong);
      color: var(--text-secondary);
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }

    .btn-primary {
      background: var(--brand-navy);
      border: none;
      color: white;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }

    .feedback-banner {
      padding: 12px 18px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 13.5px;
      display: none;
    }
    .feedback-success { background: #DCFCE7; border: 1px solid #86EFAC; color: #166534; }
    .feedback-error { background: #FEE2E2; border: 1px solid #FCA5A5; color: #991B1B; }
  </style>
</head>
<body>
  <!-- Top Navigation Bar -->
  <header class="admin-navbar">
    <div class="brand-section">
      <img src="/assets/vjit-logo.png" alt="VJIT Emblem" class="logo-img">
      <div class="brand-title-wrap">
        <h1>VJIT FLEET OPERATIONS DESK</h1>
        <p>Vidya Jyothi Institute of Technology • Central Transport Office</p>
      </div>
    </div>
    <div class="nav-user-controls">
      <div class="role-switcher-dropdown">
        <label for="admin-role-select">Active Role:</label>
        <select id="admin-role-select" class="role-select">
          <option value="COR">COR • Transport Coordinator</option>
          <option value="SAD">SAD • Super Administrator</option>
          <option value="TEC">TEC • Fleet Technician (No Linking)</option>
          <option value="MGT">MGT • College Management (Aggregates Only)</option>
          <option value="SEC">SEC • Campus Security (Read-Only)</option>
        </select>
      </div>
      <a href="/app" style="color:#93C5FD; font-size:12.5px; font-weight:600; text-decoration:none;">&larr; Student View</a>
      <a href="/" style="color:white; font-size:12.5px; font-weight:600; text-decoration:none;">Portal Home</a>
    </div>
  </header>

  <!-- Live Simulation Control Bar -->
  <aside class="sim-dock-bar">
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#4ADE80;"></span>
      <span>Live Simulation Engine: <strong id="sim-step-text">Step #3</strong> &bull; Corridors to VJIT Campus</span>
    </div>
    <div class="sim-btn-group">
      <button class="btn-sim-action btn-sim-primary" id="btn-admin-step-sim">Step 10s Forward &rarr;</button>
      <button class="btn-sim-action" id="btn-admin-toggle-sim">Toggle Simulation</button>
    </div>
  </aside>

  <!-- Notification Banner -->
  <div id="feedback-alert" class="feedback-banner" style="margin:16px 24px 0 24px;"></div>

  <!-- Admin Layout -->
  <div class="admin-layout">
    <!-- Left Navigation Sidebar -->
    <nav class="admin-sidebar">
      <div class="sidebar-category-label">Operations</div>
      <button class="nav-link-btn active" data-page="fleet-deck">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        Fleet Operations Deck
      </button>

      <div class="sidebar-category-label">Fleet & Assets</div>
      <button class="nav-link-btn" data-page="buses">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
        Bus Fleet & Compliance
      </button>
      <button class="nav-link-btn" data-page="routes">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="19" r="3"></circle><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"></path><circle cx="18" cy="5" r="3"></circle></svg>
        Routes & Stop Geofences
      </button>
      <button class="nav-link-btn" data-page="devices">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
        GPS Tracker Hardware
      </button>

      <div class="sidebar-category-label">Passenger & Audit</div>
      <button class="nav-link-btn" data-page="attendance">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        Attendance & Boarding
      </button>

      <div class="sidebar-category-label">Maintenance & Admin</div>
      <button class="nav-link-btn" data-page="maintenance">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
        Maintenance & Tickets
      </button>
      <button class="nav-link-btn" data-page="settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        Settings & Audit Log
      </button>
    </nav>

    <!-- Main Content Panel -->
    <main class="admin-main-content">
      <!-- 1. FLEET OPERATIONS DECK PAGE -->
      <section id="page-fleet-deck">
        <div class="page-header-row">
          <div class="page-title">
            <h2>Fleet Operations Deck (ADM-02)</h2>
            <p>Real-time vehicle telemetry freshness and operational signals across Hyderabad campus corridors.</p>
          </div>
          <div>
            <span style="font-size:12px; color:var(--text-muted);">Auto-polling: Every 10s</span>
          </div>
        </div>

        <!-- Metric Counter Deck -->
        <div class="counters-deck-grid">
          <div class="counter-card">
            <div class="counter-card-lbl">Total Buses</div>
            <div class="counter-card-val" id="cnt-total-buses">6</div>
          </div>
          <div class="counter-card">
            <div class="counter-card-lbl">Live Tracking</div>
            <div class="counter-card-val" id="cnt-live-buses" style="color:var(--state-live);">3</div>
          </div>
          <div class="counter-card">
            <div class="counter-card-lbl">Trackers Online</div>
            <div class="counter-card-val" id="cnt-linked-devices" style="color:var(--brand-navy);">3</div>
          </div>
          <div class="counter-card">
            <div class="counter-card-lbl">Stale Signals (>60s)</div>
            <div class="counter-card-val" id="cnt-stale-buses" style="color:var(--state-stale);">1</div>
          </div>
          <div class="counter-card">
            <div class="counter-card-lbl">Unavailable</div>
            <div class="counter-card-val" id="cnt-unavail-buses" style="color:var(--state-unavail);">1</div>
          </div>
          <div class="counter-card">
            <div class="counter-card-lbl">Outside Shift</div>
            <div class="counter-card-val" id="cnt-idle-buses" style="color:var(--state-idle);">1</div>
          </div>
        </div>

        <!-- Fleet Table Container -->
        <div class="data-table-container">
          <div class="table-toolbar">
            <input type="text" class="table-search-input" id="fleet-search-input" placeholder="Search bus, registration, or route...">
            <span style="font-size:12.5px; color:var(--text-secondary);">Showing active fleet snapshots</span>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Bus Number</th>
                <th>Route Corridor</th>
                <th>Registration</th>
                <th>Telemetry Source</th>
                <th>Speed</th>
                <th>Signal Age</th>
                <th>Integrity Status</th>
                <th>Next Scheduled Stop</th>
              </tr>
            </thead>
            <tbody id="fleet-table-body">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </section>

      <!-- 2. BUS FLEET & COMPLIANCE PAGE -->
      <section id="page-buses" style="display:none;">
        <div class="page-header-row">
          <div class="page-title">
            <h2>Bus Fleet & Document Compliance (ADM-03)</h2>
            <p>Registration, statutory compliance tracking, insurance, fitness certificates, and vehicle status.</p>
          </div>
          <button class="btn-create" id="btn-open-add-bus">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add New Bus
          </button>
        </div>

        <div class="data-table-container">
          <div class="table-toolbar">
            <input type="text" class="table-search-input" id="buses-search-input" placeholder="Search bus number, registration, or route...">
            <span style="font-size:12.5px; color:var(--text-secondary);">Showing registered institutional vehicles</span>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Bus Identifier</th>
                <th>Registration</th>
                <th>Route Corridor</th>
                <th>Current Location / Stop</th>
                <th>Capacity</th>
                <th>Lifecycle Status</th>
                <th>Statutory Compliance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="buses-admin-table-body">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </section>

      <!-- 3. ROUTES & STOP GEOFENCES PAGE -->
      <section id="page-routes" style="display:none;">
        <div class="page-header-row">
          <div class="page-title">
            <h2>Routes & Stop Geofences (ADM-07)</h2>
            <p>Corridor geometry connecting Hyderabad nodes to VJIT Aziz Nagar Campus.</p>
          </div>
          <button class="btn-create" id="btn-open-add-route">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Create Route
          </button>
        </div>

        <div class="data-table-container">
          <div class="table-toolbar">
            <input type="text" class="table-search-input" id="routes-search-input" placeholder="Search route code, name, origin, or destination...">
            <span style="font-size:12.5px; color:var(--text-secondary);">Transit corridors and defined stops to VJIT Campus</span>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Route Name</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Geometry &amp; Length</th>
                <th>Active Buses</th>
                <th>Stops Count</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="routes-admin-table-body">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </section>

      <!-- 4. GPS TRACKER HARDWARE PAGE -->
      <section id="page-devices" style="display:none;">
        <div class="page-header-row">
          <div class="page-title">
            <h2>GPS Tracker Hardware Inventory (ADM-04)</h2>
            <p>In-bus ESP8266/NEO-6M hardware modules and bus association mappings.</p>
          </div>
        </div>

        <div class="data-table-container">
          <div class="table-toolbar">
            <input type="text" class="table-search-input" id="devices-search-input" placeholder="Search device ID, IMEI, or assigned bus...">
            <span style="font-size:12.5px; color:var(--text-secondary);">Tracker Association Registry (Rule E.6 Protected)</span>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Device ID</th>
                <th>Serial / IMEI</th>
                <th>Connectivity Signal</th>
                <th>Provisioning</th>
                <th>Firmware</th>
                <th>Associated Bus</th>
                <th>Last Telemetry Report</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="devices-admin-table-body">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </section>

      <!-- 5. ATTENDANCE & PASSENGER AUDIT (ADM-08) -->
      <section id="page-attendance" style="display:none;">
        <div class="page-header-row">
          <div class="page-title">
            <h2>Attendance & Passenger Audit (ADM-08)</h2>
            <p>Cryptographic QR boarding scans, RFID tap-ins, and late check-in audits across transit routes.</p>
          </div>
          <button class="btn-create" id="btn-open-manual-checkin">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Manual Late Check-In
          </button>
        </div>

        <div class="counters-deck-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">
          <div class="counter-card">
            <div class="counter-card-lbl">Total Boarded</div>
            <div class="counter-card-val" id="cnt-att-boarded" style="color:var(--state-live);">0</div>
          </div>
          <div class="counter-card">
            <div class="counter-card-lbl">Late Boarded</div>
            <div class="counter-card-val" id="cnt-att-late" style="color:var(--state-stale);">0</div>
          </div>
          <div class="counter-card">
            <div class="counter-card-lbl">Expected At Stops</div>
            <div class="counter-card-val" id="cnt-att-expected" style="color:var(--brand-navy);">0</div>
          </div>
          <div class="counter-card">
            <div class="counter-card-lbl">Absent / On Leave</div>
            <div class="counter-card-val" id="cnt-att-absent" style="color:var(--text-muted);">0</div>
          </div>
        </div>

        <div class="data-table-container">
          <div class="table-toolbar">
            <input type="text" class="table-search-input" id="att-search-input" placeholder="Search roll number or stop name...">
            <div style="display:flex; gap:10px;">
              <select id="att-filter-trip" class="form-control" style="width:160px; padding:6px 10px;">
                <option value="">All Shifts</option>
                <option value="MORNING">Morning Inbound</option>
                <option value="AFTERNOON">Evening Outbound</option>
              </select>
              <select id="att-filter-status" class="form-control" style="width:160px; padding:6px 10px;">
                <option value="">All Statuses</option>
                <option value="BOARDED">Boarded</option>
                <option value="LATE_BOARDED">Late Boarded</option>
                <option value="EXPECTED">Expected</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Student Identifier</th>
                <th>Trip & Date</th>
                <th>Boarding Stop</th>
                <th>Boarded Time</th>
                <th>Verification Method</th>
                <th>Attendance Status</th>
              </tr>
            </thead>
            <tbody id="attendance-table-body">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </section>

      <!-- 6. FLEET MAINTENANCE & WORK ORDERS (ADM-05) -->
      <section id="page-maintenance" style="display:none;">
        <div class="page-header-row">
          <div class="page-title">
            <h2>Fleet Maintenance & Inspection Board (ADM-05)</h2>
            <p>Vehicle roadworthiness work orders, in-bus tracker diagnostics, and repair tracking.</p>
          </div>
          <button class="btn-create" id="btn-open-add-ticket">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Create Work Order
          </button>
        </div>

        <div class="counters-deck-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">
          <div class="counter-card">
            <div class="counter-card-lbl">Total Work Orders</div>
            <div class="counter-card-val" id="cnt-maint-total">0</div>
          </div>
          <div class="counter-card">
            <div class="counter-card-lbl">Open Tickets</div>
            <div class="counter-card-val" id="cnt-maint-open" style="color:var(--brand-red);">0</div>
          </div>
          <div class="counter-card">
            <div class="counter-card-lbl">In Progress</div>
            <div class="counter-card-val" id="cnt-maint-inprogress" style="color:var(--state-stale);">0</div>
          </div>
          <div class="counter-card">
            <div class="counter-card-lbl">Resolved / Closed</div>
            <div class="counter-card-val" id="cnt-maint-resolved" style="color:var(--state-live);">0</div>
          </div>
        </div>

        <div class="data-table-container">
          <div class="table-toolbar">
            <input type="text" class="table-search-input" id="maint-search-input" placeholder="Search ticket number, title, or bus/hardware...">
            <div style="display:flex; gap:8px;">
              <button class="btn-table-action active" id="btn-maint-filter-all" onclick="filterMaintEntity('')">All Tickets</button>
              <button class="btn-table-action" id="btn-maint-filter-bus" onclick="filterMaintEntity('BUS')">Bus Fleet</button>
              <button class="btn-table-action" id="btn-maint-filter-dev" onclick="filterMaintEntity('DEVICE')">GPS Hardware</button>
            </div>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Target Entity</th>
                <th>Issue Summary</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Assigned Workshop</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="maintenance-table-body">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </section>

      <!-- 7. SYSTEM CONFIGURATION & AUDIT LOG (ADM-09 / ADM-14) -->
      <section id="page-settings" style="display:none;">
        <div class="page-header-row">
          <div class="page-title">
            <h2>System Configuration & Audit Log (ADM-09 / ADM-14)</h2>
            <p>Operational thresholds (Part I.5) and immutable administrative audit history.</p>
          </div>
        </div>

        <div style="background:var(--canvas-white); border:1px solid var(--border-subtle); border-radius:12px; padding:20px; margin-bottom:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div>
              <h3 style="font-family:'Outfit'; font-size:16px; color:var(--brand-navy); font-weight:700;">Operational Parameters (Part I.5 Baseline)</h3>
              <p style="font-size:12.5px; color:var(--text-secondary); margin-top:2px;">Thresholds stored in database settings table. Modification is strictly restricted to Super Administrators (SAD) with an audit reason.</p>
            </div>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Setting Key</th>
                <th>Operational Description</th>
                <th>Current Value</th>
                <th>Default Baseline</th>
                <th>Section</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="settings-table-body">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>

        <div class="data-table-container">
          <div class="table-toolbar">
            <div>
              <span style="font-weight:700; color:var(--brand-navy); font-size:14px;">Immutable Administrative Audit Log</span>
              <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">Every administrative write operation is permanently recorded with user identity and IP address.</p>
            </div>
            <button class="btn-table-action" id="btn-export-audit" onclick="exportAuditLogs()">Export Audit CSV</button>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp (UTC)</th>
                <th>Operator Email</th>
                <th>Role</th>
                <th>Action</th>
                <th>Entity Target</th>
                <th>Audit Reason / Detail</th>
              </tr>
            </thead>
            <tbody id="audit-table-body">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>

  <!-- Modal: Add Bus -->
  <div class="modal-overlay" id="modal-add-bus">
    <div class="admin-modal-card">
      <div class="modal-head">
        <h3>Register Institutional Bus</h3>
        <button class="modal-close-x" onclick="closeModal('modal-add-bus')">&times;</button>
      </div>
      <form id="form-add-bus">
        <div class="modal-body">
          <div class="form-grid-2">
            <div class="form-group">
              <label>Bus Number (e.g. Bus 18)</label>
              <input type="text" class="form-control" name="bus_number" required placeholder="Bus 18">
            </div>
            <div class="form-group">
              <label>Registration Number</label>
              <input type="text" class="form-control" name="registration" required placeholder="TS 09 UB 6618">
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Seating Capacity</label>
              <input type="number" class="form-control" name="seating_capacity" required value="50" min="20" max="65">
            </div>
            <div class="form-group">
              <label>Initial Status</label>
              <select class="form-control" name="status">
                <option value="ACTIVE">ACTIVE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Insurance Expiry</label>
              <input type="date" class="form-control" name="insurance_expiry" required value="2027-06-30">
            </div>
            <div class="form-group">
              <label>Fitness Expiry</label>
              <input type="date" class="form-control" name="fitness_expiry" required value="2027-04-30">
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Pollution Expiry</label>
              <input type="date" class="form-control" name="pollution_expiry" required value="2026-12-31">
            </div>
            <div class="form-group">
              <label>Permit Expiry</label>
              <input type="date" class="form-control" name="permit_expiry" required value="2028-06-30">
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn-secondary" onclick="closeModal('modal-add-bus')">Cancel</button>
          <button type="submit" class="btn-primary">Save Bus Record</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Create Route -->
  <div class="modal-overlay" id="modal-add-route">
    <div class="admin-modal-card">
      <div class="modal-head">
        <h3>Create Transit Route</h3>
        <button class="modal-close-x" onclick="closeModal('modal-add-route')">&times;</button>
      </div>
      <form id="form-add-route">
        <div class="modal-body">
          <div class="form-grid-2">
            <div class="form-group">
              <label>Route Code (e.g. R-14)</label>
              <input type="text" class="form-control" name="code" required placeholder="R-14">
            </div>
            <div class="form-group">
              <label>Route Name</label>
              <input type="text" class="form-control" name="name" required placeholder="Route 14: Ecil Express">
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Origin Point</label>
              <input type="text" class="form-control" name="origin" required placeholder="ECIL X Roads">
            </div>
            <div class="form-group">
              <label>Destination Point</label>
              <input type="text" class="form-control" name="destination" required value="VJIT Main Campus">
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn-secondary" onclick="closeModal('modal-add-route')">Cancel</button>
          <button type="submit" class="btn-primary">Create Route</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Link Device to Bus -->
  <div class="modal-overlay" id="modal-link-device">
    <div class="admin-modal-card">
      <div class="modal-head">
        <h3>Link Hardware Tracker to Bus</h3>
        <button class="modal-close-x" onclick="closeModal('modal-link-device')">&times;</button>
      </div>
      <form id="form-link-device">
        <input type="hidden" id="link-target-device-id" name="device_id">
        <div class="modal-body">
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
            Target Device: <strong id="link-device-label">HW_3045</strong>
          </p>
          <div class="form-group">
            <label>Select Bus for Association</label>
            <select class="form-control" id="link-bus-select" name="bus_id" required>
              <!-- Populated dynamically -->
            </select>
          </div>
          <div style="font-size:12px; color:var(--text-muted); background:var(--canvas-light); padding:10px; border-radius:6px;">
            <strong>Rule E.6 Note:</strong> Only Transport Coordinators (COR) and Super Admins (SAD) can associate devices. Fleet Technicians (TEC) are blocked.
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn-secondary" onclick="closeModal('modal-link-device')">Cancel</button>
          <button type="submit" class="btn-primary">Confirm Association</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Edit Bus -->
  <div class="modal-overlay" id="modal-edit-bus">
    <div class="admin-modal-card">
      <div class="modal-head">
        <h3>Edit Institutional Bus Details</h3>
        <button class="modal-close-x" onclick="closeModal('modal-edit-bus')">&times;</button>
      </div>
      <form id="form-edit-bus">
        <input type="hidden" id="edit-bus-id" name="id">
        <div class="modal-body">
          <div class="form-grid-2">
            <div class="form-group">
              <label>Bus Identifier</label>
              <input type="text" class="form-control" id="edit-bus-number" name="bus_number" required>
            </div>
            <div class="form-group">
              <label>Registration Number</label>
              <input type="text" class="form-control" id="edit-bus-registration" name="registration" required>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Seating Capacity</label>
              <input type="number" class="form-control" id="edit-bus-capacity" name="seating_capacity" required min="20" max="65">
            </div>
            <div class="form-group">
              <label>Operational Status</label>
              <select class="form-control" id="edit-bus-status" name="status">
                <option value="ACTIVE">ACTIVE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="RETIRED">RETIRED</option>
              </select>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Insurance Expiry</label>
              <input type="date" class="form-control" id="edit-bus-insurance" name="insurance_expiry" required>
            </div>
            <div class="form-group">
              <label>Fitness Expiry</label>
              <input type="date" class="form-control" id="edit-bus-fitness" name="fitness_expiry" required>
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Pollution Expiry</label>
              <input type="date" class="form-control" id="edit-bus-pollution" name="pollution_expiry" required>
            </div>
            <div class="form-group">
              <label>Permit Expiry</label>
              <input type="date" class="form-control" id="edit-bus-permit" name="permit_expiry" required>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn-secondary" onclick="closeModal('modal-edit-bus')">Cancel</button>
          <button type="submit" class="btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Route Studio (Automatic Route Drawing, Stop Reordering & Interactive Leaflet Map) -->
  <div class="modal-overlay" id="modal-manage-stops">
    <div class="admin-modal-card" style="max-width: 1060px; width: 95vw;">
      <div class="modal-head" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 id="manage-stops-route-title" style="display:flex; align-items:center; gap:8px;">
            <span>Route Studio</span>
            <span id="studio-unsaved-badge" style="display:none; font-size:11px; background:#FEF3C7; color:#92400E; padding:2px 8px; border-radius:4px; font-weight:700;">⚠️ Unsaved Changes</span>
          </h3>
          <p id="manage-stops-route-subtitle" style="font-size:12.5px; color:var(--text-secondary); margin-top:2px;"></p>
        </div>
        <button class="modal-close-x" onclick="closeModal('modal-manage-stops')">&times;</button>
      </div>

      <div class="modal-body" style="max-height: 75vh; overflow-y: auto; padding: 18px 20px;">
        <!-- Validation Error Alert Banner -->
        <div id="studio-error-banner" style="display:none; background:#FEE2E2; border:1px solid #FCA5A5; color:#B91C1C; padding:10px 14px; border-radius:8px; font-size:12px; margin-bottom:14px; font-weight:500;"></div>

        <!-- Studio Grid Layout -->
        <div class="studio-container">
          <!-- Left Column: Stop Sequence & Form -->
          <div style="display:flex; flex-direction:column; gap:14px;">
            <!-- Metrics & Source Info Bar -->
            <div style="background:var(--canvas-light); border:1px solid var(--border-subtle); border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; font-size:12px;">
              <div>
                <span style="color:var(--text-muted); font-weight:600;">Geometry:</span>
                <span id="studio-geom-badge" style="margin-left:4px; font-weight:700; padding:2px 6px; border-radius:4px;">OSRM Road</span>
              </div>
              <div>
                <span style="color:var(--text-muted); font-weight:600;">Length:</span>
                <strong id="studio-distance-val" style="margin-left:4px; color:var(--brand-navy);">14.2 km</strong>
              </div>
              <div>
                <span style="color:var(--text-muted); font-weight:600;">Stops:</span>
                <strong id="studio-stops-count-val" style="margin-left:4px; color:var(--brand-navy);">5</strong>
              </div>
            </div>

            <!-- Ordered Stops Sequence Table -->
            <div style="border:1px solid var(--border-subtle); border-radius:8px; overflow:hidden;">
              <div style="background:var(--brand-navy); color:white; padding:8px 12px; font-size:12px; font-weight:700; display:flex; justify-content:space-between; align-items:center;">
                <span>Stop Progression &amp; Ordering</span>
                <span style="font-size:10.5px; opacity:0.85;">Use ▲/▼ to re-order sequence</span>
              </div>
              <div id="studio-stops-list" style="max-height: 220px; overflow-y: auto;">
                <!-- Dynamically generated stop sequence rows -->
              </div>
            </div>

            <!-- Add New Stop Inline Form -->
            <div id="studio-add-stop-panel" style="background:var(--canvas-light); border:1px solid var(--border-subtle); border-radius:8px; padding:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <h4 style="font-size:13px; font-weight:700; color:var(--brand-navy);">Add Stop to Sequence</h4>
                <button type="button" id="btn-toggle-pick-mode" class="btn-secondary" style="font-size:11px; padding:3px 8px; display:flex; align-items:center; gap:4px; cursor:pointer;">
                  <span>📍</span> <span id="lbl-pick-mode">Pick on Map</span>
                </button>
              </div>
              <form id="form-add-stop">
                <input type="hidden" id="add-stop-route-id" name="route_id">
                <div class="form-grid-2">
                  <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-size:11px;">Stop Name</label>
                    <input type="text" class="form-control" id="studio-new-stop-name" name="name" required placeholder="e.g. Pillar 143 Attapur" style="padding:5px 8px; font-size:12px;">
                  </div>
                  <div class="form-group" style="margin-bottom:8px;">
                    <label style="font-size:11px;">Scheduled Pickup Time</label>
                    <input type="text" class="form-control" id="studio-new-stop-time" name="scheduled_time" required placeholder="08:15 AM" style="padding:5px 8px; font-size:12px;">
                  </div>
                </div>
                <div class="form-grid-2">
                  <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:11px;">Latitude (8° to 37° N)</label>
                    <input type="number" step="0.0001" class="form-control" id="studio-new-stop-lat" name="latitude" required value="17.3750" style="padding:5px 8px; font-size:12px;">
                  </div>
                  <div class="form-group" style="margin-bottom:10px;">
                    <label style="font-size:11px;">Longitude (68° to 97° E)</label>
                    <input type="number" step="0.0001" class="form-control" id="studio-new-stop-lng" name="longitude" required value="78.4320" style="padding:5px 8px; font-size:12px;">
                  </div>
                </div>
                <div style="display:flex; justify-content:flex-end;">
                  <button type="submit" class="btn-primary" style="font-size:12px; padding:6px 14px;">+ Insert Stop</button>
                </div>
              </form>
            </div>
          </div>

          <!-- Right Column: Interactive Map Preview Pane -->
          <div class="studio-map-pane">
            <div id="studio-tiles-warning" style="display:none; position:absolute; top:8px; left:8px; right:8px; background:rgba(217,119,6,0.92); color:white; padding:6px 10px; border-radius:6px; font-size:11px; z-index:25; backdrop-filter:blur(4px);">
              ⚠️ Tile loading slow or unavailable. Geometric route path remains active.
            </div>
            <div id="admin-route-map"></div>
            <div style="position:absolute; bottom:10px; left:10px; z-index:10; background:rgba(255,255,255,0.92); backdrop-filter:blur(4px); padding:4px 8px; border-radius:6px; font-size:10px; border:1px solid var(--border-strong); display:flex; gap:10px; align-items:center;">
              <span style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:12px; height:3px; background:#103754;"></span> Road Route</span>
              <span style="display:flex; align-items:center; gap:4px;"><span style="display:inline-block; width:12px; height:3px; background:#D97706; border-top:1px dashed #D97706;"></span> Straight Fallback</span>
            </div>
            <div style="position:absolute; top:10px; right:10px; z-index:10; display:flex; flex-direction:column; gap:6px;">
              <button type="button" class="studio-btn-icon" id="btn-studio-fit-bounds" title="Fit Route Bounds" style="background:white; width:30px; height:30px; font-size:14px; box-shadow:0 2px 5px rgba(0,0,0,0.15);">&#x26F6;</button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-foot" style="display:flex; justify-content:space-between; align-items:center; padding:12px 20px;">
        <div style="display:flex; gap:8px;">
          <button type="button" id="btn-studio-recalculate" class="btn-secondary" style="font-size:12.5px; padding:8px 14px; font-weight:600; display:flex; align-items:center; gap:6px; cursor:pointer;">
            <span>⚡</span> <span>Recalculate Road Geometry (OSRM)</span>
          </button>
        </div>
        <div style="display:flex; gap:10px;">
          <button type="button" class="btn-secondary" onclick="closeModal('modal-manage-stops')">Cancel</button>
          <button type="button" id="btn-studio-save" class="btn-primary" style="font-size:12.5px; padding:8px 18px; font-weight:700; cursor:pointer;">
            💾 Save Route Changes
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: Manual Late Check-In (ADM-08) -->
  <div class="modal-overlay" id="modal-manual-checkin">
    <div class="admin-modal-card">
      <div class="modal-head">
        <h3>Manual Boarding Check-In (Coordinator Override)</h3>
        <button class="modal-close-x" onclick="closeModal('modal-manual-checkin')">&times;</button>
      </div>
      <form id="form-manual-checkin">
        <div class="modal-body">
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:14px;">
            Enables transport coordinators to manually log a student who boarded without an active QR token or whose NFC card malfunctioned.
          </p>
          <div class="form-group">
            <label>Student Roll Number or ID</label>
            <input type="text" class="form-control" name="student_id" required placeholder="e.g. 21B01A0501 or Student UUID">
          </div>
          <div class="form-group">
            <label>Boarding Stop Name</label>
            <input type="text" class="form-control" name="stop_name" required placeholder="e.g. Sun City Bandlaguda">
          </div>
          <div class="form-group">
            <label>Assigned Trip</label>
            <select class="form-control" name="trip_id">
              <option value="00000000-0000-4000-8000-000000000001">Route 12: Morning Inbound (Bus 12)</option>
              <option value="00000000-0000-4000-8000-000000000002">Route 05: Morning Inbound (Bus 05)</option>
            </select>
          </div>
          <div style="font-size:12px; color:var(--text-muted); background:var(--canvas-light); padding:10px; border-radius:6px;">
            <strong>Audit Policy (Spec 18.2):</strong> All manual overrides are stamped with coordinator email and preserved in the audit log.
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn-secondary" onclick="closeModal('modal-manual-checkin')">Cancel</button>
          <button type="submit" class="btn-primary">Record Late Boarding</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Create Maintenance Ticket (ADM-05) -->
  <div class="modal-overlay" id="modal-add-ticket">
    <div class="admin-modal-card">
      <div class="modal-head">
        <h3>Create Maintenance Work Order</h3>
        <button class="modal-close-x" onclick="closeModal('modal-add-ticket')">&times;</button>
      </div>
      <form id="form-add-ticket">
        <div class="modal-body">
          <div class="form-grid-2">
            <div class="form-group">
              <label>Target Entity Type</label>
              <select class="form-control" id="ticket-entity-type" name="entity_type" required>
                <option value="BUS">Bus Fleet Vehicle</option>
                <option value="DEVICE">GPS Tracker Hardware</option>
              </select>
            </div>
            <div class="form-group">
              <label>Target Entity Identifier</label>
              <input type="text" class="form-control" name="entity_identifier" required placeholder="e.g. Bus 12 or HW_1042">
            </div>
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Severity Level</label>
              <select class="form-control" name="severity" required>
                <option value="LOW">LOW • Routine Servicing</option>
                <option value="MEDIUM" selected>MEDIUM • Standard Work Order</option>
                <option value="HIGH">HIGH • Operational Degrade</option>
                <option value="CRITICAL">CRITICAL • Safety / Grounded</option>
              </select>
            </div>
            <div class="form-group">
              <label>Assigned Workshop / Specialist</label>
              <input type="text" class="form-control" name="assigned_to" required placeholder="e.g. Central Garage or N. Srinivas (Tech)">
            </div>
          </div>
          <div class="form-group">
            <label>Work Order Title</label>
            <input type="text" class="form-control" name="title" required placeholder="Summary of maintenance or diagnostic issue">
          </div>
          <div class="form-group">
            <label>Detailed Description</label>
            <textarea class="form-control" name="description" rows="3" placeholder="Symptoms, observed odometer, error codes..."></textarea>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn-secondary" onclick="closeModal('modal-add-ticket')">Cancel</button>
          <button type="submit" class="btn-primary">Dispatch Work Order</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Resolve Maintenance Ticket -->
  <div class="modal-overlay" id="modal-resolve-ticket">
    <div class="admin-modal-card">
      <div class="modal-head">
        <h3>Resolve Maintenance Ticket</h3>
        <button class="modal-close-x" onclick="closeModal('modal-resolve-ticket')">&times;</button>
      </div>
      <form id="form-resolve-ticket">
        <input type="hidden" id="resolve-ticket-id" name="ticket_id">
        <div class="modal-body">
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">
            Ticket Number: <strong id="resolve-ticket-label">TKT-10041</strong>
          </p>
          <div class="form-group">
            <label>Resolution & Repair Action Note</label>
            <textarea class="form-control" id="resolve-ticket-note" name="resolution_note" rows="3" required placeholder="Describe parts replaced, tests run, and calibration status..."></textarea>
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn-secondary" onclick="closeModal('modal-resolve-ticket')">Cancel</button>
          <button type="submit" class="btn-primary" style="background:var(--state-live);">Mark as Resolved</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal: Edit System Setting (Rule B.6) -->
  <div class="modal-overlay" id="modal-edit-setting">
    <div class="admin-modal-card">
      <div class="modal-head">
        <h3>Update Operational Threshold (Rule B.6)</h3>
        <button class="modal-close-x" onclick="closeModal('modal-edit-setting')">&times;</button>
      </div>
      <form id="form-edit-setting">
        <input type="hidden" id="edit-setting-key" name="key">
        <div class="modal-body">
          <p style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;" id="edit-setting-desc"></p>
          <div class="form-group">
            <label>Current Value</label>
            <input type="text" class="form-control" id="edit-setting-current" disabled style="background:#F1F5F9;">
          </div>
          <div class="form-group">
            <label>New Operational Value</label>
            <input type="text" class="form-control" id="edit-setting-val" name="value" required>
          </div>
          <div class="form-group">
            <label>Mandatory Audit Reason (Rule B.6)</label>
            <textarea class="form-control" id="edit-setting-reason" name="reason" rows="2" required placeholder="Explain justification for threshold modification..."></textarea>
          </div>
          <div style="font-size:12px; color:var(--text-muted); background:var(--canvas-light); padding:10px; border-radius:6px;">
            <strong>Super Admin Authority:</strong> Modifying operational thresholds takes effect immediately across all background worker evaluations and mobile clients.
          </div>
        </div>
        <div class="modal-foot">
          <button type="button" class="btn-secondary" onclick="closeModal('modal-edit-setting')">Cancel</button>
          <button type="submit" class="btn-primary">Apply Configuration</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Slide-Over Drawer: Telemetry Inspector -->
  <div id="telemetry-drawer" style="display:none; position:fixed; top:0; right:0; bottom:0; width:400px; background:var(--canvas-white); box-shadow:-4px 0 24px rgba(0,0,0,0.2); z-index:1100; flex-direction:column; border-left:1px solid var(--border-subtle);">
    <div style="background:var(--brand-navy); color:white; padding:16px 20px; display:flex; align-items:center; justify-content:space-between;">
      <div>
        <h3 id="drawer-bus-num" style="font-family:'Outfit'; font-size:18px; font-weight:700;">Bus 12</h3>
        <p id="drawer-reg-num" style="font-size:12px; color:#93C5FD;">TS 09 UB 4412</p>
      </div>
      <button onclick="closeDrawer()" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">&times;</button>
    </div>
    <div style="padding:20px; overflow-y:auto; flex:1;">
      <div style="margin-bottom:16px;">
        <span class="status-badge badge-live" id="drawer-status-badge">Live • Bus Tracker</span>
        <span style="font-size:12px; color:var(--text-muted); margin-left:8px;" id="drawer-freshness">Updated 6s ago</span>
      </div>
      <div style="background:var(--canvas-light); border:1px solid var(--border-subtle); border-radius:10px; padding:14px; margin-bottom:16px;">
        <div style="font-size:11px; text-transform:uppercase; font-weight:700; color:var(--text-muted); margin-bottom:8px;">Live GNSS & Physics</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12.5px;">
          <div>Coordinates:</div><div style="font-weight:600;" id="drawer-coords">17.3590, 78.3850</div>
          <div>Speed:</div><div style="font-weight:600;" id="drawer-speed">38.5 km/h</div>
          <div>Heading:</div><div style="font-weight:600;" id="drawer-heading">235&deg; (SW)</div>
          <div>GNSS Fix:</div><div style="font-weight:600; color:var(--state-live);">3D Fix (11 Sats)</div>
        </div>
      </div>
      <div style="background:var(--canvas-light); border:1px solid var(--border-subtle); border-radius:10px; padding:14px; margin-bottom:16px;">
        <div style="font-size:11px; text-transform:uppercase; font-weight:700; color:var(--text-muted); margin-bottom:8px;">Hardware Diagnostics</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12.5px;">
          <div>Associated Device:</div><div style="font-weight:600;" id="drawer-device">HW_1042</div>
          <div>Ignition Status:</div><div style="font-weight:600; color:#15803D;">IGN_ON</div>
          <div>Battery Voltage:</div><div style="font-weight:600;">12,580 mV (12.58 V)</div>
          <div>GSM Signal RSSI:</div><div style="font-weight:600;">-68 dBm (4G LTE)</div>
          <div>Payload Integrity:</div><div style="font-weight:600; color:var(--brand-navy);">CRC Valid</div>
        </div>
      </div>
      <div style="background:var(--canvas-light); border:1px solid var(--border-subtle); border-radius:10px; padding:14px;">
        <div style="font-size:11px; text-transform:uppercase; font-weight:700; color:var(--text-muted); margin-bottom:8px;">Operational Route Status</div>
        <div style="font-size:12.5px; line-height:1.6;">
          <div><strong>Route:</strong> <span id="drawer-route-name">Route 12: Mehdipatnam Express</span></div>
          <div><strong>Next Stop:</strong> <span id="drawer-next-stop">Kali Mandir Junction</span></div>
          <div><strong>Next Stop ETA:</strong> <span id="drawer-eta">5 mins (2,100 m)</span></div>
          <div><strong>Passenger Load:</strong> <span id="drawer-load">41 / 52 seats</span></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Console State
    let adminState = {
      buses: [],
      routes: [],
      devices: [],
      links: [],
      snapshots: [],
      attendance: [],
      tickets: [],
      settings: [],
      auditLogs: [],
      currentRole: 'COR',
      currentPage: 'fleet-deck',
      searchQuery: '',
      busesSearchQuery: '',
      routesSearchQuery: '',
      devicesSearchQuery: '',
      attFilter: { tripType: '', status: '', search: '' },
      maintFilter: { entityType: '', status: '', search: '' }
    };

    // Route Studio Working State Machine
    let adminRouteStudio = {
      route: null,
      stops: [],
      polyline: [],
      geometrySource: 'SAVED_GEOMETRY',
      distanceMeters: null,
      hasUnsavedChanges: false,
      mapInstance: null,
      polylineLayer: null,
      stopMarkers: [],
      pickCoordinatesMode: false,
      pickMarker: null
    };

    function showFeedback(msg, isError = false) {
      const banner = document.getElementById('feedback-alert');
      banner.textContent = msg;
      banner.className = 'feedback-banner ' + (isError ? 'feedback-error' : 'feedback-success');
      banner.style.display = 'block';
      setTimeout(() => { banner.style.display = 'none'; }, 4500);
    }

    function openModal(id) {
      document.getElementById(id).classList.add('open');
    }
    function closeModal(id) {
      if (id === 'modal-manage-stops' && adminRouteStudio.hasUnsavedChanges) {
        if (!confirm('You have unsaved route changes in Route Studio. Are you sure you want to discard your edits?')) {
          return;
        }
        adminRouteStudio.hasUnsavedChanges = false;
      }
      document.getElementById(id).classList.remove('open');
    }

    async function loadAdminData() {
      try {
        const [snapRes, busRes, routeRes, devRes, attRes, maintRes, setRes, audRes] = await Promise.all([
          fetch('/api/v1/snapshot').then(r => r.json()),
          fetch('/api/v1/buses').then(r => r.json()),
          fetch('/api/v1/routes').then(r => r.json()),
          fetch('/api/v1/devices').then(r => r.json()),
          fetch('/api/v1/attendance').then(r => r.json()),
          fetch('/api/v1/maintenance/tickets').then(r => r.json()),
          fetch('/api/v1/settings').then(r => r.json()),
          fetch('/api/v1/audit-logs').then(r => r.json())
        ]);

        adminState.snapshots = snapRes.buses || [];
        adminState.buses = busRes.buses || [];
        adminState.routes = routeRes.routes || [];
        adminState.devices = devRes.devices || [];
        adminState.links = devRes.links || [];
        adminState.attendance = attRes.records || [];
        adminState.tickets = maintRes.tickets || [];
        adminState.settings = setRes.settings || [];
        adminState.auditLogs = audRes.logs || [];

        renderConsole();
      } catch (e) {
        // silent recovery
      }
    }

    function renderConsole() {
      renderFleetDeck();
      renderBusesTable();
      renderRoutesTable();
      renderDevicesTable();
      renderAttendanceTable();
      renderMaintenanceTable();
      renderSettingsAndAudit();
      renderRolePermissions();
    }

    // Role-based Access Control Enforcement
    function renderRolePermissions() {
      const role = adminState.currentRole;
      const btnAddBus = document.getElementById('btn-open-add-bus');
      const btnAddRoute = document.getElementById('btn-open-add-route');
      const btnManualCheckin = document.getElementById('btn-open-manual-checkin');
      const btnAddTicket = document.getElementById('btn-open-add-ticket');

      // SEC & MGT are read-only
      if (role === 'SEC' || role === 'MGT') {
        if (btnAddBus) btnAddBus.style.display = 'none';
        if (btnAddRoute) btnAddRoute.style.display = 'none';
        if (btnManualCheckin) btnManualCheckin.style.display = 'none';
        if (btnAddTicket) btnAddTicket.style.display = 'none';
      } else if (role === 'TEC') {
        if (btnAddBus) btnAddBus.style.display = 'none';
        if (btnAddRoute) btnAddRoute.style.display = 'none';
        if (btnManualCheckin) btnManualCheckin.style.display = 'none';
        if (btnAddTicket) btnAddTicket.style.display = 'inline-flex';
      } else {
        if (btnAddBus) btnAddBus.style.display = 'inline-flex';
        if (btnAddRoute) btnAddRoute.style.display = 'inline-flex';
        if (btnManualCheckin) btnManualCheckin.style.display = 'inline-flex';
        if (btnAddTicket) btnAddTicket.style.display = 'inline-flex';
      }
    }

    // Render Fleet Operations Deck
    function renderFleetDeck() {
      const snaps = adminState.snapshots;
      document.getElementById('cnt-total-buses').textContent = snaps.length;
      document.getElementById('cnt-live-buses').textContent = snaps.filter(s => s.state === 'LIVE_HW' || s.state === 'LIVE_PHONE').length;
      const elLinked = document.getElementById('cnt-linked-devices');
      if (elLinked) elLinked.textContent = adminState.links.filter(l => !l.valid_to).length;
      document.getElementById('cnt-stale-buses').textContent = snaps.filter(s => s.state === 'STALE').length;
      document.getElementById('cnt-unavail-buses').textContent = snaps.filter(s => s.state === 'UNAVAILABLE').length;
      document.getElementById('cnt-idle-buses').textContent = snaps.filter(s => s.state === 'NOT_RUNNING').length;

      const tbody = document.getElementById('fleet-table-body');
      tbody.innerHTML = '';

      let filtered = snaps;
      if (adminState.searchQuery) {
        const q = adminState.searchQuery.toLowerCase();
        filtered = filtered.filter(s => s.bus_number.toLowerCase().includes(q) || s.route_name.toLowerCase().includes(q) || s.registration.toLowerCase().includes(q));
      }

      filtered.forEach(s => {
        let badgeClass = 'badge-live';
        if (s.is_simulated) badgeClass = 'badge-demo';
        if (s.state === 'STALE') badgeClass = 'badge-stale';
        if (s.state === 'UNAVAILABLE') badgeClass = 'badge-unavail';
        if (s.state === 'NOT_RUNNING') badgeClass = 'badge-idle';

        const row = document.createElement('tr');
        row.style.cursor = 'pointer';
        row.title = 'Click to inspect vehicle telemetry & hardware diagnostics';
        row.onclick = () => inspectBusTelemetry(s.bus_id);
        row.innerHTML = \`
          <td><strong style="color:var(--brand-navy);">\${s.bus_number}</strong></td>
          <td>\${s.route_name}</td>
          <td><code style="background:#F1F5F9; padding:2px 6px; border-radius:4px;">\${s.registration}</code></td>
          <td>\${s.is_simulated ? "Demo Simulator" : (s.state === 'LIVE_PHONE' ? "Driver's Phone" : "In-Bus HW")}</td>
          <td>\${s.speed_kmh ? Math.round(s.speed_kmh) + ' km/h' : '&mdash;'}</td>
          <td>\${s.age_seconds !== null ? s.age_seconds + 's' : '&mdash;'}</td>
          <td><span class="status-badge \${badgeClass}">\${s.state_label}</span></td>
          <td>\${s.next_stop ? s.next_stop.name + ' (' + s.next_stop.eta_formatted + ')' : 'Outside shift'}</td>
        \`;
        tbody.appendChild(row);
      });
    }

    // Render Buses Admin Table
    function renderBusesTable() {
      const tbody = document.getElementById('buses-admin-table-body');
      tbody.innerHTML = '';

      const canWrite = adminState.currentRole === 'COR' || adminState.currentRole === 'SAD';
      let filtered = adminState.buses;

      if (adminState.busesSearchQuery) {
        const q = adminState.busesSearchQuery.toLowerCase();
        filtered = filtered.filter(b => b.bus_number.toLowerCase().includes(q) || b.registration.toLowerCase().includes(q) || b.status.toLowerCase().includes(q));
      }

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:24px;">No buses found matching your search.</td></tr>';
        return;
      }

      filtered.forEach(b => {
        let badgeClass = 'badge-active';
        if (b.status === 'MAINTENANCE') badgeClass = 'badge-maint';
        if (b.status === 'RETIRED') badgeClass = 'badge-retired';

        const snap = adminState.snapshots.find(s => s.bus_id === b.id);
        const routeName = snap ? snap.route_name : 'Unassigned';
        const lastLocation = snap && snap.latitude ? (snap.latitude.toFixed(4) + ', ' + snap.longitude.toFixed(4) + (snap.next_stop ? ' • ' + snap.next_stop.name : '')) : 'No fix';

        const row = document.createElement('tr');
        row.innerHTML = \`
          <td><strong style="color:var(--brand-navy); font-size:14px;">\${b.bus_number}</strong></td>
          <td><code>\${b.registration}</code></td>
          <td><div style="font-weight:600; color:var(--brand-navy); font-size:13px;">\${routeName}</div></td>
          <td><span style="font-size:12px; color:var(--text-secondary);">\${lastLocation}</span></td>
          <td>\${b.seating_capacity} seats</td>
          <td><span class="status-badge \${badgeClass}">\${b.status}</span></td>
          <td style="font-size:11.5px; color:var(--text-secondary);">
            <div>Ins: \${b.insurance_expiry}</div>
            <div>Fit: \${b.fitness_expiry}</div>
          </td>
          <td>
            <button class="btn-table-action" style="margin-right:4px;" onclick="inspectBusTelemetry('\${b.id}')">View Telemetry</button>
            \${canWrite ? \`
              <button class="btn-table-action" style="margin-right:4px;" onclick="openEditBusModal('\${b.id}')">Edit</button>
              \${b.status !== 'RETIRED' ? \`<button class="btn-table-action btn-table-danger" onclick="deactivateBus('\${b.id}')">Deactivate</button>\` : ''}
            \` : ''}
          </td>
        \`;
        tbody.appendChild(row);
      });
    }

    // Render Routes Admin Table
    function renderRoutesTable() {
      const tbody = document.getElementById('routes-admin-table-body');
      tbody.innerHTML = '';

      const canWrite = adminState.currentRole === 'COR' || adminState.currentRole === 'SAD';
      let filtered = adminState.routes;

      if (adminState.routesSearchQuery) {
        const q = adminState.routesSearchQuery.toLowerCase();
        filtered = filtered.filter(r => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.origin.toLowerCase().includes(q) || r.destination.toLowerCase().includes(q));
      }

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:24px;">No route corridors match the search query.</td></tr>';
        return;
      }

      filtered.forEach(r => {
        const geomBadge = r.geometry_source === 'ROUTING_PROVIDER'
          ? '<span style="font-size:11px; font-weight:700; color:#065F46; background:#ECFDF5; padding:2px 6px; border-radius:4px;">⚡ Road</span>'
          : (r.geometry_source === 'SAVED_GEOMETRY'
            ? '<span style="font-size:11px; font-weight:700; color:#1E40AF; background:#EFF6FF; padding:2px 6px; border-radius:4px;">💾 Saved</span>'
            : '<span style="font-size:11px; font-weight:700; color:#92400E; background:#FFFBEB; padding:2px 6px; border-radius:4px;">⚠️ Direct</span>');
        const distLabel = r.distance_meters ? (r.distance_meters / 1000).toFixed(1) + ' km' : '&mdash;';

        const row = document.createElement('tr');
        row.innerHTML = \`
          <td><span style="font-weight:700; background:var(--brand-navy-light); color:var(--brand-navy); padding:2px 8px; border-radius:4px;">\${r.code}</span></td>
          <td><strong>\${r.name}</strong></td>
          <td>\${r.origin}</td>
          <td>\${r.destination}</td>
          <td>\${geomBadge} <span style="font-size:11px; color:var(--text-secondary); margin-left:4px;">\${distLabel}</span></td>
          <td>\${r.active_buses}</td>
          <td>\${r.stops ? r.stops.length : 0} stops</td>
          <td>
            <button class="btn-table-action" style="margin-right:6px;" onclick="openManageStopsModal('\${r.id}')">\${canWrite ? 'Route Studio &amp; Stops' : 'View Stops &amp; Map'}</button>
            \${canWrite ? \`<button class="btn-table-action btn-table-danger" onclick="deleteRoute('\${r.id}')">Delete</button>\` : ''}
          </td>
        \`;
        tbody.appendChild(row);
      });
    }

    // Render Devices Admin Table
    function renderDevicesTable() {
      const tbody = document.getElementById('devices-admin-table-body');
      tbody.innerHTML = '';

      const canLink = adminState.currentRole === 'COR' || adminState.currentRole === 'SAD';
      const isTec = adminState.currentRole === 'TEC';
      let filtered = adminState.devices;

      if (adminState.devicesSearchQuery) {
        const q = adminState.devicesSearchQuery.toLowerCase();
        filtered = filtered.filter(d => d.device_id.toLowerCase().includes(q) || d.imei.toLowerCase().includes(q) || (d.sim_number && d.sim_number.includes(q)));
      }

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:24px;">No GPS tracker hardware found.</td></tr>';
        return;
      }

      filtered.forEach(d => {
        const activeLink = adminState.links.find(l => l.device_id === d.device_id && !l.valid_to);
        const row = document.createElement('tr');

        let signalBadge = '<span class="status-badge badge-idle">○ STANDBY (NO FEED)</span>';
        if (d.connectivity_status === 'ONLINE') {
          signalBadge = '<span class="status-badge badge-live">● ONLINE (' + (d.reporting_age_seconds !== null ? d.reporting_age_seconds + 's' : '0s') + ')</span>';
        } else if (d.connectivity_status === 'STOPPED_REPORTING') {
          signalBadge = '<span class="status-badge badge-stale">● STOPPED REPORTING</span>';
        }

        const lastReportText = d.last_reported_at
          ? (d.reporting_age_seconds !== null ? d.reporting_age_seconds + 's ago' : d.last_reported_at.slice(11, 19) + ' UTC')
          : '<span style="color:var(--text-muted);">&mdash; Never</span>';

        row.innerHTML = \`
          <td><strong>\${d.device_id}</strong></td>
          <td><code>\${d.serial_number}</code><br><span style="font-size:11px; color:var(--text-muted);">IMEI: \${d.imei}</span></td>
          <td>\${signalBadge}</td>
          <td><span class="status-badge badge-active">\${d.status}</span></td>
          <td>v\${d.firmware_version}</td>
          <td>\${activeLink ? '<strong style="color:var(--brand-navy);">' + activeLink.bus_number + '</strong>' : '<span style="color:var(--text-muted);">Unassociated (In Pool)</span>'}</td>
          <td>\${lastReportText}</td>
          <td>
            \${canLink ? \`
              \${activeLink ? \`<button class="btn-table-action btn-table-danger" style="margin-right:6px;" onclick="unlinkDevice('\${d.device_id}')">Unlink</button>\` : ''}
              <button class="btn-table-action" onclick="openLinkModal('\${d.device_id}')">\${activeLink ? 'Reassign' : 'Associate Bus'}</button>
            \` : isTec ? \`<span style="font-size:11px; color:var(--text-muted); font-weight:600;">Rule E.6 Blocked</span>\` : '&mdash;'}
          </td>
        \`;
        tbody.appendChild(row);
      });
    }

    // Slide-over Telemetry Inspector Drawer
    window.inspectBusTelemetry = (busId) => {
      const snap = adminState.snapshots.find(s => s.bus_id === busId);
      if (!snap) return;

      document.getElementById('drawer-bus-num').textContent = snap.bus_number;
      document.getElementById('drawer-reg-num').textContent = snap.registration;

      let badgeClass = 'badge-live';
      if (snap.state === 'STALE') badgeClass = 'badge-stale';
      if (snap.state === 'UNAVAILABLE') badgeClass = 'badge-unavail';
      if (snap.state === 'NOT_RUNNING') badgeClass = 'badge-idle';

      const statusBadge = document.getElementById('drawer-status-badge');
      statusBadge.textContent = snap.state_label;
      statusBadge.className = 'status-badge ' + badgeClass;

      document.getElementById('drawer-freshness').textContent = snap.age_seconds !== null ? 'Updated ' + snap.age_seconds + 's ago' : 'No signal received';
      document.getElementById('drawer-coords').textContent = (snap.latitude ? snap.latitude.toFixed(4) : '&mdash;') + ', ' + (snap.longitude ? snap.longitude.toFixed(4) : '&mdash;');
      document.getElementById('drawer-speed').textContent = (snap.speed_kmh ? Math.round(snap.speed_kmh) : 0) + ' km/h';
      document.getElementById('drawer-heading').textContent = (snap.heading || 0) + '°';
      
      const link = adminState.links.find(l => l.bus_id === busId && !l.valid_to);
      document.getElementById('drawer-device').textContent = link ? link.device_id : (snap.state === 'LIVE_PHONE' ? "Driver's Phone (BYOD)" : "None");
      document.getElementById('drawer-route-name').textContent = snap.route_name;
      document.getElementById('drawer-next-stop').textContent = snap.next_stop ? snap.next_stop.name : 'Outside shift';
      document.getElementById('drawer-eta').textContent = snap.next_stop ? snap.next_stop.eta_formatted + ' (' + (snap.next_stop.distance_m || 0) + ' m)' : '&mdash;';
      document.getElementById('drawer-load').textContent = (snap.occupancy || 0) + ' / ' + (snap.capacity || 50) + ' seats (' + Math.round(((snap.occupancy || 0) / (snap.capacity || 50)) * 100) + '%)';

      document.getElementById('telemetry-drawer').style.display = 'flex';
    };

    window.closeDrawer = () => {
      document.getElementById('telemetry-drawer').style.display = 'none';
    };

    window.openEditBusModal = (busId) => {
      const bus = adminState.buses.find(b => b.id === busId);
      if (!bus) return;

      document.getElementById('edit-bus-id').value = bus.id;
      document.getElementById('edit-bus-number').value = bus.bus_number;
      document.getElementById('edit-bus-registration').value = bus.registration;
      document.getElementById('edit-bus-capacity').value = bus.seating_capacity;
      document.getElementById('edit-bus-status').value = bus.status;
      document.getElementById('edit-bus-insurance').value = bus.insurance_expiry;
      document.getElementById('edit-bus-fitness').value = bus.fitness_expiry;
      document.getElementById('edit-bus-pollution').value = bus.pollution_expiry;
      document.getElementById('edit-bus-permit').value = bus.permit_expiry;

      openModal('modal-edit-bus');
    };

    window.unlinkDevice = async (deviceId) => {
      if (!confirm('Are you sure you want to unbind device ' + deviceId + ' from its bus?')) return;
      try {
        const res = await fetch('/api/v1/devices/' + deviceId + '/unlink', { method: 'POST' }).then(r => r.json());
        if (res.success) {
          showFeedback('Device ' + deviceId + ' unlinked successfully.');
          await loadAdminData();
        } else {
          showFeedback(res.error?.message || 'Unlink failed', true);
        }
      } catch (e) {
        showFeedback('Request failed', true);
      }
    };

    // Route Studio Implementation
    function updateStudioMetrics() {
      const stops = adminRouteStudio.stops || [];
      const countEl = document.getElementById('studio-stops-count-val');
      const distEl = document.getElementById('studio-distance-val');
      const badgeEl = document.getElementById('studio-geom-badge');
      const unsavedBadge = document.getElementById('studio-unsaved-badge');

      if (countEl) countEl.textContent = stops.length;
      if (distEl) {
        distEl.textContent = adminRouteStudio.distanceMeters
          ? (adminRouteStudio.distanceMeters / 1000).toFixed(1) + ' km'
          : (stops.length >= 2 ? 'Estimated' : '0 km');
      }
      if (badgeEl) {
        if (adminRouteStudio.geometrySource === 'ROUTING_PROVIDER') {
          badgeEl.textContent = '⚡ Road-Following (OSRM)';
          badgeEl.style.background = '#ECFDF5';
          badgeEl.style.color = '#065F46';
        } else if (adminRouteStudio.geometrySource === 'SAVED_GEOMETRY') {
          badgeEl.textContent = '💾 Verified Saved';
          badgeEl.style.background = '#EFF6FF';
          badgeEl.style.color = '#1E40AF';
        } else {
          badgeEl.textContent = '⚠️ Straight-Line Fallback';
          badgeEl.style.background = '#FFFBEB';
          badgeEl.style.color = '#92400E';
        }
      }
      if (unsavedBadge) {
        unsavedBadge.style.display = adminRouteStudio.hasUnsavedChanges ? 'inline-block' : 'none';
      }
    }

    function renderStudioStopsList() {
      const container = document.getElementById('studio-stops-list');
      if (!container) return;
      container.innerHTML = '';

      const canWrite = adminState.currentRole === 'COR' || adminState.currentRole === 'SAD';
      const addPanel = document.getElementById('studio-add-stop-panel');
      if (addPanel) addPanel.style.display = canWrite ? 'block' : 'none';

      const saveBtn = document.getElementById('btn-studio-save');
      if (saveBtn) saveBtn.style.display = canWrite ? 'inline-flex' : 'none';

      const recalcBtn = document.getElementById('btn-studio-recalculate');
      if (recalcBtn) recalcBtn.style.display = canWrite ? 'inline-flex' : 'none';

      const stops = adminRouteStudio.stops;
      if (!stops || stops.length === 0) {
        container.innerHTML = '<div style="padding:16px; text-align:center; color:var(--text-muted); font-size:12px;">No stops defined yet. Use the form below or pick coordinates on the map.</div>';
        return;
      }

      stops.forEach((s, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === stops.length - 1;

        const row = document.createElement('div');
        row.className = 'studio-stop-row';
        row.innerHTML = \`
          <div style="display:flex; align-items:center; gap:8px;">
            <div class="studio-stop-seq" style="background:\${isLast ? 'var(--brand-red)' : 'var(--brand-navy)'};">\${idx + 1}</div>
            <div>
              <div style="font-weight:700; color:var(--brand-navy);">\${s.name} \${isLast ? '★' : ''}</div>
              <div style="font-size:11px; color:var(--text-secondary); margin-top:1px;">
                <span>Time: <strong>\${s.scheduled_time || 'N/A'}</strong></span> • 
                <code>\${s.latitude.toFixed(4)}, \${s.longitude.toFixed(4)}</code>
              </div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:4px;">
            \${canWrite ? \`
              <button type="button" class="studio-btn-icon" title="Move Up" \${isFirst ? 'disabled' : ''} onclick="moveStudioStop(\${idx}, -1)">▲</button>
              <button type="button" class="studio-btn-icon" title="Move Down" \${isLast ? 'disabled' : ''} onclick="moveStudioStop(\${idx}, 1)">▼</button>
              <button type="button" class="studio-btn-icon" title="Remove Stop" style="color:var(--brand-red);" onclick="removeStudioStop(\${idx})">🗑️</button>
            \` : '&mdash;'}
          </div>
        \`;
        container.appendChild(row);
      });
    }

    window.moveStudioStop = (idx, delta) => {
      const targetIdx = idx + delta;
      if (targetIdx < 0 || targetIdx >= adminRouteStudio.stops.length) return;
      const temp = adminRouteStudio.stops[idx];
      adminRouteStudio.stops[idx] = adminRouteStudio.stops[targetIdx];
      adminRouteStudio.stops[targetIdx] = temp;
      adminRouteStudio.stops.forEach((s, i) => s.sequence = i + 1);
      adminRouteStudio.hasUnsavedChanges = true;
      adminRouteStudio.polyline = [];
      adminRouteStudio.geometrySource = 'STRAIGHT_LINE_FALLBACK';
      updateStudioMetrics();
      renderStudioStopsList();
      renderStudioMap();
    };

    window.removeStudioStop = (idx) => {
      if (idx < 0 || idx >= adminRouteStudio.stops.length) return;
      adminRouteStudio.stops.splice(idx, 1);
      adminRouteStudio.stops.forEach((s, i) => s.sequence = i + 1);
      adminRouteStudio.hasUnsavedChanges = true;
      adminRouteStudio.polyline = [];
      adminRouteStudio.geometrySource = 'STRAIGHT_LINE_FALLBACK';
      updateStudioMetrics();
      renderStudioStopsList();
      renderStudioMap();
    };

    function renderStudioMap() {
      const mapContainer = document.getElementById('admin-route-map');
      if (!mapContainer || typeof L === 'undefined') return;

      if (!adminRouteStudio.mapInstance) {
        adminRouteStudio.mapInstance = L.map('admin-route-map', {
          zoomControl: false,
          attributionControl: false
        }).setView([17.3616, 78.3245], 13);

        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18
        }).addTo(adminRouteStudio.mapInstance);

        tileLayer.on('tileerror', () => {
          const w = document.getElementById('studio-tiles-warning');
          if (w) w.style.display = 'block';
        });
        tileLayer.on('load', () => {
          const w = document.getElementById('studio-tiles-warning');
          if (w) w.style.display = 'none';
        });

        adminRouteStudio.mapInstance.on('click', (e) => {
          if (!adminRouteStudio.pickCoordinatesMode) return;
          const lat = parseFloat(e.latlng.lat.toFixed(4));
          const lng = parseFloat(e.latlng.lng.toFixed(4));

          const latInput = document.getElementById('studio-new-stop-lat');
          const lngInput = document.getElementById('studio-new-stop-lng');
          if (latInput) latInput.value = lat;
          if (lngInput) lngInput.value = lng;

          if (adminRouteStudio.pickMarker) {
            adminRouteStudio.pickMarker.setLatLng([lat, lng]);
          } else {
            const pickIcon = L.divIcon({
              className: 'custom-pick-marker',
              html: '<div style="background:#2563EB; width:14px; height:14px; border-radius:50%; border:3px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>',
              iconSize: [14, 14],
              iconAnchor: [7, 7]
            });
            adminRouteStudio.pickMarker = L.marker([lat, lng], { icon: pickIcon }).addTo(adminRouteStudio.mapInstance);
          }

          adminRouteStudio.pickCoordinatesMode = false;
          mapContainer.style.cursor = '';
          const pickLabel = document.getElementById('lbl-pick-mode');
          if (pickLabel) pickLabel.textContent = 'Pick on Map';
        });

        const fitBtn = document.getElementById('btn-studio-fit-bounds');
        if (fitBtn) {
          fitBtn.onclick = () => {
            if (adminRouteStudio.polylineLayer) {
              adminRouteStudio.mapInstance.fitBounds(adminRouteStudio.polylineLayer.getBounds(), { padding: [30, 30] });
            } else if (adminRouteStudio.stops.length > 0) {
              const latLngs = adminRouteStudio.stops.map(s => [s.latitude, s.longitude]);
              adminRouteStudio.mapInstance.fitBounds(latLngs, { padding: [30, 30] });
            }
          };
        }
      }

      if (adminRouteStudio.polylineLayer) {
        adminRouteStudio.mapInstance.removeLayer(adminRouteStudio.polylineLayer);
        adminRouteStudio.polylineLayer = null;
      }
      adminRouteStudio.stopMarkers.forEach(m => adminRouteStudio.mapInstance.removeLayer(m));
      adminRouteStudio.stopMarkers = [];

      const stops = adminRouteStudio.stops || [];
      const hasRoadPoly = adminRouteStudio.polyline && adminRouteStudio.polyline.length >= 2;
      const polyCoords = hasRoadPoly ? adminRouteStudio.polyline : stops.map(s => [s.latitude, s.longitude]);
      const isFallback = !hasRoadPoly || adminRouteStudio.geometrySource === 'STRAIGHT_LINE_FALLBACK';

      if (polyCoords.length >= 2) {
        adminRouteStudio.polylineLayer = L.polyline(polyCoords, {
          color: isFallback ? '#D97706' : '#103754',
          weight: isFallback ? 3 : 5,
          opacity: 0.85,
          dashArray: isFallback ? '6, 6' : undefined
        }).addTo(adminRouteStudio.mapInstance);

        adminRouteStudio.mapInstance.fitBounds(adminRouteStudio.polylineLayer.getBounds(), { padding: [30, 30] });
      } else if (stops.length === 1) {
        adminRouteStudio.mapInstance.setView([stops[0].latitude, stops[0].longitude], 14);
      } else {
        adminRouteStudio.mapInstance.setView([17.3616, 78.3245], 13);
      }

      stops.forEach((s, idx) => {
        const isLast = idx === stops.length - 1;
        const icon = L.divIcon({
          className: 'studio-stop-marker',
          html: '<div style="background:' + (isLast ? '#E51F35' : '#103754') + '; color:white; width:24px; height:24px; border-radius:50%; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px;">' + (idx + 1) + '</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        const marker = L.marker([s.latitude, s.longitude], { icon }).addTo(adminRouteStudio.mapInstance);
        marker.bindPopup('<strong>Stop #' + (idx + 1) + ': ' + s.name + '</strong><br>Pickup: ' + (s.scheduled_time || 'N/A') + '<br><code>' + s.latitude.toFixed(4) + ', ' + s.longitude.toFixed(4) + '</code>');
        adminRouteStudio.stopMarkers.push(marker);
      });

      setTimeout(() => {
        if (adminRouteStudio.mapInstance) adminRouteStudio.mapInstance.invalidateSize();
      }, 100);
    }

    window.openManageStopsModal = (routeId) => {
      const route = adminState.routes.find(r => r.id === routeId);
      if (!route) return;

      adminRouteStudio.route = route;
      adminRouteStudio.stops = (route.stops || []).map(s => ({ ...s }));
      adminRouteStudio.polyline = route.polyline ? [...route.polyline] : [];
      adminRouteStudio.geometrySource = route.geometry_source || (route.polyline && route.polyline.length >= 2 ? 'SAVED_GEOMETRY' : 'STRAIGHT_LINE_FALLBACK');
      adminRouteStudio.distanceMeters = route.distance_meters || null;
      adminRouteStudio.hasUnsavedChanges = false;
      adminRouteStudio.pickCoordinatesMode = false;

      const titleEl = document.getElementById('manage-stops-route-title');
      if (titleEl) {
        titleEl.innerHTML = '<span>Route Studio • ' + route.code + '</span><span id="studio-unsaved-badge" style="display:none; font-size:11px; background:#FEF3C7; color:#92400E; padding:2px 8px; border-radius:4px; font-weight:700;">⚠️ Unsaved Changes</span>';
      }
      const subEl = document.getElementById('manage-stops-route-subtitle');
      if (subEl) {
        subEl.textContent = route.name + ' (' + route.origin + ' → ' + route.destination + ')';
      }
      const errBanner = document.getElementById('studio-error-banner');
      if (errBanner) errBanner.style.display = 'none';

      const routeIdInput = document.getElementById('add-stop-route-id');
      if (routeIdInput) routeIdInput.value = route.id;

      updateStudioMetrics();
      renderStudioStopsList();
      openModal('modal-manage-stops');

      setTimeout(() => {
        renderStudioMap();
      }, 150);
    };

    // Actions
    window.deactivateBus = async (id) => {
      if (!confirm('Are you sure you want to retire this institutional bus from service?')) return;
      try {
        const res = await fetch('/api/v1/buses/' + id, { method: 'DELETE' }).then(r => r.json());
        if (res.success) {
          showFeedback('Bus retired successfully.');
          await loadAdminData();
        } else {
          showFeedback(res.error?.message || 'Deactivation failed', true);
        }
      } catch (e) {
        showFeedback('Request failed', true);
      }
    };

    window.deleteRoute = async (id) => {
      if (!confirm('Are you sure you want to delete this transit corridor?')) return;
      try {
        const res = await fetch('/api/v1/routes/' + id, { method: 'DELETE' }).then(r => r.json());
        if (res.success) {
          showFeedback('Route corridor removed.');
          await loadAdminData();
        }
      } catch (e) {
        showFeedback('Request failed', true);
      }
    };

    window.openLinkModal = (deviceId) => {
      document.getElementById('link-target-device-id').value = deviceId;
      document.getElementById('link-device-label').textContent = deviceId;

      const select = document.getElementById('link-bus-select');
      select.innerHTML = '';
      adminState.buses.filter(b => b.status === 'ACTIVE').forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.bus_number + ' (' + b.registration + ')';
        select.appendChild(opt);
      });

      openModal('modal-link-device');
    };

    // Form handlers
    document.getElementById('form-add-bus').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        bus_number: fd.get('bus_number'),
        registration: fd.get('registration'),
        seating_capacity: parseInt(fd.get('seating_capacity')),
        status: fd.get('status'),
        insurance_expiry: fd.get('insurance_expiry'),
        fitness_expiry: fd.get('fitness_expiry'),
        pollution_expiry: fd.get('pollution_expiry'),
        permit_expiry: fd.get('permit_expiry')
      };

      try {
        const res = await fetch('/api/v1/buses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(r => r.json());

        if (res.success) {
          closeModal('modal-add-bus');
          e.target.reset();
          showFeedback('Bus ' + payload.bus_number + ' registered successfully.');
          await loadAdminData();
        } else {
          showFeedback(res.error?.message || 'Failed to save bus', true);
        }
      } catch (err) {
        showFeedback('Network error saving bus', true);
      }
    };

    document.getElementById('form-add-route').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        code: fd.get('code'),
        name: fd.get('name'),
        origin: fd.get('origin'),
        destination: fd.get('destination')
      };

      try {
        const res = await fetch('/api/v1/routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(r => r.json());

        if (res.success) {
          closeModal('modal-add-route');
          e.target.reset();
          showFeedback('Route ' + payload.code + ' created successfully.');
          await loadAdminData();
        }
      } catch (err) {
        showFeedback('Network error saving route', true);
      }
    };

    document.getElementById('form-link-device').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const deviceId = fd.get('device_id');
      const busId = fd.get('bus_id');

      try {
        const res = await fetch('/api/v1/devices/' + deviceId + '/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bus_id: busId })
        }).then(r => r.json());

        if (res.success) {
          closeModal('modal-link-device');
          showFeedback('Device ' + deviceId + ' linked successfully.');
          await loadAdminData();
        } else {
          showFeedback(res.error?.message || 'Linking rejected by RBAC security guard.', true);
        }
      } catch (err) {
        showFeedback('Network error during association', true);
      }
    };

    document.getElementById('form-edit-bus').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const busId = fd.get('id');
      const payload = {
        bus_number: fd.get('bus_number'),
        registration: fd.get('registration'),
        seating_capacity: parseInt(fd.get('seating_capacity')),
        status: fd.get('status'),
        insurance_expiry: fd.get('insurance_expiry'),
        fitness_expiry: fd.get('fitness_expiry'),
        pollution_expiry: fd.get('pollution_expiry'),
        permit_expiry: fd.get('permit_expiry')
      };

      try {
        const res = await fetch('/api/v1/buses/' + busId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(r => r.json());

        if (res.success) {
          closeModal('modal-edit-bus');
          showFeedback('Bus ' + payload.bus_number + ' updated successfully.');
          await loadAdminData();
        } else {
          showFeedback(res.error?.message || 'Failed to update bus', true);
        }
      } catch (err) {
        showFeedback('Network error updating bus', true);
      }
    };

    // Route Studio: Toggle Pick on Map Mode
    const btnTogglePick = document.getElementById('btn-toggle-pick-mode');
    if (btnTogglePick) {
      btnTogglePick.onclick = () => {
        adminRouteStudio.pickCoordinatesMode = !adminRouteStudio.pickCoordinatesMode;
        const lbl = document.getElementById('lbl-pick-mode');
        const mapEl = document.getElementById('admin-route-map');
        if (adminRouteStudio.pickCoordinatesMode) {
          if (lbl) lbl.textContent = 'Click Map Now...';
          if (mapEl) mapEl.style.cursor = 'crosshair';
        } else {
          if (lbl) lbl.textContent = 'Pick on Map';
          if (mapEl) mapEl.style.cursor = '';
        }
      };
    }

    // Route Studio: Recalculate Road Geometry (OSRM)
    const btnRecalc = document.getElementById('btn-studio-recalculate');
    if (btnRecalc) {
      btnRecalc.onclick = async () => {
        const errBanner = document.getElementById('studio-error-banner');
        if (errBanner) errBanner.style.display = 'none';

        if (adminRouteStudio.stops.length < 2) {
          if (errBanner) {
            errBanner.textContent = 'At least 2 ordered stops are required to calculate road route geometry.';
            errBanner.style.display = 'block';
          }
          return;
        }

        const originalText = btnRecalc.innerHTML;
        btnRecalc.disabled = true;
        btnRecalc.innerHTML = '<span>⏳</span> <span>Calculating Road Route...</span>';

        try {
          const res = await fetch('/api/v1/routes/preview-geometry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stops: adminRouteStudio.stops })
          }).then(r => r.json());

          if (res.success && res.geometry) {
            adminRouteStudio.polyline = res.geometry.polyline;
            adminRouteStudio.geometrySource = res.geometry.source;
            adminRouteStudio.distanceMeters = res.geometry.distanceMeters;
            adminRouteStudio.hasUnsavedChanges = true;
            updateStudioMetrics();
            renderStudioMap();
            showFeedback('Route road geometry calculated: ' + res.geometry.source + ' (' + (res.geometry.distanceMeters / 1000).toFixed(1) + ' km)');
          } else {
            if (errBanner) {
              errBanner.textContent = res.message || 'Routing provider unavailable. Retaining existing geometry or straight-line fallback.';
              errBanner.style.display = 'block';
            }
          }
        } catch (e) {
          if (errBanner) {
            errBanner.textContent = 'Network interruption contacting routing service: ' + e.message;
            errBanner.style.display = 'block';
          }
        } finally {
          btnRecalc.disabled = false;
          btnRecalc.innerHTML = originalText;
        }
      };
    }

    // Route Studio: Save Route Changes
    const btnSaveRoute = document.getElementById('btn-studio-save');
    if (btnSaveRoute) {
      btnSaveRoute.onclick = async () => {
        const errBanner = document.getElementById('studio-error-banner');
        if (errBanner) errBanner.style.display = 'none';

        if (adminRouteStudio.stops.length < 2) {
          if (errBanner) {
            errBanner.textContent = 'Cannot save route: minimum 2 stops required.';
            errBanner.style.display = 'block';
          }
          return;
        }

        // Validate coordinates
        for (let i = 0; i < adminRouteStudio.stops.length; i++) {
          const s = adminRouteStudio.stops[i];
          if (isNaN(s.latitude) || s.latitude < 8.0 || s.latitude > 37.0) {
            if (errBanner) {
              errBanner.textContent = 'Validation error on Stop #' + (i + 1) + ' (' + s.name + '): Latitude must be between 8.0° and 37.0° N.';
              errBanner.style.display = 'block';
            }
            return;
          }
          if (isNaN(s.longitude) || s.longitude < 68.0 || s.longitude > 97.0) {
            if (errBanner) {
              errBanner.textContent = 'Validation error on Stop #' + (i + 1) + ' (' + s.name + '): Longitude must be between 68.0° and 97.0° E.';
              errBanner.style.display = 'block';
            }
            return;
          }
        }

        const originalText = btnSaveRoute.innerHTML;
        btnSaveRoute.disabled = true;
        btnSaveRoute.innerHTML = '💾 Saving Route to Store...';

        const payload = {
          stops: adminRouteStudio.stops.map(s => ({
            name: s.name,
            sequence: s.sequence,
            latitude: s.latitude,
            longitude: s.longitude,
            scheduled_time: s.scheduled_time
          })),
          polyline: adminRouteStudio.polyline,
          geometry_source: adminRouteStudio.geometrySource,
          distance_meters: adminRouteStudio.distanceMeters
        };

        try {
          const res = await fetch('/api/v1/routes/' + adminRouteStudio.route.id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).then(r => r.json());

          if (res.success) {
            adminRouteStudio.hasUnsavedChanges = false;
            closeModal('modal-manage-stops');
            showFeedback('Route ' + adminRouteStudio.route.code + ' saved and persisted successfully.');
            await loadAdminData();
          } else {
            if (errBanner) {
              errBanner.textContent = res.error?.message || 'Failed to save route changes.';
              errBanner.style.display = 'block';
            }
          }
        } catch (err) {
          if (errBanner) {
            errBanner.textContent = 'Network error saving route: ' + err.message;
            errBanner.style.display = 'block';
          }
        } finally {
          btnSaveRoute.disabled = false;
          btnSaveRoute.innerHTML = originalText;
        }
      };
    }

    // Route Studio: Add New Stop Form Handler
    document.getElementById('form-add-stop').onsubmit = (e) => {
      e.preventDefault();
      const errBanner = document.getElementById('studio-error-banner');
      if (errBanner) errBanner.style.display = 'none';

      const fd = new FormData(e.target);
      const name = String(fd.get('name') || '').trim();
      const scheduledTime = String(fd.get('scheduled_time') || '').trim();
      const lat = parseFloat(fd.get('latitude'));
      const lng = parseFloat(fd.get('longitude'));

      if (!name) {
        if (errBanner) {
          errBanner.textContent = 'Stop name cannot be empty.';
          errBanner.style.display = 'block';
        }
        return;
      }
      if (isNaN(lat) || lat < 8.0 || lat > 37.0) {
        if (errBanner) {
          errBanner.textContent = 'Latitude must be between 8.0° and 37.0° N (India bounds).';
          errBanner.style.display = 'block';
        }
        return;
      }
      if (isNaN(lng) || lng < 68.0 || lng > 97.0) {
        if (errBanner) {
          errBanner.textContent = 'Longitude must be between 68.0° and 97.0° E (India bounds).';
          errBanner.style.display = 'block';
        }
        return;
      }

      // Warn on duplicate stop name
      if (adminRouteStudio.stops.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        if (!confirm('A stop with the name "' + name + '" already exists on this corridor. Do you still wish to add it?')) {
          return;
        }
      }

      adminRouteStudio.stops.push({
        id: 'stop-' + Date.now(),
        name: name,
        sequence: adminRouteStudio.stops.length + 1,
        latitude: lat,
        longitude: lng,
        scheduled_time: scheduledTime
      });

      adminRouteStudio.hasUnsavedChanges = true;
      adminRouteStudio.polyline = [];
      adminRouteStudio.geometrySource = 'STRAIGHT_LINE_FALLBACK';

      updateStudioMetrics();
      renderStudioStopsList();
      renderStudioMap();

      const nameInput = document.getElementById('studio-new-stop-name');
      if (nameInput) {
        nameInput.value = '';
        nameInput.focus();
      }
    };

    // Render Attendance Table (ADM-08)
    function renderAttendanceTable() {
      const records = adminState.attendance;
      const boardedCount = records.filter(r => r.status === 'BOARDED').length;
      const lateCount = records.filter(r => r.status === 'LATE_BOARDED').length;
      const expectedCount = records.filter(r => r.status === 'EXPECTED').length;
      const absentCount = records.filter(r => r.status === 'ABSENT' || r.status === 'ON_LEAVE').length;

      document.getElementById('cnt-att-boarded').textContent = boardedCount;
      document.getElementById('cnt-att-late').textContent = lateCount;
      document.getElementById('cnt-att-expected').textContent = expectedCount;
      document.getElementById('cnt-att-absent').textContent = absentCount;

      const tbody = document.getElementById('attendance-table-body');
      tbody.innerHTML = '';

      let filtered = records;
      if (adminState.attFilter.tripType) {
        filtered = filtered.filter(r => r.trip_type === adminState.attFilter.tripType);
      }
      if (adminState.attFilter.status) {
        filtered = filtered.filter(r => r.status === adminState.attFilter.status);
      }
      if (adminState.attFilter.search) {
        const q = adminState.attFilter.search.toLowerCase();
        filtered = filtered.filter(r => r.student_id.toLowerCase().includes(q) || (r.stop_name && r.stop_name.toLowerCase().includes(q)));
      }

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:24px;">No attendance records match the current filter.</td></tr>';
        return;
      }

      filtered.forEach(r => {
        let badgeClass = 'badge-active';
        if (r.status === 'LATE_BOARDED') badgeClass = 'badge-maint';
        if (r.status === 'EXPECTED') badgeClass = 'badge-idle';
        if (r.status === 'ABSENT') badgeClass = 'badge-unavail';
        if (r.status === 'ON_LEAVE') badgeClass = 'badge-retired';

        const row = document.createElement('tr');
        row.innerHTML = \`
          <td><strong>\${r.student_id}</strong></td>
          <td>\${r.service_date} (\${r.trip_type})</td>
          <td>\${r.stop_name || '&mdash;'}</td>
          <td>\${r.boarded_at ? new Date(r.boarded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '&mdash;'}</td>
          <td><span style="font-weight:600; font-size:12px; background:#F1F5F9; padding:2px 8px; border-radius:4px;">\${r.method || 'PENDING'}</span></td>
          <td><span class="status-badge \${badgeClass}">\${r.status}</span></td>
        \`;
        tbody.appendChild(row);
      });
    }

    // Render Maintenance Table (ADM-05)
    function renderMaintenanceTable() {
      const tickets = adminState.tickets;
      document.getElementById('cnt-maint-total').textContent = tickets.length;
      document.getElementById('cnt-maint-open').textContent = tickets.filter(t => t.status === 'OPEN').length;
      document.getElementById('cnt-maint-inprogress').textContent = tickets.filter(t => t.status === 'IN_PROGRESS').length;
      document.getElementById('cnt-maint-resolved').textContent = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

      const tbody = document.getElementById('maintenance-table-body');
      tbody.innerHTML = '';

      let filtered = tickets;
      if (adminState.maintFilter.entityType) {
        filtered = filtered.filter(t => t.entity_type === adminState.maintFilter.entityType);
      }
      if (adminState.maintFilter.search) {
        const q = adminState.maintFilter.search.toLowerCase();
        filtered = filtered.filter(t => t.ticket_number.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || t.entity_identifier.toLowerCase().includes(q));
      }

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:24px;">No maintenance work orders match the selected filter.</td></tr>';
        return;
      }

      const role = adminState.currentRole;

      filtered.forEach(t => {
        let sevClass = 'badge-idle';
        if (t.severity === 'HIGH') sevClass = 'badge-maint';
        if (t.severity === 'CRITICAL') sevClass = 'badge-unavail';
        if (t.severity === 'MEDIUM') sevClass = 'badge-stale';

        let statusClass = 'badge-unavail';
        if (t.status === 'IN_PROGRESS') statusClass = 'badge-maint';
        if (t.status === 'RESOLVED' || t.status === 'CLOSED') statusClass = 'badge-live';

        // Role separation check: TEC can resolve DEVICE; COR can resolve BUS; SAD can resolve all
        const canResolve = (role === 'SAD') ||
                           (role === 'TEC' && t.entity_type === 'DEVICE') ||
                           (role === 'COR' && t.entity_type === 'BUS');

        const row = document.createElement('tr');
        row.innerHTML = \`
          <td><strong>\${t.ticket_number}</strong></td>
          <td><code style="background:#F1F5F9; padding:2px 6px; border-radius:4px;">\${t.entity_identifier}</code></td>
          <td>
            <div style="font-weight:600; color:var(--brand-navy);">\${t.title}</div>
            \${t.resolution_note ? \`<div style="font-size:11.5px; color:var(--state-live); margin-top:2px;">Resolution: \${t.resolution_note}</div>\` : ''}
          </td>
          <td><span class="status-badge \${sevClass}">\${t.severity}</span></td>
          <td><span class="status-badge \${statusClass}">\${t.status}</span></td>
          <td>\${t.assigned_to}</td>
          <td>
            \${t.status !== 'RESOLVED' && t.status !== 'CLOSED' ? \`
              <button class="btn-table-action" \${canResolve ? '' : 'disabled title="Role unauthorized (Rule E.6/Spec 16.4)" style="opacity:0.5; cursor:not-allowed;"'} onclick="openResolveTicketModal('\${t.id}', '\${t.ticket_number}')">
                \${canResolve ? 'Resolve' : 'Blocked'}
              </button>
            \` : '<span style="color:var(--state-live); font-weight:600; font-size:12px;">Resolved</span>'}
          </td>
        \`;
        tbody.appendChild(row);
      });
    }

    // Render Settings & Audit Log (ADM-09 / ADM-14)
    function renderSettingsAndAudit() {
      // 1. Settings Table
      const settingsTbody = document.getElementById('settings-table-body');
      settingsTbody.innerHTML = '';
      const canEditSettings = adminState.currentRole === 'SAD';

      adminState.settings.forEach(s => {
        const row = document.createElement('tr');
        row.innerHTML = \`
          <td><code style="font-weight:700; color:var(--brand-navy);">\${s.key}</code></td>
          <td style="max-width:320px; font-size:12.5px;">\${s.description}</td>
          <td><strong style="color:var(--brand-navy); font-size:14px;">\${s.current_value}</strong></td>
          <td><span style="color:var(--text-muted); font-size:12.5px;">\${s.default_value}</span></td>
          <td><span style="font-size:11px; text-transform:uppercase; font-weight:600; background:#F1F5F9; padding:2px 8px; border-radius:4px;">\${s.section}</span></td>
          <td>
            <button class="btn-table-action" \${canEditSettings ? '' : 'disabled title="Only Super Administrators (SAD) can modify operational settings per Rule B.6" style="opacity:0.5; cursor:not-allowed;"'} onclick="openEditSettingModal('\${s.key}')">
              \${canEditSettings ? 'Edit Parameter' : 'SAD Only'}
            </button>
          </td>
        \`;
        settingsTbody.appendChild(row);
      });

      // 2. Audit Log Table
      const auditTbody = document.getElementById('audit-table-body');
      auditTbody.innerHTML = '';

      adminState.auditLogs.forEach(l => {
        const row = document.createElement('tr');
        row.innerHTML = \`
          <td style="font-size:12px; font-family:monospace;">\${new Date(l.recorded_at).toISOString().replace('T', ' ').slice(0, 19)}</td>
          <td>\${l.actor_email}</td>
          <td><span style="font-size:11px; font-weight:700; background:var(--brand-navy-light); color:var(--brand-navy); padding:2px 6px; border-radius:3px;">\${l.actor_role}</span></td>
          <td><strong>\${l.action}</strong></td>
          <td><code>\${l.entity_type}:\${l.entity_id}</code></td>
          <td style="font-size:12.5px; color:var(--text-secondary);">\${l.reason || '&mdash;'}</td>
        \`;
        auditTbody.appendChild(row);
      });
    }

    // Modal Helpers
    window.filterMaintEntity = (type) => {
      adminState.maintFilter.entityType = type;
      document.getElementById('btn-maint-filter-all').className = 'btn-table-action ' + (type === '' ? 'active' : '');
      document.getElementById('btn-maint-filter-bus').className = 'btn-table-action ' + (type === 'BUS' ? 'active' : '');
      document.getElementById('btn-maint-filter-dev').className = 'btn-table-action ' + (type === 'DEVICE' ? 'active' : '');
      renderMaintenanceTable();
    };

    window.openResolveTicketModal = (id, num) => {
      document.getElementById('resolve-ticket-id').value = id;
      document.getElementById('resolve-ticket-label').textContent = num;
      document.getElementById('resolve-ticket-note').value = '';
      openModal('modal-resolve-ticket');
    };

    window.openEditSettingModal = (key) => {
      const s = adminState.settings.find(item => item.key === key);
      if (!s) return;
      document.getElementById('edit-setting-key').value = s.key;
      document.getElementById('edit-setting-desc').textContent = s.description;
      document.getElementById('edit-setting-current').value = s.current_value;
      document.getElementById('edit-setting-val').value = s.current_value;
      document.getElementById('edit-setting-reason').value = '';
      openModal('modal-edit-setting');
    };

    window.exportAuditLogs = () => {
      // RFC-4180 Escaped and Formula Injection Sanitized per Spec 36 / Task P6-T2
      const headers = ['Timestamp', 'ActorEmail', 'Role', 'Action', 'EntityType', 'EntityID', 'Reason', 'IPAddress'];
      const rows = adminState.auditLogs.map(l => {
        const sanitize = (val) => {
          if (val === null || val === undefined) return '';
          let s = String(val);
          if (/^[=+\-@]/.test(s)) s = "'" + s; // formula sanitization
          return '"' + s.replace(/"/g, '""') + '"';
        };
        return [
          sanitize(l.recorded_at),
          sanitize(l.actor_email),
          sanitize(l.actor_role),
          sanitize(l.action),
          sanitize(l.entity_type),
          sanitize(l.entity_id),
          sanitize(l.reason),
          sanitize(l.ip_address)
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join(String.fromCharCode(10));
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'vjit_transport_audit_' + new Date().toISOString().slice(0, 10) + '.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showFeedback('Audit log CSV exported with RFC-4180 formula protection.');
    };

    // Form Submissions
    document.getElementById('form-manual-checkin').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        student_id: fd.get('student_id'),
        stop_name: fd.get('stop_name'),
        trip_id: fd.get('trip_id')
      };
      try {
        const res = await fetch('/api/v1/attendance/manual-checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(r => r.json());

        if (res.success) {
          closeModal('modal-manual-checkin');
          e.target.reset();
          showFeedback('Manual boarding recorded for student ' + payload.student_id);
          await loadAdminData();
        } else {
          showFeedback(res.error?.message || 'Check-in failed', true);
        }
      } catch (err) {
        showFeedback('Network error recording boarding', true);
      }
    };

    document.getElementById('form-add-ticket').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {
        entity_type: fd.get('entity_type'),
        entity_id: '00000000-0000-4000-8000-000000000001',
        entity_identifier: fd.get('entity_identifier'),
        title: fd.get('title'),
        severity: fd.get('severity'),
        assigned_to: fd.get('assigned_to'),
        description: fd.get('description')
      };
      try {
        const res = await fetch('/api/v1/maintenance/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(r => r.json());

        if (res.success) {
          closeModal('modal-add-ticket');
          e.target.reset();
          showFeedback('Work order ' + res.ticket.ticket_number + ' dispatched.');
          await loadAdminData();
        } else {
          showFeedback(res.error?.message || 'Failed to dispatch ticket', true);
        }
      } catch (err) {
        showFeedback('Network error dispatching ticket', true);
      }
    };

    document.getElementById('form-resolve-ticket').onsubmit = async (e) => {
      e.preventDefault();
      const ticketId = document.getElementById('resolve-ticket-id').value;
      const payload = {
        resolution_note: document.getElementById('resolve-ticket-note').value
      };
      try {
        const res = await fetch('/api/v1/maintenance/tickets/' + ticketId + '/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(r => r.json());

        if (res.success) {
          closeModal('modal-resolve-ticket');
          e.target.reset();
          showFeedback('Maintenance ticket marked resolved.');
          await loadAdminData();
        } else {
          showFeedback(res.error?.message || 'Failed to resolve ticket', true);
        }
      } catch (err) {
        showFeedback('Network error resolving ticket', true);
      }
    };

    document.getElementById('form-edit-setting').onsubmit = async (e) => {
      e.preventDefault();
      const key = document.getElementById('edit-setting-key').value;
      const rawVal = document.getElementById('edit-setting-val').value;
      const reason = document.getElementById('edit-setting-reason').value;
      const val = !isNaN(Number(rawVal)) ? Number(rawVal) : (rawVal === 'true' ? true : (rawVal === 'false' ? false : rawVal));

      try {
        const res = await fetch('/api/v1/settings/' + key, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: val, reason })
        }).then(r => r.json());

        if (res.success) {
          closeModal('modal-edit-setting');
          e.target.reset();
          showFeedback('Operational threshold ' + key + ' updated to ' + val);
          await loadAdminData();
        } else {
          showFeedback(res.error?.message || 'Setting update failed', true);
        }
      } catch (err) {
        showFeedback('Network error updating setting', true);
      }
    };

    // Sidebar navigation
    document.querySelectorAll('.nav-link-btn').forEach(btn => {
      btn.onclick = () => {
        if (adminRouteStudio.hasUnsavedChanges) {
          if (!confirm('You have unsaved route changes in Route Studio. Are you sure you want to discard your edits and switch pages?')) {
            return;
          }
          adminRouteStudio.hasUnsavedChanges = false;
        }
        const page = btn.dataset.page;
        adminState.currentPage = page;
        document.querySelectorAll('.nav-link-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.getElementById('page-fleet-deck').style.display = page === 'fleet-deck' ? 'block' : 'none';
        document.getElementById('page-buses').style.display = page === 'buses' ? 'block' : 'none';
        document.getElementById('page-routes').style.display = page === 'routes' ? 'block' : 'none';
        document.getElementById('page-devices').style.display = page === 'devices' ? 'block' : 'none';
        document.getElementById('page-attendance').style.display = page === 'attendance' ? 'block' : 'none';
        document.getElementById('page-maintenance').style.display = page === 'maintenance' ? 'block' : 'none';
        document.getElementById('page-settings').style.display = page === 'settings' ? 'block' : 'none';
      };
    });

    // Step Simulation
    document.getElementById('btn-admin-step-sim').onclick = async () => {
      try {
        const res = await fetch('/api/v1/demo/tick', { method: 'POST' }).then(r => r.json());
        if (res.success) {
          document.getElementById('sim-step-text').textContent = 'Step #' + res.state.stepIndex;
          showFeedback('Telemetry simulated forward 10 seconds.');
          await loadAdminData();
        }
      } catch (e) {}
    };

    // Role switcher
    document.getElementById('admin-role-select').onchange = async (e) => {
      const role = e.target.value;
      adminState.currentRole = role;
      try {
        await fetch('/api/v1/auth/switch-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role })
        });
        showFeedback('Active role switched to ' + role + '.');
        renderRolePermissions();
        renderConsole();
      } catch (err) {}
    };

    // Open Modals
    document.getElementById('btn-open-add-bus').onclick = () => openModal('modal-add-bus');
    document.getElementById('btn-open-add-route').onclick = () => openModal('modal-add-route');
    document.getElementById('btn-open-manual-checkin').onclick = () => openModal('modal-manual-checkin');
    document.getElementById('btn-open-add-ticket').onclick = () => openModal('modal-add-ticket');

    // Filter Listeners
    document.getElementById('fleet-search-input').oninput = (e) => {
      adminState.searchQuery = e.target.value.trim();
      renderFleetDeck();
    };

    document.getElementById('att-search-input').oninput = (e) => {
      adminState.attFilter.search = e.target.value.trim();
      renderAttendanceTable();
    };
    document.getElementById('att-filter-trip').onchange = (e) => {
      adminState.attFilter.tripType = e.target.value;
      renderAttendanceTable();
    };
    document.getElementById('att-filter-status').onchange = (e) => {
      adminState.attFilter.status = e.target.value;
      renderAttendanceTable();
    };

    document.getElementById('maint-search-input').oninput = (e) => {
      adminState.maintFilter.search = e.target.value.trim();
      renderMaintenanceTable();
    };

    document.getElementById('buses-search-input').oninput = (e) => {
      adminState.busesSearchQuery = e.target.value.trim();
      renderBusesTable();
    };

    document.getElementById('routes-search-input').oninput = (e) => {
      adminState.routesSearchQuery = e.target.value.trim();
      renderRoutesTable();
    };

    document.getElementById('devices-search-input').oninput = (e) => {
      adminState.devicesSearchQuery = e.target.value.trim();
      renderDevicesTable();
    };

    // Polling
    setInterval(loadAdminData, 10000);
    loadAdminData();
  </script>
</body>
</html>`;
}
