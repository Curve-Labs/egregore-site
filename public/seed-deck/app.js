// seed-deck dashboard app
// Single-file ESM. Loads data.json, manages state, renders five surfaces.

const STATE = {
  data: null,
  mode: "author",           // author | read
  surface: "deck",          // deck | questions | quotes | network | timeline
  overlays: new Set(),      // 'evidence' | 'deltas'
  activeSlide: null,        // slide number string
  activeArtifact: null,     // artifact id
  selectedHero: {},         // slideN -> quote_id (chosen alternate hero)
  filters: {
    urgency: null,          // null | blocker | important | nice_to_have | defer
    section: null,
    kind: null,
    audience: null,
  },
};

// ─── Boot ───────────────────────────────────────────────────────

async function boot() {
  const res = await fetch("data.json", { cache: "no-cache" });
  STATE.data = await res.json();
  wireChrome();
  renderHeaderMeta();
  renderStatusbar();
  renderSurface();
}

// ─── Chrome wiring ──────────────────────────────────────────────

function wireChrome() {
  document.querySelectorAll(".surface-tab").forEach(btn => {
    btn.addEventListener("click", () => switchSurface(btn.dataset.surface));
  });
  document.querySelectorAll("#modeToggle button").forEach(btn => {
    btn.addEventListener("click", () => switchMode(btn.dataset.mode));
  });
  document.querySelectorAll("#overlays .overlay-pill").forEach(btn => {
    btn.addEventListener("click", () => toggleOverlay(btn.dataset.overlay));
  });
  document.addEventListener("keydown", e => {
    const inSearch = document.activeElement === document.getElementById("globalSearch");
    if (e.key === "Escape") {
      closeCompose();
      closeDetail();
      closeSearch();
      document.getElementById("globalSearch").blur();
    }
    if (inSearch) return;  // don't intercept number keys while typing
    if (e.key === "/") { e.preventDefault(); document.getElementById("globalSearch").focus(); }
    if (e.key === "1") switchSurface("deck");
    if (e.key === "2") switchSurface("questions");
    if (e.key === "3") switchSurface("quotes");
    if (e.key === "4") switchSurface("network");
    if (e.key === "5") switchSurface("timeline");
  });
  // Search wiring
  const searchInput = document.getElementById("globalSearch");
  searchInput.addEventListener("input", e => doSearch(e.target.value));
  searchInput.addEventListener("focus", e => { if (e.target.value) doSearch(e.target.value); });
  document.addEventListener("click", e => {
    if (!e.target.closest(".search-results") && !e.target.closest("#globalSearch")) {
      closeSearch();
    }
  });

  // expose close handlers globally so inline onclicks work
  window.closeCompose = closeCompose;
  window.closeDetail = closeDetail;
  window.openDetail = openDetail;
}

// ─── Search ────────────────────────────────────────────────────

function doSearch(query) {
  const q = query.trim().toLowerCase();
  const popover = document.getElementById("searchResults");
  if (q.length < 2) {
    popover.classList.remove("open");
    return;
  }
  const matches = {
    artifacts: STATE.data.artifacts.filter(a =>
      (a.title || "").toLowerCase().includes(q) ||
      (a.summary || "").toLowerCase().includes(q)
    ).slice(0, 8),
    quotes: STATE.data.quotes.filter(qt =>
      (qt.text || "").toLowerCase().includes(q)
    ).slice(0, 8),
    questions: STATE.data.open_questions.filter(qn =>
      (qn.text || "").toLowerCase().includes(q) ||
      (qn.context || "").toLowerCase().includes(q)
    ).slice(0, 8),
  };

  const hl = (s) => esc(s).replace(new RegExp(escRegex(q), "gi"), m => `<mark>${m}</mark>`);

  let html = "";
  if (matches.artifacts.length > 0) {
    html += `<div class="search-result-group">artifacts (${matches.artifacts.length})</div>`;
    html += matches.artifacts.map(a => `
      <div class="search-result-item" data-action="artifact" data-id="${a.id}">
        <span class="result-type">${a.kind || ""}</span>
        <span class="result-text">${hl(a.title)}</span>
        <span class="result-meta">${a.section}</span>
      </div>
    `).join("");
  }
  if (matches.quotes.length > 0) {
    html += `<div class="search-result-group">quotes (${matches.quotes.length})</div>`;
    html += matches.quotes.map(qt => `
      <div class="search-result-item" data-action="quote" data-id="${qt.source_artifact}">
        <span class="result-type">${qt.kind}</span>
        <span class="result-text">${hl(qt.text)}</span>
        <span class="result-meta">${qt.target_slide ? "→ slide " + qt.target_slide : ""}</span>
      </div>
    `).join("");
  }
  if (matches.questions.length > 0) {
    html += `<div class="search-result-group">open questions (${matches.questions.length})</div>`;
    html += matches.questions.map(qn => `
      <div class="search-result-item" data-action="question" data-id="${qn.raised_in}">
        <span class="result-type">${qn.urgency || ""}</span>
        <span class="result-text">${hl(qn.text)}</span>
        <span class="result-meta">${qn.section || ""}</span>
      </div>
    `).join("");
  }
  if (!html) html = `<div class="search-result-item" style="color: var(--fg-faint); font-style:italic">No matches.</div>`;

  popover.innerHTML = html;
  popover.classList.add("open");

  popover.querySelectorAll(".search-result-item[data-action]").forEach(el => {
    el.addEventListener("click", () => {
      openDetail(el.dataset.id);
      closeSearch();
    });
  });
}

