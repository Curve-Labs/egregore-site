"use client";

import { useCallback, useEffect, useMemo, useState, type FC, type FormEvent, type SVGProps } from "react";
import {
  getSession,
  listStars,
  loginLink,
  starEmissary,
  unstar,
  NotSignedIn,
  type Session,
  type Star,
} from "./account-api";
import {
  fetchBrowse,
  fetchProfile,
  fetchUsage,
  type BrowseCategory,
  type BrowseEntry,
  type PlatformProfile,
} from "./api";
import "./emissary-hub.css";
import "./meridian.css";

const NEW_COMMAND = "emissary new";

type LoadState = "loading" | "ready" | "error";
type AuthState = "loading" | "signed-out" | "signed-in";
type SortKey = "carried" | "recent" | "stars";
type FilterAxis = "category" | "kind";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "carried", label: "Most carried" },
  { key: "recent", label: "Newest" },
  { key: "stars", label: "Most collected" },
];

const KIND_LABELS: Record<string, string> = {
  build: "Build",
  dialogue: "Dialogue",
  documentation: "Documentation",
  executable: "Executable",
  brief: "Brief",
  research: "Research",
};

const CATEGORY_FALLBACKS = [
  { key: "dialogue", label: "Dialogue" },
  { key: "build", label: "Build" },
  { key: "documentation", label: "Documentation" },
];

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

const IconRun: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const IconStar: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" {...props}>
    <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" />
  </svg>
);

function kindLabel(kind?: string | null): string {
  if (!kind) return "Emissary";
  return KIND_LABELS[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1);
}

function entryKey(entry: BrowseEntry): string {
  return `${entry.owner_handle}/${entry.slug}`;
}

function starKey(star: Star): string {
  return `${star.owner}/${star.slug}`;
}

function avatarInitial(handle: string, profile?: PlatformProfile): string {
  return (profile?.display || handle || "e").charAt(0).toUpperCase();
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }, [value]);

  return (
    <button type="button" className={`em-copy-btn${copied ? " copied" : ""}`} onClick={onClick}>
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? "Copied" : label}
    </button>
  );
}

function CommandCapsule({ command, compact = false }: { command: string; compact?: boolean }) {
  return (
    <div className={`em-command${compact ? " compact" : ""}`}>
      <code><span>$</span>{command}</code>
      <CopyButton value={command} />
    </div>
  );
}

function AuthLink({
  authState,
  session,
  onSignIn,
}: {
  authState: AuthState;
  session: Session | null;
  onSignIn: () => void;
}) {
  if (authState === "loading") return <span className="em-authlink muted">Checking identity</span>;
  if (session) {
    const who = session.handle ? `@${session.handle}` : session.email;
    return <a className="em-authlink" href="/emissary/account">{who} <span>Account</span></a>;
  }
  return <button type="button" className="em-authlink as-button" onClick={onSignIn}>Sign in</button>;
}

function AccountRail({
  authState,
  session,
  stars,
  onSignIn,
}: {
  authState: AuthState;
  session: Session | null;
  stars: Star[] | null;
  onSignIn: () => void;
}) {
  if (authState === "loading") {
    return (
      <aside className="em-rail">
        <div className="rail-label">Account</div>
        <div className="rail-skeleton" />
        <div className="rail-skeleton short" />
      </aside>
    );
  }

  if (!session) {
    return (
      <aside className="em-rail">
        <div className="rail-label">Account</div>
        <h2>Keep what you find.</h2>
        <p>Sign in with email, star emissaries on the web, then pull them into your harness.</p>
        <button type="button" className="rail-primary" onClick={onSignIn}>Sign in by email</button>
        <div className="rail-rule" />
        <span className="rail-mini">No password. The CLI binds later with <code>emissary login</code>.</span>
      </aside>
    );
  }

  const who = session.handle ? `@${session.handle}` : "Handle unclaimed";
  return (
    <aside className="em-rail">
      <div className="rail-label">Account</div>
      <div className="rail-person">
        <span className="rail-avatar">{avatarInitial(session.email || "e")}</span>
        <span>
          <strong>{who}</strong>
          <small>{session.email}</small>
        </span>
      </div>
      <div className="rail-stats">
        <span><strong>{stars ? stars.length : "…"}</strong> stars</span>
        <span><strong>pin</strong> by default</span>
      </div>
      <div className="consent-ring" aria-label="Consent ring">
        <span /><span /><span />
      </div>
      <p className="rail-mini">Your account page holds handle claim, connected CLIs, revocation, stars, and sign out.</p>
      <a className="rail-primary" href="/emissary/account">Manage account</a>
    </aside>
  );
}

function SignInModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<"form" | "sending" | "sent">("form");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setStage("form");
    setError("");
  }, [open]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const addr = email.trim();
    if (!addr) return;
    setStage("sending");
    setError("");
    try {
      await loginLink(addr, "/emissary?welcome=1");
      setStage("sent");
    } catch (err) {
      setStage("form");
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  }

  if (!open) return null;

  return (
    <div className="signin-layer" role="dialog" aria-modal="true" aria-labelledby="signin-title">
      <button type="button" className="signin-scrim" aria-label="Close sign in" onClick={onClose} />
      <div className="signin-modal">
        <div className="rail-label">Account</div>
        {stage === "sent" ? (
          <>
            <h2 id="signin-title">Check your inbox.</h2>
            <p>A one-time sign-in link is on its way. Open it here and the directory will remember you.</p>
            <button type="button" className="hero-secondary" onClick={onClose}>Done</button>
          </>
        ) : (
          <>
            <h2 id="signin-title">Sign in without leaving.</h2>
            <p>Email link first. The terminal binds later with <code>emissary login</code>.</p>
            <form onSubmit={onSubmit} className="signin-form">
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                placeholder="you@example.com"
                autoComplete="email"
                aria-label="Email address"
                autoFocus
                required
              />
              {error && <span className="signin-error">{error}</span>}
              <button type="submit" className="rail-primary" disabled={stage === "sending"}>
                {stage === "sending" ? "Sending..." : "Send link"}
              </button>
            </form>
            <div className="signin-terminal">
              <span>Use your terminal</span>
              <CommandCapsule command="emissary login" compact />
            </div>
          </>
        )}
        <button type="button" className="signin-close" onClick={onClose} aria-label="Close">x</button>
      </div>
    </div>
  );
}

function FilterRail({
  entries,
  categories,
  filter,
  setFilter,
}: {
  entries: BrowseEntry[];
  categories: BrowseCategory[];
  filter: string;
  setFilter: (next: string) => void;
}) {
  const { axis, options } = useMemo((): { axis: FilterAxis; options: { key: string; label: string; count: number }[] } => {
    const categoryCounts = new Map<string, number>();
    for (const entry of entries) {
      if (entry.category) categoryCounts.set(entry.category, (categoryCounts.get(entry.category) ?? 0) + 1);
    }

    const categoryOptions = categories
      .map((cat) => ({ key: cat.slug, label: cat.label, count: categoryCounts.get(cat.slug) ?? 0 }))
      .filter((cat) => cat.count > 0);

    if (categoryOptions.length > 0) return { axis: "category", options: categoryOptions };

    const kindCounts = new Map<string, number>();
    for (const entry of entries) {
      if (entry.kind) kindCounts.set(entry.kind, (kindCounts.get(entry.kind) ?? 0) + 1);
    }

    const liveKinds = Array.from(kindCounts.entries()).map(([key, count]) => ({
      key,
      label: kindLabel(key),
      count,
    }));

    const options = liveKinds.length > 0
      ? liveKinds
      : CATEGORY_FALLBACKS.map((item) => ({ ...item, count: 0 }));

    return { axis: "kind", options: options.sort((a, b) => b.count - a.count) };
  }, [entries, categories]);

  return (
    <div className="catrail" role="group" aria-label={`Filter by ${axis}`}>
      <button
        type="button"
        className={`chip${filter === "all" ? " on" : ""}`}
        aria-pressed={filter === "all"}
        onClick={() => setFilter("all")}
      >
        all <span>{entries.length}</span>
      </button>
      {options.map((option, index) => (
        <button
          key={option.key}
          type="button"
          className={`chip k${(index % 5) + 1}${filter === option.key ? " on" : ""}`}
          aria-pressed={filter === option.key}
          onClick={() => setFilter(option.key)}
        >
          {option.label} <span>{option.count}</span>
        </button>
      ))}
    </div>
  );
}

function AuthorBadge({ handle, profile }: { handle: string; profile?: PlatformProfile }) {
  return (
    <a className="dir-author" href={`/@${handle}`}>
      <span className="dir-avatar">{avatarInitial(handle, profile)}</span>
      <span>
        <strong>{profile?.display || `@${handle}`}{profile?.verified && <b title="verified">✓</b>}</strong>
        <small>@{handle}</small>
      </span>
    </a>
  );
}

