"use client";

// EmissaryBrowse — the /emissary/browse page. The categorized shelf of
// published emissaries, in the hub's manuscript design (it mounts under
// .em-hub so every token and primitive is shared). This is the social
// surface: author badges, stars, and addresses lead.
//
// Data is fetched client-side from the public platform API:
//   GET /api/v1/platform/browse      → entries + categories
//   GET /api/v1/platform/@{handle}   → display name + verified (per author)
//   GET /api/v1/emissary/usage       → public "carried" counts per head id

import { useEffect, useMemo, useState, type FC, type SVGProps } from "react";
import {
  fetchBrowse,
  fetchProfile,
  fetchUsage,
  type BrowseEntry,
  type BrowseCategory,
  type PlatformProfile,
} from "./api";
import "./emissary-hub.css";
import "./emissary-browse.css";

// ── Icons (same vocabulary as the hub) ─────────────────
const IconCopy: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IconCheck: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconStar: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
// Paper-plane — "carried N times" (one tick per receiver who ran it).
const IconRuns: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ── CopyButton (dark code-block style, as on the hub) ──
function CopyLink({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard blocked — no-op */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button type="button" className={`em-copy${copied ? " copied" : ""}`} onClick={onClick}>
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

const EMISSARY_BASE = "https://egregore.xyz/emissary/e/";

// ── Author badge — avatar circle + @handle + ✓ ─────────
function AuthorBadge({ handle, profile }: { handle: string; profile?: PlatformProfile }) {
  const display = profile?.display || null;
  const initial = (display || handle).charAt(0).toUpperCase();
  return (
    <a className="bw-author" href={`/@${handle}`}>
      <span className="bw-avatar" aria-hidden="true">{initial}</span>
      <span className="bw-author-id">
        {display && <span className="bw-author-name">{display}</span>}
        <span className="bw-author-handle">
          @{handle}
          {profile?.verified && (
            <span className="bw-check" title="verified email · egregore.xyz">✓</span>
          )}
        </span>
      </span>
    </a>
  );
}

// ── Card ───────────────────────────────────────────────
function BrowseCard({
  entry,
  categoryLabel,
  profile,
  uses,
}: {
  entry: BrowseEntry;
  categoryLabel?: string;
  profile?: PlatformProfile;
  uses?: number;
}) {
  const link = `${EMISSARY_BASE}${entry.head_id}`;
  return (
    <article className="bw-card">
      <div className="bw-tags">
        {entry.kind && <span className="bw-chip">{entry.kind}</span>}
        {entry.category && <span className="bw-chip cat">{categoryLabel ?? entry.category}</span>}
        <span className="bw-counts">
          <span className="bw-stars" title={`${entry.stars} star${entry.stars === 1 ? "" : "s"}`}>
            <IconStar /> {entry.stars}
          </span>
          {typeof uses === "number" && (
            <span className="bw-uses" title={`Carried ${uses} time${uses === 1 ? "" : "s"}`}>
              <IconRuns /> {uses}
            </span>
          )}
        </span>
      </div>
      <h3 className="bw-name">{entry.topic ?? entry.slug}</h3>
      {entry.summary && <p className="bw-summary">{entry.summary}</p>}
      <div className="bw-foot">
        <AuthorBadge handle={entry.owner_handle} profile={profile} />
        <div className="bw-address-row">
          <a className="bw-address" href={`/${entry.address}`}>
            {entry.address} <span className="bw-version">v{entry.version}</span>
          </a>
          <CopyLink text={link} />
        </div>
      </div>
    </article>
  );
}

// ── Page ───────────────────────────────────────────────
export default function EmissaryBrowse() {
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
  const [entries, setEntries] = useState<BrowseEntry[]>([]);
  const [categories, setCategories] = useState<BrowseCategory[]>([]);
  const [filter, setFilter] = useState<string>("all");
  // Author profiles, cached per handle — one fetch per author per visit.
  const [profiles, setProfiles] = useState<Record<string, PlatformProfile>>({});
  // Public "carried" counts, keyed by head emissary id. Best-effort.
  const [uses, setUses] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    fetchBrowse()
      .then((res) => {
        if (cancelled) return;
        setEntries(res.entries ?? []);
        setCategories(res.categories ?? []);
        setState("ready");

        const ids = (res.entries ?? []).map((e) => e.head_id).filter(Boolean);
        if (ids.length > 0) {
          fetchUsage(ids)
            .then((counts) => {
              if (!cancelled) setUses(counts);
            })
            .catch(() => {
              /* counts are decoration — cards render without them */
            });
        }

        const handles = Array.from(new Set((res.entries ?? []).map((e) => e.owner_handle)));
        handles.forEach((handle) => {
          fetchProfile(handle)
            .then((p) => {
              if (!cancelled) setProfiles((prev) => ({ ...prev, [handle]: p }));
            })
            .catch(() => {
              /* badge falls back to the bare handle */
            });
        });
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.slug] = c.label;
    return map;
  }, [categories]);

  const visible = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.category === filter)),
    [entries, filter],
  );

  return (
    <div className="em-hub em-browse">
      <div className="rules"><div className="vert l" /><div className="vert r" /></div>

      <main className="em-main">
        {/* Hero */}
        <section className="em-hero">
          <h1 className="display">The <em>shelf</em>.</h1>
          <p className="lede">
            Every published emissary, at a named address. Star the ones worth keeping —{" "}
            <em className="em-word">star on the web, enact in the terminal</em>.
          </p>
        </section>

        {/* Shelf */}
        <section>
          <div className="sec-head">
            <span className="num">§ 01</span>
            <span className="label">Published emissaries</span>
            <span className="rule" />
            <span className="label">
              {state === "ready" ? `${visible.length} on the shelf` : "the shelf"}
            </span>
          </div>

          {state === "ready" && entries.length > 0 && (
            <div className="bw-filters" role="group" aria-label="Filter by category">
              <button
                type="button"
                className="bw-filter"
                aria-pressed={filter === "all"}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  className="bw-filter"
                  aria-pressed={filter === c.slug}
                  onClick={() => setFilter(c.slug)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {state === "loading" && <p className="bw-note">loading the shelf…</p>}
          {state === "error" && (
            <p className="bw-note">the shelf couldn&apos;t be reached — try again in a moment.</p>
          )}
          {state === "ready" && entries.length === 0 && (
            <div className="bw-empty">
              <p className="bw-empty-line">The shelf is quiet.</p>
              <p className="bw-empty-sub">
                Nothing published yet — be the first.{" "}
                <a href="/emissary">Send an emissary →</a>
              </p>
            </div>
          )}
          {state === "ready" && entries.length > 0 && visible.length === 0 && (
            <p className="bw-note">nothing on this shelf yet — try another category.</p>
          )}

          {visible.length > 0 && (
            <div className="bw-grid">
              {visible.map((entry) => (
                <BrowseCard
                  key={`${entry.owner_handle}/${entry.slug}`}
                  entry={entry}
                  categoryLabel={entry.category ? categoryLabels[entry.category] : undefined}
                  profile={profiles[entry.owner_handle]}
                  uses={uses[entry.head_id]}
                />
              ))}
            </div>
          )}
        </section>

        <footer>
          <span>egregore.xyz</span>
          <span>
            <a href="/emissary">Emissary</a> &nbsp;{" "}
            <a href="https://github.com/Curve-Labs">Source</a> &nbsp;{" "}
            <a href="mailto:info@egregore.xyz">Mail us</a>
          </span>
          <span>MMXXVI</span>
        </footer>
      </main>
    </div>
  );
}