function escRegex(s) { return s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"); }
function closeSearch() {
  document.getElementById("searchResults").classList.remove("open");
}

function switchSurface(name) {
  STATE.surface = name;
  document.querySelectorAll(".surface-tab").forEach(b => {
    b.classList.toggle("active", b.dataset.surface === name);
  });
  document.querySelectorAll(".surface").forEach(s => s.classList.remove("active"));
  document.getElementById("surface-" + name).classList.add("active");
  renderSurface();
}

function switchMode(name) {
  STATE.mode = name;
  document.body.classList.toggle("read-mode", name === "read");
  document.querySelectorAll("#modeToggle button").forEach(b => {
    b.classList.toggle("active", b.dataset.mode === name);
  });
  renderSurface();
}

function toggleOverlay(name) {
  if (STATE.overlays.has(name)) STATE.overlays.delete(name);
  else STATE.overlays.add(name);
  document.querySelectorAll("#overlays .overlay-pill").forEach(b => {
    b.classList.toggle("active", STATE.overlays.has(b.dataset.overlay));
  });
  renderSurface();
}

function renderHeaderMeta() {
  const s = STATE.data.stats;
  const el = document.getElementById("headerMeta");
  el.innerHTML = `
    <span>artifacts <strong>${s.artifact_count}</strong></span>
    <span>questions <strong>${s.question_count}</strong></span>
    <span>quotes <strong>${s.quote_count}</strong></span>
    ${s.blocker_count > 0 ? `<span style="color: var(--urgency-blocker)">blockers <strong>${s.blocker_count}</strong></span>` : ""}
  `;
}

function renderStatusbar() {
  const s = STATE.data.stats;
  const blockers = STATE.data.open_questions.filter(q => q.urgency === "blocker").length;
  const slidesReady = STATE.data.deck.filter(d => d.readiness.score >= 5).length;
  const slidesEmpty = STATE.data.deck.filter(d => d.assignment_count === 0).length;
  const el = document.getElementById("statusbar");
  el.innerHTML = `
    <span class="pill">sources <strong>${s.source_count}</strong></span>
    <span class="pill">extractions <strong>${s.extraction_count}</strong></span>
    <span class="pill">slides <strong>${slidesReady}/${STATE.data.deck.length}</strong> ready</span>
    ${slidesEmpty > 0 ? `<span class="pill warn">slides empty <strong>${slidesEmpty}</strong></span>` : ""}
    ${blockers > 0 ? `<span class="pill danger">blockers <strong>${blockers}</strong></span>` : ""}
    <span class="right">
      <span style="opacity:0.6">${kbdHint()}</span>
      <button class="action-button author-only" id="previewDeckBtn">preview deck</button>
      <button class="action-button primary author-only" id="sendPacketBtn">send packet</button>
    </span>
  `;
  document.getElementById("previewDeckBtn")?.addEventListener("click", previewFullDeck);
  document.getElementById("sendPacketBtn")?.addEventListener("click", () => {
    alert("Send packet: not implemented in v1.\n\nThis would bundle the rendered deck (PDF) + agent-readable manifest (YAML) + dashboard URL into an emissary packet for the recipient.");
  });
}

function kbdHint() {
  return STATE.surface === "deck" ? "[1-5] surfaces · [esc] close" :
         STATE.surface === "questions" ? "[1-5] surfaces · [esc] close" :
         "[1-5] surfaces · [esc] close";
}

function previewFullDeck() {
  // Open a new window with the deck rendered as continuous slides
  const slides = STATE.data.deck.filter(s => !String(s.n).startsWith("A") && s.n !== "closing" && s.n !== "team" && s.n !== "traction");
  const renderedSlides = slides.map(slide => {
    const heroId = (STATE.selectedHero || {})[slide.n] || (slide.hero_quote_ids || [])[0];
    const hero = STATE.data.quotes.find(q => q.id === heroId);
    const supportQs = (slide.quote_ids || []).map(id => STATE.data.quotes.find(q => q.id === id))
      .filter(Boolean).filter(q => q.kind !== "hero").slice(0, 2);
    const primary = (slide.primary_artifacts || []).map(getArtifact).filter(Boolean)[0];

    return `
      <div class="deck-slide">
        <div class="slide-corner">${slide.n}</div>
        <div class="slide-hero">${hero ? esc(hero.text) : '<em style="color:#888">— hero TBD —</em>'}</div>
        ${supportQs.length > 0 ? `<div class="slide-support">${supportQs.map(q => esc(q.text)).join(" ")}</div>` : ""}
        ${primary?.summary ? `<div class="slide-detail"><em>${esc(primary.summary)}</em></div>` : ""}
        <div class="slide-footer">${esc(slide.name)} · ${slide.assignment_count} inputs</div>
      </div>
    `;
  }).join("");

  const w = window.open("", "_blank", "width=1100,height=900");
  w.document.write(`<!doctype html>
<html><head><title>seed-deck preview</title><style>
  body { background:#0d0e10; color:#e8e6e1; font-family:-apple-system,sans-serif; margin:0; padding:24px; }
  .deck-slide { background:#1a1d22; border:1px solid #2a2e35; border-radius:8px; padding:48px 56px; margin-bottom:24px; min-height:480px; display:flex; flex-direction:column; gap:18px; position:relative; }
  .slide-corner { position:absolute; top:18px; right:24px; font-family:"SF Mono",monospace; font-size:11px; color:#6a6660; letter-spacing:0.1em; }
  .slide-hero { font-size:32px; font-weight:500; line-height:1.25; color:#fff; }
  .slide-support { font-size:15px; line-height:1.55; color:#9a9690; }
  .slide-detail { font-size:13px; line-height:1.55; color:#6a6660; padding-top:12px; border-top:1px dashed #2a2e35; margin-top:auto; }
  .slide-footer { font-family:"SF Mono",monospace; font-size:10px; color:#4a8a7d; text-transform:uppercase; letter-spacing:0.1em; margin-top:8px; }
  h1 { font-family:"SF Mono",monospace; font-size:14px; color:#7dd3c0; letter-spacing:0.08em; text-transform:lowercase; margin-bottom:32px; padding-bottom:16px; border-bottom:1px solid #2a2e35; }
</style></head><body>
<h1>▍ seed-deck · preview composition · ${STATE.data.generated_at}</h1>
${renderedSlides}
</body></html>`);
}

// ─── Surface dispatcher ─────────────────────────────────────────

function renderSurface() {
  switch (STATE.surface) {
    case "deck":      renderDeckSurface(); break;
    case "questions": renderQuestionsSurface(); break;
    case "quotes":    renderQuotesSurface(); break;
    case "network":   renderNetworkSurface(); break;
    case "timeline":  renderTimelineSurface(); break;
  }
}

// ─── Deck surface ──────────────────────────────────────────────

function renderDeckSurface() {
  const root = document.getElementById("surface-deck");
  const deck = STATE.data.deck;
  const main = deck.filter(s => !String(s.n).startsWith("A") && s.n !== "closing" && s.n !== "team" && s.n !== "traction");
  const appendix = deck.filter(s => String(s.n).startsWith("A"));
  const extras = deck.filter(s => ["closing", "team", "traction"].includes(s.n));

  root.innerHTML = `
    <div class="deck-row-label">narrative arc · slides 1–14</div>
    <div class="deck-grid" id="deck-main"></div>
    <div class="deck-row-label">extras</div>
    <div class="deck-grid" id="deck-extras"></div>
    <div class="deck-row-label">appendix</div>
    <div class="deck-grid" id="deck-appendix"></div>
  `;

  const renderGroup = (containerId, slides) => {
    const container = document.getElementById(containerId);
    container.innerHTML = slides.map(slideCardHTML).join("");
    container.querySelectorAll(".slide-card").forEach(el => {
      el.addEventListener("click", () => openCompose(el.dataset.slide));
    });
  };
  renderGroup("deck-main", main);
  renderGroup("deck-extras", extras);
  renderGroup("deck-appendix", appendix);
}

function slideCardHTML(slide) {
  const r = slide.readiness;
  const empty = slide.assignment_count === 0;
  const blocked = slide.blocker_count > 0;
  const evidenceCount = (slide.supporting_artifacts?.length || 0) + (slide.appendix_artifacts?.length || 0);
  const showEvidenceBar = STATE.overlays.has("evidence");

  // Compute evidence "heat" — 0..1 — based on inputs + cross-cuts
  const heat = Math.min(1, slide.assignment_count / 8);

  const classes = [
    "slide-card",
    empty ? "empty" : "",
    blocked ? "has-blockers" : "",
    STATE.activeSlide === slide.n ? "active" : "",
    showEvidenceBar ? "show-evidence" : "",
  ].filter(Boolean).join(" ");

  const cardStyle = showEvidenceBar ? `style="background: color-mix(in srgb, var(--bg-card) ${100 - heat*30}%, var(--accent) ${heat*30}%)"` : "";

  return `
    <div class="${classes}" data-slide="${slide.n}" ${cardStyle}>
      <div class="slide-number">slide ${slide.n}</div>
      <div class="slide-name">${esc(slide.name)}</div>
      <div class="slide-readiness" title="hero | visual | evidence | questions">
        <span class="readiness-dot ${r.hero}" title="hero: ${r.hero}"></span>
        <span class="readiness-dot ${r.visual === "needs_design" ? "draft" : r.visual}" title="visual: ${r.visual}"></span>
        <span class="readiness-dot ${r.evidence}" title="evidence: ${r.evidence}"></span>
        <span class="readiness-dot ${r.questions}" title="questions: ${r.questions}"></span>
      </div>
      <div class="slide-meta">
        <span class="count">${slide.assignment_count} input${slide.assignment_count === 1 ? "" : "s"}</span>
        <span class="slide-score">${r.score}/${r.max_score}</span>
      </div>
    </div>
  `;
}

// ─── Compose pane (slide deep-dive) ────────────────────────────

function openCompose(slideN) {
  STATE.activeSlide = slideN;
  const slide = STATE.data.deck.find(s => s.n === slideN);
  if (!slide) return;

  const pane = document.getElementById("composePane");
  document.getElementById("composeTitle").textContent =
    `Slide ${slide.n} — ${slide.name}`;
  document.getElementById("composeMeta").innerHTML =
    `readiness <strong style="color:var(--fg)">${slide.readiness.score}/${slide.readiness.max_score}</strong>`;

  const heroQuotes = (slide.hero_quote_ids || []).map(id =>
    STATE.data.quotes.find(q => q.id === id)).filter(Boolean);
  const allQuotes = (slide.quote_ids || []).map(id =>
    STATE.data.quotes.find(q => q.id === id)).filter(Boolean);
  const supportingQuotes = allQuotes.filter(q => q.kind !== "hero").slice(0, 3);

  // Track which hero quote is selected for this slide (defaults to first)
  if (!STATE.selectedHero) STATE.selectedHero = {};
  if (heroQuotes.length > 0 && !STATE.selectedHero[slideN]) {
    STATE.selectedHero[slideN] = heroQuotes[0].id;
  }
  const selectedHeroId = STATE.selectedHero[slideN];
  const selectedHero = heroQuotes.find(q => q.id === selectedHeroId) || heroQuotes[0];

  const primaries = (slide.primary_artifacts || []).map(getArtifact).filter(Boolean);
  const supports = (slide.supporting_artifacts || []).map(getArtifact).filter(Boolean);
  const appendix = (slide.appendix_artifacts || []).map(getArtifact).filter(Boolean);

  const openQs = (slide.open_question_ids || []).map(id =>
    STATE.data.open_questions.find(q => q.id === id)).filter(Boolean);

  const hero = selectedHero;
  const supText = supportingQuotes.length > 0 ? supportingQuotes.slice(0,2).map(q => q.text).join(" ") : null;

  document.getElementById("composeBody").innerHTML = `
    <div class="preview-stack">
      <div class="preview-card">
        ${hero ? `<div class="preview-hero">${esc(hero.text)}</div>` :
                 `<div class="preview-hero missing">— no hero line locked yet —</div>`}
        ${supText ? `<div class="preview-supporting">${esc(supText)}</div>` : ""}
        ${primaries.length > 0 && primaries[0].summary ? `
          <div class="preview-supporting" style="color:var(--fg-faint); font-size:11px;">
            <em>From primary input:</em> ${esc(primaries[0].summary)}
          </div>` : ""}
        <div class="preview-vis">visual: ${slide.readiness.visual.replace("_", " ")}</div>
      </div>

      ${heroQuotes.length > 1 ? `
        <div class="compose-section" style="margin-top: 12px;">
          <h4>alternate hero lines (${heroQuotes.length})</h4>
          <div class="hero-picker">
            ${heroQuotes.map(q => `
              <div class="hero-option ${q.id === selectedHeroId ? "selected" : ""}" data-quote-id="${q.id}" data-slide="${slideN}">
                "${esc(q.text)}"
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      ${openQs.length > 0 ? `
        <div class="compose-section" style="margin-top: 16px;">
          <h4>open questions on this slide (${openQs.length})</h4>
          <ul>
            ${openQs.map(q => `
              <li>
                <span class="urgency-pill ${q.urgency}">${q.urgency.replace("_"," ")}</span>
                <span>${esc(q.text)}</span>
              </li>
            `).join("")}
          </ul>
        </div>` : ""}
    </div>

    <div class="inputs-tray">
      ${primaries.length > 0 ? `
        <div class="inputs-section-label">primary (${primaries.length})</div>
        ${primaries.map(a => inputCardHTML(a, "primary")).join("")}
      ` : ""}
      ${supports.length > 0 ? `
        <div class="inputs-section-label">supporting (${supports.length})</div>
        ${supports.map(a => inputCardHTML(a, "supporting")).join("")}
      ` : ""}
      ${appendix.length > 0 ? `
        <div class="inputs-section-label">appendix (${appendix.length})</div>
        ${appendix.map(a => inputCardHTML(a, "appendix")).join("")}
      ` : ""}
      ${primaries.length + supports.length + appendix.length === 0 ?
        `<div class="empty-state">No inputs assigned to this slide yet.</div>` : ""}
    </div>
  `;

  document.getElementById("composeBody").querySelectorAll(".input-card").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      openDetail(el.dataset.id);
    });
  });

  document.getElementById("composeBody").querySelectorAll(".hero-option").forEach(el => {
    el.addEventListener("click", () => {
      const sN = el.dataset.slide;
      const qId = el.dataset.quoteId;
      STATE.selectedHero[sN] = qId;

      // Update .selected class on options
      document.querySelectorAll(".hero-option").forEach(o => {
        o.classList.toggle("selected", o.dataset.quoteId === qId);
      });

      // Update the visible preview-hero
      const newQuote = STATE.data.quotes.find(q => q.id === qId);
      const previewEl = document.querySelector(".preview-hero");
      if (previewEl && newQuote) {
        previewEl.textContent = newQuote.text;
        previewEl.classList.remove("missing");
        // tiny pulse for visible feedback
        previewEl.style.transition = "background 0.3s";
        previewEl.style.background = "color-mix(in srgb, var(--accent) 18%, transparent)";
        setTimeout(() => { previewEl.style.background = "transparent"; }, 400);
      }
    });
  });

  pane.classList.add("open");
  renderDeckSurface();
}

