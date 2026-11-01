export const apiDocsHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>API Documentation | Lumpia Boss Studio</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0A0B0E;
      --card-bg: rgba(255, 255, 255, 0.025);
      --card-border: rgba(245, 158, 11, 0.15);
      --card-hover-border: rgba(245, 158, 11, 0.4);
      --text: #f3f4f6;
      --text-muted: #9ca3af;

      --primary-amber: #f59e0b;
      --primary-amber-hover: #d97706;
      --primary-amber-glow: rgba(245, 158, 11, 0.25);

      --gold: #eab308;
      --gold-glow: rgba(234, 179, 8, 0.18);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow-x: hidden;
      position: relative;
      padding: 40px 20px;
    }

    /* Ambient background glows */
    body::before {
      content: '';
      position: absolute;
      width: 480px;
      height: 480px;
      background: radial-gradient(circle, var(--primary-amber-glow) 0%, transparent 70%);
      top: -10%;
      left: 10%;
      opacity: 0.55;
      filter: blur(90px);
      z-index: 0;
      pointer-events: none;
    }

    body::after {
      content: '';
      position: absolute;
      width: 520px;
      height: 520px;
      background: radial-gradient(circle, var(--gold-glow) 0%, transparent 70%);
      bottom: -10%;
      right: 5%;
      opacity: 0.45;
      filter: blur(100px);
      z-index: 0;
      pointer-events: none;
    }

    .container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 980px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 36px;
    }

    header {
      text-align: center;
      max-width: 640px;
    }

    .logo-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, #f59e0b 0%, #b45309 100%);
      border-radius: 20px;
      margin-bottom: 20px;
      box-shadow: 0 10px 28px rgba(245, 158, 11, 0.35);
      animation: float 4s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-7px); }
    }

    .logo-container svg {
      width: 38px;
      height: 38px;
      fill: #ffffff;
    }

    h1 {
      font-size: 2.6rem;
      font-weight: 800;
      margin-bottom: 12px;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff 40%, #fbbf24 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtitle {
      color: var(--text-muted);
      font-size: 1.05rem;
      line-height: 1.6;
    }

    .docs-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 28px;
      width: 100%;
    }

    @media (min-width: 768px) {
      .docs-grid {
        grid-template-columns: 1fr 1fr;
      }
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 24px;
      padding: 38px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
    }

    .card:hover {
      transform: translateY(-4px);
      border-color: var(--card-hover-border);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 32px rgba(245, 158, 11, 0.12);
    }

    .badge-container {
      margin-bottom: 18px;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 100px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.25);
      color: #fbbf24;
    }

    .card-title {
      font-size: 1.55rem;
      font-weight: 700;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #ffffff;
    }

    .card-title svg {
      width: 28px;
      height: 28px;
      fill: var(--primary-amber);
    }

    .card-description {
      color: var(--text-muted);
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 26px;
      flex-grow: 1;
    }

    .meta-list {
      list-style: none;
      margin-bottom: 28px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.85rem;
      color: #9ca3af;
    }

    .meta-item svg {
      width: 16px;
      height: 16px;
      color: var(--primary-amber);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 24px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.95rem;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #0b0f19;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.25);
    }

    .btn:hover {
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #f3f4f6;
      box-shadow: none;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(245, 158, 11, 0.3);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
    }

    .nav-footer {
      margin-top: 16px;
      display: flex;
      gap: 24px;
      align-items: center;
    }

    .nav-link {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: color 0.2s;
    }

    .nav-link:hover {
      color: #fbbf24;
    }

    .nav-link svg {
      width: 16px;
      height: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-container">
        <svg viewBox="0 0 24 24">
          <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
        </svg>
      </div>
      <h1>Lumpia Boss Studio API</h1>
      <p class="subtitle">Private Enterprise Management API Portal for commercial high-yield lumpia manufacturing, raw materials dual-ledgers, batch production, and shareholder distributions.</p>
    </header>

    <div class="docs-grid">
      <!-- Swagger UI Card -->
      <div class="card" id="swaggerCard">
        <div>
          <div class="badge-container">
            <span class="badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Protected (Basic Auth)
            </span>
          </div>
          <h2 class="card-title">
            <svg viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            Swagger UI Explorer
          </h2>
          <p class="card-description">
            Interactive visual Swagger UI documentation covering admin authentication, refresh token rotation, inventory items, batch rollings, and shareholder rosters.
          </p>
          <ul class="meta-list">
            <li class="meta-item">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              Protected with HTTP Basic Auth credentials
            </li>
            <li class="meta-item">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              API Prefix: <code>/api/v1/*</code>
            </li>
          </ul>
        </div>
        <a href="/api-docs/swagger" class="btn">
          Launch Swagger UI
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </a>
      </div>

      <!-- Fiberplane Playground Card -->
      <div class="card" id="fpCard">
        <div>
          <div class="badge-container">
            <span class="badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Developer Console
            </span>
          </div>
          <h2 class="card-title">
            <svg viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Fiberplane Explorer
          </h2>
          <p class="card-description">
            Embedded developer API testing client to send live requests, inspect payloads, and debug endpoint interactions directly inside the Cloudflare Worker runtime.
          </p>
          <ul class="meta-list">
            <li class="meta-item">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              Direct edge request runner
            </li>
            <li class="meta-item">
              <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              Path: <code>/fp</code>
            </li>
          </ul>
        </div>
        <a href="/fp" class="btn btn-secondary">
          Open Fiberplane Studio
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </a>
      </div>
    </div>

    <div class="nav-footer">
      <a href="/" class="nav-link">
        <svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
        </svg>
        Home Gateway
      </a>
      <a href="/openapi.json" target="_blank" class="nav-link">OpenAPI Spec (JSON)</a>
      <a href="/api-docs/swagger" class="nav-link">Swagger UI</a>
    </div>
  </div>
</body>
</html>
`