function ThumbnailArt({ kind }: { kind?: string | null }) {
  if (kind === "dialogue") {
    return (
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <circle cx="80" cy="80" r="50" />
        <circle cx="80" cy="80" r="34" />
        <circle cx="80" cy="80" r="18" />
        <circle cx="80" cy="80" r="4" />
        <path d="M80 18v24M80 118v24M18 80h24M118 80h24" />
      </svg>
    );
  }

  if (kind === "documentation") {
    return (
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <path d="M32 58h96L80 28 32 58Z" />
        <path d="M42 66v58M66 66v58M94 66v58M118 66v58" />
        <path d="M30 130h100" />
      </svg>
    );
  }

  if (kind === "executable" || kind === "research") {
    return (
      <svg viewBox="0 0 160 160" aria-hidden="true">
        <path d="M80 22 92 68 138 80 92 92 80 138 68 92 22 80 68 68 80 22Z" />
        <circle cx="80" cy="80" r="54" />
        <path d="M80 12v18M80 130v18M12 80h18M130 80h18" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 160 160" aria-hidden="true">
      <path d="M80 22 128 80 80 138 32 80 80 22Z" />
      <path d="M80 46 108 80 80 114 52 80 80 46Z" />
      <path d="M80 112V58" />
      <path d="M64 76 80 58 96 76" />
    </svg>
  );
}

function DirectoryThumb({ entry }: { entry: BrowseEntry }) {
  return (
    <div className={`dir-thumb k-${entry.kind || "emissary"}`} aria-hidden="true">
      <span className="thumb-kind">{kindLabel(entry.kind)}</span>
      <ThumbnailArt kind={entry.kind} />
      <span className="thumb-line wide" />
      <span className="thumb-line" />
      <span className="thumb-line short" />
    </div>
  );
}

function DirectoryCard({
  entry,
  profile,
  carried,
  starred,
  busy,
  onToggleStar,
}: {
  entry: BrowseEntry;
  profile?: PlatformProfile;
  carried: number;
  starred: boolean;
  busy: boolean;
  onToggleStar: (entry: BrowseEntry) => void;
}) {
  const addressHref = `/${entry.address}`;
  const copyUrl = `https://egregore.xyz/emissary/e/${entry.head_id}`;

  return (
    <article className="dir-card">
      <DirectoryThumb entry={entry} />
      <div className="dir-card-body">
        <div className="dir-card-top">
          <span className="dir-kind">{kindLabel(entry.kind)}</span>
          <span className="dir-counts">
            <span title={`${carried} carried`}><IconRun /> {carried}</span>
            <span title={`${entry.stars} stars`}><IconStar /> {entry.stars}</span>
          </span>
        </div>
        <h3><a href={addressHref}>{entry.topic || entry.slug}</a></h3>
        {entry.summary && <p>{entry.summary}</p>}
        <div className="dir-card-foot">
          <AuthorBadge handle={entry.owner_handle} profile={profile} />
          <div className="dir-actions">
            <button
              type="button"
              className={`star-action${starred ? " is-starred" : ""}`}
              aria-pressed={starred}
              aria-label={starred ? `Remove star for ${entry.address}` : `Star ${entry.address}`}
              disabled={busy}
              onClick={() => onToggleStar(entry)}
            >
              <IconStar />
            </button>
            <CopyButton value={copyUrl} label="Copy link" />
          </div>
        </div>
      </div>
    </article>
  );
}

function SocialProof({
  contributors,
  totalEntries,
  totalCarried,
}: {
  contributors: { handle: string; count: number; profile?: PlatformProfile }[];
  totalEntries: number;
  totalCarried: number;
}) {
  const visible = contributors.slice(0, 3);
  const extra = Math.max(0, contributors.length - visible.length);

  return (
    <div className="directory-proof">
      <div className="proof-avatars" aria-label={`${contributors.length} authors`}>
        {visible.map(({ handle, profile }) => (
          <a key={handle} href={`/@${handle}`} className="dir-avatar" title={profile?.display || `@${handle}`}>
            {avatarInitial(handle, profile)}
          </a>
        ))}
        {extra > 0 && <span className="proof-more">+{extra}</span>}
      </div>
      <p>
        <strong>{totalEntries}</strong> emissaries · <strong>{contributors.length}</strong>{" "}
        {contributors.length === 1 ? "author" : "authors"}
        {totalCarried > 0 && <> · carried <strong>{totalCarried}</strong> times</>}
      </p>
    </div>
  );
}

function CompactEntryRow({
  entry,
  profile,
  carried,
  starred,
  busy,
  onToggleStar,
}: {
  entry: BrowseEntry;
  profile?: PlatformProfile;
  carried: number;
  starred: boolean;
  busy: boolean;
  onToggleStar: (entry: BrowseEntry) => void;
}) {
  const copyUrl = `https://egregore.xyz/emissary/e/${entry.head_id}`;

  return (
    <article className="compact-entry">
      <a className="compact-title" href={`/${entry.address}`}>{entry.topic || entry.slug}</a>
      <span className="compact-meta">{kindLabel(entry.kind)} · @{entry.owner_handle}</span>
      <span className="compact-count"><IconRun /> {carried}</span>
      <button
        type="button"
        className={`star-action${starred ? " is-starred" : ""}`}
        aria-pressed={starred}
        aria-label={starred ? `Remove star for ${entry.address}` : `Star ${entry.address}`}
        disabled={busy}
        onClick={() => onToggleStar(entry)}
      >
        <IconStar />
      </button>
      <CopyButton value={copyUrl} label="Copy" />
      {profile?.verified && <span className="compact-verified" title="verified">✓</span>}
    </article>
  );
}

function LoopRail() {
  return (
    <section className="loop-rail" aria-label="Emissary loop">
      <div>
        <span>01</span>
        <h2>Star on the web</h2>
        <p>The directory is for discovery. A star pins the version you evaluated.</p>
      </div>
      <div>
        <span>02</span>
        <h2>Pull in terminal</h2>
        <p>Your harness reads the collection and offers each emissary to run or install.</p>
      </div>
      <div>
        <span>03</span>
        <h2>Publish from harness</h2>
        <p>Composition stays agent-conducted. The web receives the address.</p>
      </div>
    </section>
  );
}

function CreateStrip() {
  return (
    <section className="create-strip">
      <div>
        <span className="rail-label">Create from the harness</span>
        <h2>Composition stays with the agent.</h2>
        <p>The web keeps discovery, identity, stars, and account state. The harness shapes and publishes the address.</p>
      </div>
      <CommandCapsule command={NEW_COMMAND} compact />
    </section>
  );
}

export default function EmissaryHub() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [entries, setEntries] = useState<BrowseEntry[]>([]);
  const [categories, setCategories] = useState<BrowseCategory[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PlatformProfile>>({});
  const [uses, setUses] = useState<Record<string, number>>({});
  const [session, setSession] = useState<Session | null>(null);
  const [stars, setStars] = useState<Star[] | null>(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("carried");
  const [busyStar, setBusyStar] = useState<string | null>(null);
  const [starNote, setStarNote] = useState("");
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getSession()
      .then((s) => {
        if (cancelled) return;
        setSession(s);
        setAuthState("signed-in");
        listStars()
          .then((res) => {
            if (!cancelled) setStars(res.stars || []);
          })
          .catch(() => {
            if (!cancelled) setStars([]);
          });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof NotSignedIn) {
          setAuthState("signed-out");
          setStars([]);
          return;
        }
        setAuthState("signed-out");
        setStars([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchBrowse()
      .then((res) => {
        if (cancelled) return;
        const nextEntries = res.entries || [];
        setEntries(nextEntries);
        setCategories(res.categories || []);
        setLoadState("ready");

        const ids = nextEntries.map((entry) => entry.head_id).filter(Boolean);
        if (ids.length > 0) {
          fetchUsage(ids)
            .then((counts) => {
              if (!cancelled) setUses(counts);
            })
            .catch(() => {
              if (!cancelled) setUses({});
            });
        }

        Array.from(new Set(nextEntries.map((entry) => entry.owner_handle))).forEach((handle) => {
          fetchProfile(handle)
            .then((profile) => {
              if (!cancelled) setProfiles((prev) => ({ ...prev, [handle]: profile }));
            })
            .catch(() => {
              /* author badge falls back to the handle */
            });
        });
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const starred = useMemo(() => new Set((stars || []).map(starKey)), [stars]);

  const visibleEntries = useMemo(() => {
    const categoryActive = entries.some((entry) => entry.category === filter);
    const filtered = filter === "all"
      ? entries
      : entries.filter((entry) => categoryActive ? entry.category === filter : entry.kind === filter);

    return [...filtered].sort((a, b) => {
      if (sort === "carried") return (uses[b.head_id] ?? 0) - (uses[a.head_id] ?? 0);
      if (sort === "stars") return b.stars - a.stars;
      const ta = a.updated_at || a.created_at || "";
      const tb = b.updated_at || b.created_at || "";
      return tb.localeCompare(ta);
    });
  }, [entries, filter, sort, uses]);

  const defaultView = filter === "all" && sort === "carried";
  const sortLabel = SORTS.find((item) => item.key === sort)?.label.toLowerCase() || "most carried";
  const featuredEntries = useMemo(() => {
    if (!defaultView) return [];
    return [...entries].sort((a, b) => b.stars - a.stars).slice(0, 3);
  }, [defaultView, entries]);
  const featuredKeys = useMemo(() => new Set(featuredEntries.map(entryKey)), [featuredEntries]);
  const gridEntries = useMemo(() => (
    defaultView
      ? visibleEntries.filter((entry) => !featuredKeys.has(entryKey(entry)))
      : visibleEntries
  ), [defaultView, featuredKeys, visibleEntries]);
  const showSparseCell = loadState === "ready" && entries.length > 0 && entries.length <= 6 && visibleEntries.length > 0;

  const toggleStar = useCallback(async (entry: BrowseEntry) => {
    if (!session) {
      setSignInOpen(true);
      return;
    }

    const key = entryKey(entry);
    const wasStarred = starred.has(key);
    setBusyStar(key);
    setStarNote("");

    setEntries((current) => current.map((item) => (
      entryKey(item) === key
        ? { ...item, stars: Math.max(0, item.stars + (wasStarred ? -1 : 1)) }
        : item
    )));

    setStars((current) => {
      const list = current || [];
      if (wasStarred) return list.filter((item) => starKey(item) !== key);
      return [{
        address: entry.address,
        owner: entry.owner_handle,
        slug: entry.slug,
        mode: "pin",
        resolved_id: entry.head_id,
        kind: entry.kind,
        topic: entry.topic,
        summary: entry.summary,
        version: entry.version,
      }, ...list];
    });

    try {
      if (wasStarred) {
        await unstar(entry.owner_handle, entry.slug);
      } else {
        await starEmissary(entry.owner_handle, entry.slug, "pin");
        setStarNote("Added. Run emissary pull in your terminal when you want to bring it in.");
      }
    } catch (err) {
      setStarNote(err instanceof Error ? err.message : "Couldn't update that star.");
      fetchBrowse().then((res) => setEntries(res.entries || [])).catch(() => undefined);
      listStars().then((res) => setStars(res.stars || [])).catch(() => undefined);
    } finally {
      setBusyStar(null);
    }
  }, [session, starred]);

  return (
    <div className="em-hub meridian">
      <main className="em-main">
        <section id="directory" className="directory-section">
          {loadState === "ready" && entries.length > 0 && (
            <div className="directory-controls">
              <FilterRail entries={entries} categories={categories} filter={filter} setFilter={setFilter} />
              <div className="sortrow">
                <span>sort</span>
                <div className="dir-sort" role="group" aria-label="Sort">
                  {SORTS.map((item) => (
                    <button key={item.key} type="button" aria-pressed={sort === item.key} onClick={() => setSort(item.key)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {starNote && <p className="star-note">{starNote}</p>}
          {loadState === "loading" && <p className="dir-note">Loading the directory…</p>}
          {loadState === "error" && <p className="dir-note">The directory could not be reached. Try again in a moment.</p>}
          {loadState === "ready" && entries.length === 0 && (
            <div className="dir-empty">
              <h2>The directory is quiet.</h2>
              <p>Published emissaries will appear here as named addresses. Create the first from your harness.</p>
              <CommandCapsule command={NEW_COMMAND} compact />
            </div>
          )}
          {loadState === "ready" && entries.length > 0 && visibleEntries.length === 0 && (
            <p className="dir-note">Nothing in this lane yet. Try another filter.</p>
          )}

          {defaultView && featuredEntries.length > 0 && (
            <div className="dir-block">
              <span className="featlabel">featured</span>
              <div className="featured-strip" aria-label="Featured emissaries">
                {featuredEntries.map((entry) => (
                  <DirectoryCard
                    key={entryKey(entry)}
                    entry={entry}
                    profile={profiles[entry.owner_handle]}
                    carried={uses[entry.head_id] ?? 0}
                    starred={starred.has(entryKey(entry))}
                    busy={busyStar === entryKey(entry)}
                    onToggleStar={toggleStar}
                  />
                ))}
              </div>
            </div>
          )}

          {(gridEntries.length > 0 || showSparseCell) && (
            <div className="dir-block">
              <span className="featlabel">{sortLabel}</span>
              <div className="directory-grid" aria-label={`${sortLabel} emissaries`}>
                {gridEntries.map((entry) => (
                  <DirectoryCard
                    key={entryKey(entry)}
                    entry={entry}
                    profile={profiles[entry.owner_handle]}
                    carried={uses[entry.head_id] ?? 0}
                    starred={starred.has(entryKey(entry))}
                    busy={busyStar === entryKey(entry)}
                    onToggleStar={toggleStar}
                  />
                ))}
                {showSparseCell && (
                  <div className="growth-cell">
                    <strong>{entries.length}</strong> emissaries and counting
                    <span>new ones land here first</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </div>
  );
}