function closeCompose() {
  STATE.activeSlide = null;
  document.getElementById("composePane").classList.remove("open");
  renderDeckSurface();
}

function inputCardHTML(a, role) {
  return `
    <div class="input-card ${role}" data-id="${a.id}">
      <div class="input-card-head">
        <span class="kind-sigil ${a.kind}">${a.kind}</span>
      </div>
      <div class="input-card-title">${esc(a.title)}</div>
      ${a.summary ? `<div class="input-card-summary">${esc(a.summary)}</div>` : ""}
    </div>
  `;
}

// ─── Questions surface ─────────────────────────────────────────

function renderQuestionsSurface() {
  const root = document.getElementById("surface-questions");
  const all = STATE.data.open_questions;

  if (all.length === 0) {
    root.innerHTML = `<div class="empty-state">No open questions extracted yet.<br><br>Run <code>bash dashboard/build.sh</code> after Phase 1 extraction agents complete.</div>`;
    return;
  }

  const byUrgency = groupBy(all, q => q.urgency || "important");
  const bySection = groupBy(all, q => q.section || "_unknown");

  const filtered = all.filter(q => {
    if (STATE.filters.urgency && q.urgency !== STATE.filters.urgency) return false;
    if (STATE.filters.section && q.section !== STATE.filters.section) return false;
    return true;
  });

  // sort: blockers first, then by blast_radius desc
  const sorted = [...filtered].sort((a, b) => {
    const order = { blocker: 0, important: 1, nice_to_have: 2, defer: 3 };
    const aO = order[a.urgency] ?? 1;
    const bO = order[b.urgency] ?? 1;
    if (aO !== bO) return aO - bO;
    return (b.blast_radius || 0) - (a.blast_radius || 0);
  });

  root.innerHTML = `
    <aside class="questions-filters">
      <h3>filter by urgency</h3>
      ${["blocker", "important", "nice_to_have", "defer"].map(u => `
        <div class="filter-row ${STATE.filters.urgency === u ? "active" : ""}"
             data-filter="urgency" data-value="${u}">
          <span>${u.replace("_"," ")}</span>
          <span class="filter-count">${(byUrgency[u] || []).length}</span>
        </div>`).join("")}
      ${STATE.filters.urgency ? `
        <div class="filter-row" data-filter="urgency" data-value="">
          <span style="color:var(--fg-faint)">— clear filter</span>
        </div>` : ""}

      <h3 style="margin-top: 20px;">by section</h3>
      ${Object.keys(bySection).sort().map(s => `
        <div class="filter-row ${STATE.filters.section === s ? "active" : ""}"
             data-filter="section" data-value="${s}">
          <span>${s}</span>
          <span class="filter-count">${bySection[s].length}</span>
        </div>`).join("")}
      ${STATE.filters.section ? `
        <div class="filter-row" data-filter="section" data-value="">
          <span style="color:var(--fg-faint)">— clear filter</span>
        </div>` : ""}
    </aside>
    <div class="questions-list">
      <div style="font-family: var(--mono); font-size: 10px; color: var(--fg-faint); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">
        ${sorted.length} question${sorted.length === 1 ? "" : "s"}${(STATE.filters.urgency || STATE.filters.section) ? " (filtered)" : ""}
      </div>
      ${sorted.map(questionRowHTML).join("")}
    </div>
  `;

  root.querySelectorAll(".filter-row").forEach(el => {
    el.addEventListener("click", () => {
      const f = el.dataset.filter;
      const v = el.dataset.value || null;
      STATE.filters[f] = v;
      renderQuestionsSurface();
    });
  });
  root.querySelectorAll(".question-row").forEach(el => {
    el.addEventListener("click", () => {
      const aid = el.dataset.artifactId;
      if (aid) openDetail(aid);
    });
  });
}

