import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { C } from './tokens'
import App from './App.jsx'
import ResearchPage from './ResearchPage.jsx'
import ArticlePage from './ArticlePage.jsx'
import slovicDemoHistoric from './fonts/Slovic_Demo-Historic.otf'

function GlobalStyles() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@400;700&family=Courier+Prime:wght@400&display=swap');

      @font-face {
        font-family: 'Slovic_Demo';
        src: url('${slovicDemoHistoric}') format('opentype');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: 'Slovic';
        src: url('${slovicDemoHistoric}') format('opentype');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; }
      body { background: ${C.parchment}; font-family: 'Courier Prime', monospace; font-weight: 400; }
      @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      ::selection { background: ${C.crimson}; color: ${C.parchment}; }
      ::-webkit-scrollbar { width: 4px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(122,15,27,0.3); border-radius: 2px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(122,15,27,0.5); }
      textarea:focus, input:focus { border-bottom-color: rgba(200,165,90,0.5) !important; }

      /* ASCII decoration responsive */
      .ascii-hide-mobile { display: block; }
      .ascii-hide-tablet { display: block; }
      @media (max-width: 768px) { .ascii-hide-mobile { display: none !important; } }
      @media (max-width: 1024px) { .ascii-hide-tablet { display: none !important; } }

      /* Egregore calligraphic text scaling */
      .ascii-egregore-text { transform-origin: center center; }
      @media (max-width: 1200px) { .ascii-egregore-text { transform: scale(0.7) !important; } }
      @media (max-width: 768px) { .ascii-egregore-text { transform: scale(0.45) !important; } }

      /* Base responsive stabilization */
      .hero-title { font-size: clamp(52px, 8vw, 90px) !important; }
      .hero-subcopy { width: min(612px, 100%) !important; }
      .hero-ascii pre { font-size: clamp(0.12rem, 0.22vw, 0.29rem) !important; }
      .value-props-card { min-height: auto !important; }
      .value-props-copy { width: 100% !important; }
      .egregoric-copy, .egregoric-body { width: 100% !important; max-width: 668px; }
      .egregoric-title { width: 100% !important; max-width: 540px; }
      .session-cycle-section { padding: 96px 0 64px !important; }
      .session-cycle-intro { width: min(648px, 100%) !important; min-height: 0 !important; }
      .session-command-desc {
        width: 100% !important;
        min-height: 0 !important;
        font-family: 'Courier Prime', monospace !important;
        font-size: 14px !important;
        line-height: 20px !important;
        font-weight: 400 !important;
      }
      .research-card-excerpt {
        width: 100% !important;
        font-size: 16px !important;
        line-height: 28px !important;
      }
      .wizards-artwork { font-size: 5.8px !important; }
      .waitlist-form { width: 100% !important; max-width: 454px; }
      .waitlist-meta { width: 100% !important; max-width: 454px; }
      .waitlist-center { margin-left: auto !important; margin-right: auto !important; }
      .waitlist-title { font-size: 36px !important; line-height: 1.05 !important; }
      .waitlist-side-art pre { font-size: clamp(0.078rem, 0.14vw, 0.128rem) !important; }

      @media (max-width: 1440px) {
        .site-nav { padding: 0 40px !important; }
        .hero-section { min-height: auto !important; padding: 126px 0 56px !important; }
        .hero-section > div { padding: 0 56px !important; }
        .hero-layout { gap: 36px !important; }
        .hero-copy { width: min(720px, 100%) !important; margin-top: 110px !important; }
        .hero-ascii { width: min(920px, 58vw) !important; }

        .value-props-container { padding: 0 32px !important; }
        .value-props-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 28px !important;
        }
        .value-props-card { width: 100% !important; }

        .egregoric-section > div { padding: 0 32px !important; }
        .egregoric-layout { gap: 56px !important; }
        .egregoric-copy { width: min(100%, 668px) !important; }
        .egregoric-ascii { width: min(520px, 44vw) !important; }

        .session-cycle-section > div { padding: 0 24px !important; }
        .session-cycle-layout {
          grid-template-columns: minmax(0, 1fr) minmax(360px, 430px) !important;
          gap: 32px !important;
        }
        .session-cycle-diagram-col { justify-content: flex-end !important; }

        .research-section > div { padding: 0 32px !important; }
        .research-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 28px !important;
        }
        .research-card { min-height: 330px !important; padding: 28px 24px !important; }
      }

      @media (max-width: 1280px) {
        .hero-section { padding: 116px 0 52px !important; }
        .hero-section > div { padding: 0 24px !important; }
        .hero-layout {
          flex-direction: column !important;
          gap: 28px !important;
          align-items: center !important;
        }
        .hero-copy {
          width: min(790px, 100%) !important;
          margin-top: 0 !important;
        }
        .hero-ascii {
          width: 100% !important;
          justify-content: center !important;
          overflow: hidden !important;
        }
        .hero-ascii pre { font-size: clamp(0.115rem, 0.24vw, 0.23rem) !important; }

        .waitlist-section {
          min-height: auto !important;
          padding: 102px 0 92px !important;
        }
        .waitlist-layout {
          width: min(920px, calc(100% - 48px)) !important;
          flex-direction: column !important;
          align-items: center !important;
          gap: 44px !important;
        }
        .waitlist-side-art {
          flex: 0 0 auto !important;
          width: 100% !important;
          justify-content: center !important;
        }
        .waitlist-side-art pre {
          font-size: 0.092rem !important;
          max-width: 100% !important;
        }
        .waitlist-center { width: min(550px, 100%) !important; }
      }

      @media (max-width: 1100px) {
        .site-nav { height: 72px !important; padding: 0 24px !important; }
        .site-nav-links { gap: 18px !important; }
        .site-brand { font-size: 1.7rem !important; }

        .hero-section { padding: 108px 0 48px !important; }
        .hero-section > div { padding: 0 24px !important; }
        .hero-layout { flex-direction: column !important; gap: 24px !important; }
        .hero-copy { width: 100% !important; margin-top: 0 !important; }
        .hero-ascii {
          width: 100% !important;
          justify-content: center !important;
          overflow: hidden !important;
        }
        .hero-ascii pre { font-size: clamp(0.13rem, 0.35vw, 0.27rem) !important; }

        .value-props-section { padding: 26px 0 64px !important; }
        .value-props-container { padding: 0 24px !important; }
        .value-props-grid {
          grid-template-columns: repeat(2, minmax(260px, 1fr)) !important;
          gap: 40px 28px !important;
        }
        .value-props-card { max-width: 420px !important; margin: 0 auto !important; }

        .egregoric-section { padding: 64px 0 80px !important; }
        .egregoric-layout {
          flex-direction: column !important;
          align-items: center !important;
          gap: 36px !important;
        }
        .egregoric-copy { max-width: 760px !important; }
        .egregoric-ascii {
          width: 100% !important;
          justify-content: center !important;
          overflow-x: auto !important;
        }

        .terminal-section {
          height: auto !important;
          min-height: 860px !important;
          padding: 72px 0 64px !important;
        }
        .terminal-inner { padding: 0 24px !important; }

        .session-cycle-section { padding: 84px 0 64px !important; }
        .session-cycle-section > div { padding: 0 24px !important; }
        .session-cycle-layout {
          grid-template-columns: minmax(0, 1fr) !important;
          gap: 40px !important;
        }
        .session-cycle-diagram-col { justify-content: center !important; }

        .wizards-banner-section { min-height: auto !important; padding: 20px 0 12px !important; }
        .wizards-artwork { font-size: 4.9px !important; }

        .research-section { padding: 0 0 64px !important; }
        .research-section > div { padding: 0 24px !important; }
        .research-intro {
          font-size: 20px !important;
          margin: 0 auto 36px !important;
        }
        .research-grid {
          grid-template-columns: repeat(2, minmax(260px, 1fr)) !important;
          gap: 24px !important;
        }

        .waitlist-section { padding: 92px 0 84px !important; }
        .waitlist-layout { gap: 38px !important; }
        .waitlist-side-art pre { font-size: 0.086rem !important; }
        .waitlist-center { width: min(550px, 100%) !important; }
        .waitlist-meta { margin-top: 32px !important; }
      }

      @media (max-width: 768px) {
        .site-nav { height: 64px !important; padding: 0 14px !important; }
        .site-brand { font-size: 1.35rem !important; }
        .site-nav-links { gap: 10px !important; }
        .site-nav-links a { font-size: 10px !important; }
        .site-nav-links a[href="https://github.com/Curve-Labs/egregore-core"] { display: none !important; }
        .site-nav-waitlist {
          width: auto !important;
          height: 30px !important;
          padding: 0 10px !important;
        }

        .hero-section { padding: 98px 0 44px !important; }
        .hero-section > div { padding: 0 16px !important; }
        .hero-title {
          line-height: 0.98 !important;
          margin-bottom: 18px !important;
        }
        .hero-subcopy {
          font-size: 18px !important;
          line-height: 27px !important;
          margin-bottom: 30px !important;
        }

        .value-props-container { padding: 0 16px !important; }
        .value-props-section { padding: 24px 0 56px !important; }
        .value-props-grid { grid-template-columns: minmax(0, 1fr) !important; gap: 36px !important; }

        .egregoric-section { padding: 48px 0 60px !important; }
        .egregoric-section > div { padding: 0 16px !important; }
        .egregoric-title { font-size: 42px !important; line-height: 1.12 !important; }
        .egregoric-body { font-size: 18px !important; line-height: 26px !important; }

        .terminal-section {
          min-height: 760px !important;
          padding: 58px 0 52px !important;
        }
        .terminal-inner { padding: 0 16px !important; }

        .session-cycle-section { padding: 56px 0 56px !important; }
        .session-cycle-section > div { padding: 0 16px !important; }
        .session-command-row {
          grid-template-columns: 1fr !important;
          gap: 8px !important;
          min-height: 0 !important;
          padding: 14px 0 12px !important;
        }
        .session-cycle-diagram {
          transform: scale(0.82);
          transform-origin: center top;
          margin: -20px auto -30px;
        }

        .wizards-artwork { font-size: 3.9px !important; }

        .research-section > div { padding: 0 16px !important; }
        .research-section { padding: 0 0 52px !important; }
        .research-grid { grid-template-columns: 1fr !important; gap: 18px !important; }
        .research-card { min-height: 0 !important; }

        .waitlist-section { padding: 72px 0 64px !important; }
        .waitlist-layout { width: calc(100% - 32px) !important; gap: 30px !important; }
        .waitlist-center { width: 100% !important; }
        .waitlist-title { font-size: 36px !important; }
        .waitlist-side-art pre { font-size: 0.076rem !important; }
        .waitlist-form, .waitlist-meta { max-width: 100% !important; }
        .waitlist-meta {
          flex-direction: column !important;
          gap: 6px !important;
          text-align: center !important;
        }
      }

      /* Print: hide all decorative ASCII */
      @media print { pre[aria-hidden="true"], .ascii-hide-mobile, .ascii-hide-tablet, .ascii-egregore-text { display: none !important; } }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
  return null;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <GlobalStyles />
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/research/:slug" element={<ArticlePage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