function questionRowHTML(q) {
  return `
    <div class="question-row ${q.urgency || "important"}" data-artifact-id="${q.raised_in}">
      <div>
        <span class="urgency-pill ${q.urgency || "important"}">${(q.urgency || "important").replace("_"," ")}</span>
      </div>
      <div>
        <div class="question-text">${esc(q.text)}</div>
        ${q.context ? `<div class="question-context">${esc(q.context)}</div>` : ""}
      </div>
      <div class="question-source">
        <div class="src-section">${q.section || "—"}</div>
        <div style="margin-top: 3px;">blast: ${q.blast_radius ?? "—"}</div>
        ${q.category ? `<div style="margin-top: 3px;">${q.category}</div>` : ""}
      </div>
    </div>
  `;
}

// ─── Quotes surface ────────────────────────────────────────────

function renderQuotesSurface() {
  const root = document.getElementById("surface-quotes");
  const all = STATE.data.quotes;
  if (all.length === 0) {
    root.innerHTML = `<div class="empty-state">No quotes extracted yet.<br><br>Run <code>bash dashboard/build.sh</code> after Phase 1 extraction agents complete.</div>`;
    return;
  }
  const byKind = groupBy(all, q => q.kind || "supporting");
  const filtered = all.filter(q => {
    if (STATE.filters.kind && q.kind !== STATE.filters.kind) return false;
    if (STATE.filters.audience && q.audience !== STATE.filters.audience) return false;
    return true;
  });

  // sort: hero > aphorism > definition > closing > data_point > supporting
  const order = { hero: 0, aphorism: 1, definition: 2, closing: 3, data_point: 4, supporting: 5 };
  const sorted = [...filtered].sort((a, b) => (order[a.kind] ?? 5) - (order[b.kind] ?? 5));

  root.innerHTML = `
    <aside class="questions-filters">
      <h3>filter by kind</h3>
      ${Object.keys(byKind).sort((a,b) => (order[a] ?? 5) - (order[b] ?? 5)).map(k => `
        <div class="filter-row ${STATE.filters.kind === k ? "active" : ""}"
             data-filter="kind" data-value="${k}">
          <span>${k.replace("_"," ")}</span>
          <span class="filter-count">${byKind[k].length}</span>
        </div>`).join("")}
      ${STATE.filters.kind ? `
        <div class="filter-row" data-filter="kind" data-value="">
          <span style="color:var(--fg-faint)">— clear filter</span>
        </div>` : ""}
    </aside>
    <div>
      <div style="font-family: var(--mono); font-size: 10px; color: var(--fg-faint); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">
        ${sorted.length} quote${sorted.length === 1 ? "" : "s"}${STATE.filters.kind ? " (filtered)" : ""}
      </div>
      ${sorted.map(quoteRowHTML).join("")}
    </div>
  `;

  root.querySelectorAll(".filter-row").forEach(el => {
    el.addEventListener("click", () => {
      const f = el.dataset.filter;
      const v = el.dataset.value || null;
      STATE.filters[f] = v;
      renderQuotesSurface();
    });
  });
  root.querySelectorAll(".quote-row").forEach(el => {
    el.addEventListener("click", () => {
      const aid = el.dataset.artifactId;
      if (aid) openDetail(aid);
    });
  });
}

function quoteRowHTML(q) {
  return `
    <div class="quote-row" data-artifact-id="${q.source_artifact}">
      <div class="quote-text ${q.kind}">${esc(q.text)}</div>
      <div class="quote-meta">
        <span class="quote-kind ${q.kind}">${(q.kind || "supporting").replace("_", " ")}</span>
        ${q.target_slide ? `<span>slide ${q.target_slide}</span>` : ""}
        ${q.audience ? `<span>${q.audience}</span>` : ""}
        ${q.attribution ? `<span style="font-style:italic">— ${esc(q.attribution)}</span>` : ""}
        <span style="margin-left:auto; opacity:0.6">${q.source_artifact}</span>
      </div>
    </div>
  `;
}

// ─── Network surface ───────────────────────────────────────────

function renderNetworkSurface() {
  const svg = document.getElementById("networkCanvas");
  svg.innerHTML = "";
  const W = 1600, H = 900;
  const artifacts = STATE.data.artifacts;
  const sections = STATE.data.sections;

  // Layout: section "hubs" arranged in a circle, artifacts in clusters around them.
  const sectionPos = {};
  const visibleSecs = sections.filter(s => artifacts.some(a => a.section === s.id));
  const N = visibleSecs.length;
  const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.35;
  visibleSecs.forEach((s, i) => {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    sectionPos[s.id] = { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
  });

  // Each artifact: position around its section hub
  const artPos = {};
  const inSection = groupBy(artifacts, a => a.section);
  for (const sid in inSection) {
    const arts = inSection[sid];
    const hub = sectionPos[sid];
    if (!hub) continue;
    arts.forEach((a, i) => {
      const angle = (i / arts.length) * Math.PI * 2;
      const r = 85 + (i % 3) * 18;
      artPos[a.id] = { x: hub.x + r * Math.cos(angle), y: hub.y + r * Math.sin(angle) };
    });
  }

  const ns = "http://www.w3.org/2000/svg";
  const el = (name, attrs, text, parent) => {
    const e = document.createElementNS(ns, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    (parent || svg).appendChild(e);
    return e;
  };

  // Cross-cut edges (lightest)
  artifacts.forEach(a => {
    (a.cross_cuts || []).forEach(cc => {
      const from = artPos[a.id], to = sectionPos[cc];
      if (from && to) {
        el("line", {
          x1: from.x, y1: from.y, x2: to.x, y2: to.y,
          stroke: "var(--section-narrative)", "stroke-dasharray": "2 4", "stroke-width": 0.5, opacity: 0.25,
        });
      }
    });
  });

  // Refinement edges (strongest)
  STATE.data.refinements.forEach(r => {
    const from = artPos[r.from], to = artPos[r.to];
    if (!from || !to) return;
    const color = r.rel === "refines" ? "var(--accent)" :
                  r.rel === "version_of" ? "var(--warn)" :
                  r.rel === "evidence_for" ? "var(--kind-evidence)" : "var(--kind-reference)";
    el("line", { x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: color, "stroke-width": 1.2, opacity: 0.6,
                 "stroke-dasharray": r.rel === "evidence_for" ? "4 3" : "none" });
  });

  // Section hub circles
  visibleSecs.forEach(s => {
    const p = sectionPos[s.id];
    const g = el("g", {});
    el("circle", { cx: p.x, cy: p.y, r: 26, fill: "var(--bg-card)",
                   stroke: "var(--border-strong)", "stroke-width": 1.2 }, null, g);
    el("text", { x: p.x, y: p.y - 38, "text-anchor": "middle",
                 "font-family": "var(--mono)", "font-size": "11", fill: "var(--fg)" }, s.title, g);
    el("text", { x: p.x, y: p.y + 4, "text-anchor": "middle",
                 "font-family": "var(--mono)", "font-size": "13", "font-weight": "600", fill: "var(--fg)" },
                 String((inSection[s.id] || []).length), g);
  });

  // Artifact dots
  artifacts.forEach(a => {
    const p = artPos[a.id];
    if (!p) return;
    const stroke = a.is_source ? "var(--warn)" : kindColor(a.kind);
    const g = el("g", { style: "cursor: pointer" });
    g.addEventListener("click", () => openDetail(a.id));

    el("circle", { cx: p.x, cy: p.y, r: a.is_source ? 6 : 4,
                   fill: a.is_source ? stroke : "var(--bg-elev)",
                   stroke: stroke, "stroke-width": 1.4 }, null, g);
    el("text", { x: p.x + 9, y: p.y + 3,
                 "font-family": "var(--mono)", "font-size": "8.5",
                 fill: "var(--fg-dim)" },
                 a.title.length > 38 ? a.title.slice(0, 36) + "…" : a.title, g);
    // tooltip
    el("title", {}, a.title + (a.summary ? "\n\n" + a.summary : ""), g);
  });
}

function kindColor(kind) {
  const m = {
    draft: "var(--kind-draft)", claim: "var(--kind-claim)", note: "var(--kind-note)",
    reference: "var(--kind-reference)", objection: "var(--kind-objection)", evidence: "var(--kind-evidence)",
  };
  return m[kind] || "var(--fg-faint)";
}

// ─── Timeline surface ──────────────────────────────────────────

function renderTimelineSurface() {
  const root = document.getElementById("surface-timeline");
  const artifacts = STATE.data.artifacts;
  const refinements = STATE.data.refinements;

  // Group artifacts by `created` date
  const byDay = groupBy(artifacts, a => a.created || "unknown");
  const days = Object.keys(byDay).sort().reverse();

  if (days.length === 0) {
    root.innerHTML = `<div class="empty-state">No timeline data available.</div>`;
    return;
  }

  root.innerHTML = days.map(d => {
    const arts = byDay[d];
    const sources = arts.filter(a => a.is_source);
    const extractions = arts.filter(a => !a.is_source);
    return `
      <div class="timeline-day">
        <h3>
          <span>${d}</span>
          <span class="count">${sources.length} source${sources.length === 1 ? "" : "s"} · ${extractions.length} extraction${extractions.length === 1 ? "" : "s"}</span>
        </h3>
        ${sources.map(a => `
          <div class="timeline-event" data-id="${a.id}">
            <span class="dot source"></span>
            <div>
              <div style="color: var(--warn); font-weight: 500;">${esc(a.title)}</div>
              ${a.summary ? `<div style="color: var(--fg-dim); font-size: 11px; margin-top: 3px;">${esc(a.summary)}</div>` : ""}
            </div>
            <span class="ev-meta">${a.section} · source</span>
          </div>
        `).join("")}
        ${extractions.map(a => `
          <div class="timeline-event" data-id="${a.id}">
            <span class="dot extraction"></span>
            <div>
              <div>${esc(a.title)}</div>
              ${a.summary ? `<div style="color: var(--fg-dim); font-size: 11px; margin-top: 3px;">${esc(a.summary)}</div>` : ""}
            </div>
            <span class="ev-meta">${a.section} · ${a.kind}</span>
          </div>
        `).join("")}
      </div>
    `;
  }).join("");

  root.querySelectorAll(".timeline-event").forEach(el => {
    el.addEventListener("click", () => openDetail(el.dataset.id));
  });
}

// ─── Detail drawer (artifact deep dive) ────────────────────────

function openDetail(artId) {
  const a = getArtifact(artId);
  if (!a) return;
  STATE.activeArtifact = artId;
  const sec = STATE.data.sections.find(s => s.id === a.section);
  const refsOut = STATE.data.refinements.filter(r => r.from === artId);
  const refsIn = STATE.data.refinements.filter(r => r.to === artId);
  const incomingExtractions = STATE.data.artifacts.filter(x => x.extracted_from === artId);

  const slidesTouched = STATE.data.slide_assignments.filter(s => s.artifact_id === artId);
  const questions = STATE.data.open_questions.filter(q => q.raised_in === artId);
  const quotes = STATE.data.quotes.filter(q => q.source_artifact === artId);

  const drawer = document.getElementById("detailDrawer");
  document.getElementById("detailBody").innerHTML = `
    <h2>${esc(a.title)}</h2>
    <div class="detail-meta">
      <span>kind · ${a.kind}</span>
      <span>type · ${a.type}</span>
      <span>section · ${sec ? sec.title : a.section}</span>
      ${a.is_source ? `<span style="color: var(--warn); border-color: var(--warn)">SOURCE</span>` : ""}
    </div>

    ${a.summary ? `
      <div class="detail-section">
        <h4>what it is</h4>
        <div class="detail-summary">${esc(a.summary)}</div>
      </div>` : ""}

    ${a.why ? `
      <div class="detail-section">
        <h4>why it matters</h4>
        <div class="detail-why">${esc(a.why)}</div>
      </div>` : ""}

    ${slidesTouched.length > 0 ? `
      <div class="detail-section">
        <h4>slide assignments (${slidesTouched.length})</h4>
        <ul class="rel-list">
          ${slidesTouched.map(s => `
            <li>
              <strong>slide ${s.slide}</strong>
              <span style="color:var(--fg-faint)">[${s.role}]</span>
              ${s.evidence ? `<span style="color:var(--fg-faint); font-style:italic"> — ${esc(s.evidence)}</span>` : ""}
            </li>
          `).join("")}
        </ul>
      </div>` : ""}

    ${questions.length > 0 ? `
      <div class="detail-section author-only">
        <h4>open questions raised here (${questions.length})</h4>
        <ul class="rel-list" style="list-style: none">
          ${questions.map(q => `
            <li>
              <span class="urgency-pill ${q.urgency}">${q.urgency.replace("_", " ")}</span>
              ${esc(q.text)}
            </li>`).join("")}
        </ul>
      </div>` : ""}

    ${quotes.length > 0 ? `
      <div class="detail-section">
        <h4>quotes from here (${quotes.length})</h4>
        <ul class="rel-list" style="list-style: none">
          ${quotes.map(q => `
            <li>
              <span class="quote-kind ${q.kind}">${q.kind}</span>
              <em>"${esc(q.text)}"</em>
            </li>`).join("")}
        </ul>
      </div>` : ""}

    <div class="detail-section">
      <h4>relations</h4>
      <ul class="rel-list">
        <li><strong>PART_OF</strong> Quest · seed-deck</li>
        <li><strong>FOR_SECTION</strong> ${a.section}</li>
        ${(a.cross_cuts || []).map(c => `<li><strong>CROSS_CUTS</strong> ${c}</li>`).join("")}
        ${a.extracted_from ? `<li><strong>EXTRACTED_FROM</strong> <a onclick="window.openDetail('${a.extracted_from}')">${a.extracted_from}</a></li>` : ""}
        ${incomingExtractions.map(x => `<li><strong>← EXTRACTED_FROM</strong> by <a onclick="window.openDetail('${x.id}')">${x.id}</a></li>`).join("")}
        ${refsOut.map(r => `<li><strong>${r.rel.toUpperCase()}</strong> <a onclick="window.openDetail('${r.to}')">${r.to}</a></li>`).join("")}
        ${refsIn.map(r => `<li><strong>← ${r.rel.toUpperCase()}</strong> by <a onclick="window.openDetail('${r.from}')">${r.from}</a></li>`).join("")}
      </ul>
    </div>

    <div class="detail-section author-only">
      <h4>file</h4>
      <div class="detail-path">${esc(a.path || "—")}</div>
    </div>

    <div class="detail-section">
      <h4>id</h4>
      <div class="detail-path">${esc(a.id)}</div>
    </div>
  `;
  drawer.classList.add("open");
}

function closeDetail() {
  STATE.activeArtifact = null;
  document.getElementById("detailDrawer").classList.remove("open");
}

// ─── Utils ─────────────────────────────────────────────────────

function getArtifact(id) {
  return STATE.data.artifacts.find(a => a.id === id);
}

function groupBy(arr, fn) {
  return arr.reduce((acc, item) => {
    const k = fn(item);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {});
}

function esc(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

boot().catch(err => {
  document.body.innerHTML = `<pre style="padding: 32px; color: var(--danger); font-family: var(--mono); font-size: 12px;">Failed to boot: ${err.message}\n\n${err.stack}</pre>`;
});
