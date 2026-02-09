import { useState, useEffect } from "react";
import { exchangeCode, getOrgs, getOrgRepos, setupOrg, joinOrg, getTelegramStatus, getInviteInfo, acceptInvite, getGitHubAuthUrl } from "../api";

const C = {
  parchment: "#F4F1EA",
  ink: "#1a1714",
  crimson: "#7A0F1B",
  muted: "#8a8578",
  warmGray: "#d4cfc5",
};

const font = {
  serif: { fontFamily: "'Cormorant Garamond', serif" },
  mono: { fontFamily: "'Space Mono', monospace" },
};

const GitHubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8, flexShrink: 0 }}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const API_URL = import.meta.env.VITE_API_URL || "https://egregore-production-55f2.up.railway.app";

function InstallCommand({ setupToken, label = "Install" }) {
  const [method, setMethod] = useState("npx"); // npx or curl
  const [copied, setCopied] = useState(false);

  const npxCmd = `npx create-egregore@latest --token ${setupToken}`;
  const curlCmd = `curl -fsSL ${API_URL}/api/org/install/${setupToken} | bash`;
  const cmd = method === "npx" ? npxCmd : curlCmd;

  const handleCopy = () => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ marginBottom: "2.5rem" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <p style={{ ...font.mono, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "2px", color: C.muted, margin: 0 }}>
          {label}
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {["npx", "curl"].map((m) => (
            <button
              key={m}
              onClick={() => { setMethod(m); setCopied(false); }}
              style={{
                ...font.mono, fontSize: "0.6rem", background: "none", border: "none",
                color: method === m ? C.crimson : C.muted,
                cursor: "pointer", padding: 0,
                borderBottom: method === m ? `1px solid ${C.crimson}` : "1px solid transparent",
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        background: C.ink, padding: "1rem 1.25rem", borderRadius: 0,
      }}>
        <code style={{ ...font.mono, fontSize: "0.75rem", color: C.parchment, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {cmd}
        </code>
        <button
          onClick={handleCopy}
          style={{
            background: "none", border: `1px solid rgba(244,241,234,0.2)`,
            color: C.parchment, padding: "0.4rem 0.6rem", cursor: "pointer",
            display: "flex", alignItems: "center", gap: "0.4rem",
            ...font.mono, fontSize: "0.65rem",
            transition: "border-color 0.2s",
          }}
        >
          {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
        </button>
      </div>
      <p style={{ ...font.mono, fontSize: "0.65rem", color: C.muted, marginTop: "0.5rem" }}>
        {method === "npx"
          ? "Paste in your terminal. Takes ~5 seconds."
          : "No Node.js needed. Paste in your terminal."
        }
      </p>
    </div>
  );
}

// ─── Stages ─────────────────────────────────────────────────────

function OAuthCallback({ onAuth }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      setError("No authorization code received");
      return;
    }

    exchangeCode(code)
      .then(({ github_token, user }) => {
        window.history.replaceState({}, "", "/setup");
        onAuth(github_token, user);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ ...font.mono, color: C.crimson, marginBottom: "1rem" }}>{error}</p>
        <a href="/" style={{ ...font.mono, fontSize: "0.8rem", color: C.ink }}>Try again</a>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", padding: "4rem" }}>
      <Spinner />
      <p style={{ ...font.mono, fontSize: "0.8rem", color: C.muted, marginTop: "1rem" }}>Authenticating with GitHub...</p>
    </div>
  );
}

function OrgPicker({ token, user, onPick }) {
  const [orgs, setOrgs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getOrgs(token)
      .then((data) => { setOrgs(data); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [token]);

  if (loading) return <div style={{ textAlign: "center", padding: "3rem" }}><Spinner /><p style={{ ...font.mono, fontSize: "0.8rem", color: C.muted, marginTop: "1rem" }}>Checking your organizations...</p></div>;
  if (error) return <div style={{ textAlign: "center", padding: "3rem" }}><p style={{ ...font.mono, color: C.crimson }}>{error}</p></div>;
  if (!orgs) return null;

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "2rem" }}>
      <p style={{ ...font.mono, fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.5rem", textAlign: "center" }}>
        Signed in as
      </p>
      <p style={{ ...font.serif, fontSize: "1.3rem", textAlign: "center", marginBottom: "2.5rem" }}>
        {user.name || user.login}
      </p>

      <p style={{ ...font.serif, fontSize: "1.1rem", textAlign: "center", marginBottom: "2rem", color: C.muted }}>
        Where should we set up Egregore?
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {orgs.orgs.map((org) => (
          <OrgButton
            key={org.login}
            name={org.name || org.login}
            login={org.login}
            hasEgregore={org.has_egregore}
            isMember={org.is_member}
            instanceCount={(org.instances || []).length}
            onClick={() => onPick({ ...org, is_personal: false, instances: org.instances || [] })}
          />
        ))}
        <OrgButton
          name={`${orgs.user.login} (personal)`}
          login={orgs.user.login}
          hasEgregore={orgs.personal.has_egregore}
          isMember={orgs.personal.is_member}
          instanceCount={(orgs.personal.instances || []).length}
          onClick={() => onPick({
            login: orgs.user.login,
            has_egregore: orgs.personal.has_egregore,
            is_personal: true,
            instances: orgs.personal.instances || [],
          })}
        />
      </div>
    </div>
  );
}

function OrgButton({ name, login, hasEgregore, isMember, instanceCount, onClick }) {
  const [hovered, setHovered] = useState(false);
  const label = hasEgregore
    ? (instanceCount > 1 ? `${instanceCount} instances` : instanceCount === 1 ? "1 instance" : "Join")
    : "Set up";
  const color = hasEgregore ? "#2d8a4e" : C.crimson;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        width: "100%", padding: "1rem 1.5rem",
        background: hovered ? "rgba(122,15,27,0.04)" : "transparent",
        border: `1px solid ${hovered ? C.crimson : C.warmGray}`,
        cursor: "pointer", transition: "all 0.2s",
        textAlign: "left",
      }}
    >
      <span style={{ ...font.serif, fontSize: "1.05rem", color: C.ink }}>{name}</span>
      <span style={{
        ...font.mono, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "1px",
        color,
        border: `1px solid ${color}`,
        padding: "0.2rem 0.6rem",
      }}>
        {label}
      </span>
    </button>
  );
}

function InstancePicker({ org, onJoin, onNew }) {
  const instances = org.instances || [];

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "2rem" }}>
      <p style={{ ...font.mono, fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.5rem", textAlign: "center" }}>
        {org.name || org.login}
      </p>
      <p style={{ ...font.serif, fontSize: "1.1rem", textAlign: "center", marginBottom: "2rem", color: C.muted }}>
        Which instance do you want to join?
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
        {instances.map((inst) => (
          <InstanceButton key={inst.repo_name} instance={inst} onClick={() => onJoin(inst)} />
        ))}
      </div>

      <div style={{ textAlign: "center" }}>
        <button
          onClick={onNew}
          style={{
            ...font.mono, fontSize: "0.75rem", color: C.crimson,
            background: "none", border: `1px solid ${C.crimson}`,
            padding: "0.6rem 1.5rem", cursor: "pointer",
          }}
        >
          + Create new instance
        </button>
      </div>
    </div>
  );
}

function InstanceButton({ instance, onClick }) {
  const [hovered, setHovered] = useState(false);
  const { repo_name, org_name, repos } = instance;
  const repoList = repos && repos.length > 0 ? repos.join(", ") : null;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column", gap: "0.3rem",
        width: "100%", padding: "1rem 1.5rem",
        background: hovered ? "rgba(122,15,27,0.04)" : "transparent",
        border: `1px solid ${hovered ? C.crimson : C.warmGray}`,
        cursor: "pointer", transition: "all 0.2s", textAlign: "left",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <span style={{ ...font.mono, fontSize: "0.95rem", color: C.ink }}>
          {repo_name}
        </span>
        <span style={{
          ...font.mono, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "1px",
          color: "#2d8a4e", border: `1px solid #2d8a4e`, padding: "0.2rem 0.6rem",
        }}>
          Join
        </span>
      </div>
      {(org_name || repoList) && (
        <span style={{ ...font.mono, fontSize: "0.65rem", color: C.muted }}>
          {org_name}{repoList ? ` · ${repoList}` : ""}
        </span>
      )}
    </button>
  );
}

function RepoPicker({ token, org, onPick }) {
  const [repos, setRepos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    getOrgRepos(token, org.login)
      .then((data) => { setRepos(data.repos || []); setLoading(false); })
      .catch(() => { setRepos([]); setLoading(false); });
  }, [token, org.login]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem" }}>
        <Spinner />
        <p style={{ ...font.mono, fontSize: "0.8rem", color: C.muted, marginTop: "1rem" }}>Loading repos...</p>
      </div>
    );
  }

  if (repos.length === 0) {
    // No repos to pick — skip straight to setup
    return (
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "2rem", textAlign: "center" }}>
        <p style={{ ...font.serif, fontSize: "1.1rem", color: C.muted, marginBottom: "2rem" }}>
          No repos found — setting up collaboration-only mode.
        </p>
        <button
          onClick={() => onPick([])}
          style={{
            ...font.mono, fontSize: "0.8rem",
            background: C.ink, color: C.parchment,
            border: "none", padding: "0.75rem 2rem", cursor: "pointer",
          }}
        >
          Continue
        </button>
      </div>
    );
  }

  const toggle = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === repos.length) setSelected(new Set());
    else setSelected(new Set(repos.map((r) => r.name)));
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "2rem" }}>
      <p style={{ ...font.mono, fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.5rem", textAlign: "center" }}>
        Setting up {org.name || org.login}
      </p>
      <p style={{ ...font.serif, fontSize: "1.1rem", textAlign: "center", marginBottom: "0.5rem" }}>
        Which repos should Egregore manage?
      </p>
      <p style={{ ...font.mono, fontSize: "0.7rem", color: C.muted, textAlign: "center", marginBottom: "2rem" }}>
        Select repos for shared context. You can add more later.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {repos.map((repo) => {
          const isSelected = selected.has(repo.name);
          return (
            <button
              key={repo.name}
              onClick={() => toggle(repo.name)}
              style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                width: "100%", padding: "0.75rem 1rem",
                background: isSelected ? "rgba(122,15,27,0.04)" : "transparent",
                border: `1px solid ${isSelected ? C.crimson : C.warmGray}`,
                cursor: "pointer", transition: "all 0.2s", textAlign: "left",
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 3, flexShrink: 0,
                border: `1.5px solid ${isSelected ? C.crimson : C.warmGray}`,
                background: isSelected ? C.crimson : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ ...font.mono, fontSize: "0.85rem", color: C.ink }}>{repo.name}</span>
                {repo.language && (
                  <span style={{ ...font.mono, fontSize: "0.6rem", color: C.muted, marginLeft: "0.5rem" }}>
                    {repo.language}
                  </span>
                )}
                {repo.description && (
                  <p style={{ ...font.mono, fontSize: "0.65rem", color: C.muted, margin: "0.2rem 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {repo.description}
                  </p>
                )}
              </div>
              {repo.private && (
                <span style={{ ...font.mono, fontSize: "0.55rem", color: C.muted, border: `1px solid ${C.warmGray}`, padding: "0.1rem 0.4rem" }}>
                  private
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={toggleAll}
          style={{ ...font.mono, fontSize: "0.65rem", color: C.muted, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          {selected.size === repos.length ? "Deselect all" : "Select all"}
        </button>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={() => onPick([])}
            style={{ ...font.mono, fontSize: "0.75rem", color: C.muted, background: "none", border: `1px solid ${C.warmGray}`, padding: "0.6rem 1.25rem", cursor: "pointer" }}
          >
            Skip
          </button>
          <button
            onClick={() => onPick([...selected])}
            style={{
              ...font.mono, fontSize: "0.75rem",
              background: C.ink, color: C.parchment,
              border: "none", padding: "0.6rem 1.25rem", cursor: "pointer",
            }}
          >
            Continue{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function SetupProgress({ token, user, org, repos = [], joinRepoName }) {
  const [status, setStatus] = useState("working"); // working, done, error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [telegramConnected, setTelegramConnected] = useState(false);

  useEffect(() => {
    const action = org.has_egregore
      ? joinOrg(token, { github_org: org.login, repo_name: joinRepoName || "egregore-core" })
      : setupOrg(token, {
          github_org: org.login,
          org_name: org.name || org.login,
          is_personal: org.is_personal || false,
          repos,
        });

    action
      .then((data) => { setResult(data); setStatus("done"); })
      .catch((err) => { setError(err.message); setStatus("error"); });
  }, []);

  // Poll telegram status after setup
  useEffect(() => {
    if (!result?.org_slug) return;
    const id = setInterval(async () => {
      try {
        const s = await getTelegramStatus(result.org_slug);
        if (s.connected) { setTelegramConnected(true); clearInterval(id); }
      } catch {}
    }, 3000);
    return () => clearInterval(id);
  }, [result?.org_slug]);

  if (status === "working") {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <Spinner />
        <p style={{ ...font.serif, fontSize: "1.2rem", marginTop: "1.5rem" }}>
          {org.has_egregore ? "Joining" : "Setting up Egregore for"} {org.name || org.login}...
        </p>
        <p style={{ ...font.mono, fontSize: "0.7rem", color: C.muted, marginTop: "0.5rem" }}>
          {org.has_egregore ? "Verifying access" : "Creating repo, setting up memory, bootstrapping graph"}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <p style={{ ...font.mono, fontSize: "0.85rem", color: C.crimson, marginBottom: "1rem" }}>{error}</p>
        <a href="/setup" style={{ ...font.mono, fontSize: "0.8rem", color: C.ink }}>Try again</a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "2rem" }}>
      {/* Success header */}
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#2d8a4e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h2 style={{ ...font.serif, fontSize: "1.8rem", fontWeight: 400, marginBottom: "0.5rem" }}>
          Egregore is ready for {org.name || org.login}
        </h2>
      </div>

      {/* Step 1: Install command */}
      <InstallCommand setupToken={result.setup_token} label="Step 1 — Install" />

      {/* Step 2: Telegram — setup flow (add bot) or join flow (join group) */}
      {(result.telegram_invite_link || result.telegram_group_link) && (
        <div style={{ marginBottom: "2.5rem" }}>
          <p style={{ ...font.mono, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "2px", color: C.muted, marginBottom: "0.75rem" }}>
            Step 2 — {result.telegram_group_link ? "Join Telegram" : `Connect Telegram ${telegramConnected ? "" : "(optional)"}`}
          </p>
          {telegramConnected ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#2d8a4e", ...font.mono, fontSize: "0.85rem" }}>
              <CheckIcon /> Telegram connected
            </div>
          ) : (
            <a
              href={result.telegram_group_link || result.telegram_invite_link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...font.mono, fontSize: "0.8rem",
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                color: C.crimson, textDecoration: "none",
                border: `1px solid ${C.crimson}`, padding: "0.65rem 1.25rem",
                transition: "all 0.2s",
              }}
            >
              {result.telegram_group_link ? "Join the Telegram group" : "Add bot to your group"}
            </a>
          )}
        </div>
      )}

      {/* What's next */}
      <div style={{ borderTop: `1px solid ${C.warmGray}`, paddingTop: "1.5rem" }}>
        <p style={{ ...font.mono, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "2px", color: C.muted, marginBottom: "0.75rem" }}>
          After install
        </p>
        <p style={{ ...font.serif, fontSize: "1rem", color: "#5a5650", lineHeight: 1.7 }}>
          Type <code style={{ ...font.mono, fontSize: "0.85rem", color: C.crimson }}>egregore</code> in any terminal to launch. Your shared memory, graph, and notifications are all connected.
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 32, height: 32, border: `2px solid ${C.warmGray}`, borderTopColor: C.crimson,
      borderRadius: "50%", margin: "0 auto",
      animation: "spin 0.8s linear infinite",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Invite Flow Components ─────────────────────────────────────

function InviteLanding({ inviteToken, onAuth }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getInviteInfo(inviteToken)
      .then(setInfo)
      .catch((err) => setError(err.message));
  }, [inviteToken]);

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <p style={{ ...font.serif, fontSize: "1.3rem", marginBottom: "1rem" }}>Invite not found</p>
        <p style={{ ...font.mono, fontSize: "0.8rem", color: C.muted, marginBottom: "2rem" }}>
          This invite may have expired or already been used.
        </p>
        <a href="/" style={{ ...font.mono, fontSize: "0.8rem", color: C.crimson }}>Go to egregore.org</a>
      </div>
    );
  }

  if (!info) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <Spinner />
        <p style={{ ...font.mono, fontSize: "0.8rem", color: C.muted, marginTop: "1rem" }}>Loading invite...</p>
      </div>
    );
  }

  // Store invite token in sessionStorage so we can recover it after OAuth redirect
  sessionStorage.setItem("egregore_invite", inviteToken);

  const authUrl = getGitHubAuthUrl();

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: "2rem", textAlign: "center" }}>
      <p style={{ ...font.mono, fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.5rem" }}>
        You've been invited
      </p>
      <h2 style={{ ...font.serif, fontSize: "1.8rem", fontWeight: 400, marginBottom: "0.5rem" }}>
        Join {info.org_name}
      </h2>
      <p style={{ ...font.mono, fontSize: "0.8rem", color: C.muted, marginBottom: "2.5rem" }}>
        Invited by {info.invited_by}
      </p>

      <a
        href={authUrl}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          ...font.mono, fontSize: "0.85rem",
          background: C.ink, color: C.parchment,
          padding: "0.85rem 2rem", textDecoration: "none",
          border: "none", cursor: "pointer",
          transition: "opacity 0.2s",
        }}
      >
        <GitHubIcon /> Join with GitHub
      </a>

      <p style={{ ...font.mono, fontSize: "0.65rem", color: C.muted, marginTop: "1.5rem" }}>
        You'll authorize with GitHub, then get a one-line install command.
      </p>
    </div>
  );
}

function InviteAccept({ token, user, inviteToken }) {
  const [status, setStatus] = useState("working"); // working, done, pending_github, error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const doAccept = () => {
    setStatus("working");
    setError(null);
    acceptInvite(token, inviteToken)
      .then((data) => {
        if (data.status === "pending_github") {
          setStatus("pending_github");
          setResult(data);
        } else {
          setResult(data);
          setStatus("done");
        }
      })
      .catch((err) => { setError(err.message); setStatus("error"); });
  };

  useEffect(() => { doAccept(); }, []);

  if (status === "working") {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <Spinner />
        <p style={{ ...font.serif, fontSize: "1.2rem", marginTop: "1.5rem" }}>
          Joining...
        </p>
        <p style={{ ...font.mono, fontSize: "0.7rem", color: C.muted, marginTop: "0.5rem" }}>
          Verifying access and setting up your account
        </p>
      </div>
    );
  }

  if (status === "pending_github") {
    // Auto-retry after a short delay — the invite may just need a moment to propagate
    setTimeout(doAccept, 3000);
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <Spinner />
        <p style={{ ...font.serif, fontSize: "1.2rem", marginTop: "1.5rem" }}>
          Setting up your access...
        </p>
        <p style={{ ...font.mono, fontSize: "0.7rem", color: C.muted, marginTop: "0.5rem" }}>
          Waiting for GitHub to process the invitation
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <p style={{ ...font.mono, fontSize: "0.85rem", color: C.crimson, marginBottom: "1rem" }}>{error}</p>
        <button onClick={doAccept} style={{ ...font.mono, fontSize: "0.8rem", color: C.ink, background: "none", border: `1px solid ${C.warmGray}`, padding: "0.5rem 1rem", cursor: "pointer" }}>
          Try again
        </button>
      </div>
    );
  }

  // Success — show install command
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "2rem" }}>
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#2d8a4e", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h2 style={{ ...font.serif, fontSize: "1.8rem", fontWeight: 400, marginBottom: "0.5rem" }}>
          Welcome to {result.org_name}
        </h2>
      </div>

      <InstallCommand setupToken={result.setup_token} />

      {/* Telegram group link */}
      {result.telegram_group_link && (
        <div style={{ marginBottom: "2.5rem" }}>
          <p style={{ ...font.mono, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "2px", color: C.muted, marginBottom: "0.75rem" }}>
            Telegram
          </p>
          <a
            href={result.telegram_group_link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...font.mono, fontSize: "0.8rem",
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              color: C.crimson, textDecoration: "none",
              border: `1px solid ${C.crimson}`, padding: "0.65rem 1.25rem",
              transition: "all 0.2s",
            }}
          >
            Join the Telegram group
          </a>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${C.warmGray}`, paddingTop: "1.5rem" }}>
        <p style={{ ...font.mono, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "2px", color: C.muted, marginBottom: "0.75rem" }}>
          After install
        </p>
        <p style={{ ...font.serif, fontSize: "1rem", color: "#5a5650", lineHeight: 1.7 }}>
          Type <code style={{ ...font.mono, fontSize: "0.85rem", color: C.crimson }}>egregore</code> in any terminal to launch.
        </p>
      </div>
    </div>
  );
}

// ─── Main Setup Flow ────────────────────────────────────────────

export default function SetupFlow() {
  const [githubToken, setGithubToken] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedRepos, setSelectedRepos] = useState(null); // null = not picked yet, [] = skipped
  const [joinInstance, setJoinInstance] = useState(null); // instance to join (from instance picker)
  const [creatingNew, setCreatingNew] = useState(false); // user chose "Create new instance"

  const isCallback = window.location.pathname === "/callback";
  const isJoin = window.location.pathname === "/join";
  const params = new URLSearchParams(window.location.search);
  const inviteToken = params.get("invite") || sessionStorage.getItem("egregore_invite");

  // Invite flow: /join?invite=inv_xxx
  if (isJoin && inviteToken && !githubToken) {
    return (
      <SetupLayout>
        <InviteLanding inviteToken={inviteToken} />
      </SetupLayout>
    );
  }

  // Callback from OAuth — check if this is an invite flow returning
  if (isCallback && !githubToken) {
    return (
      <SetupLayout>
        <OAuthCallback onAuth={(token, user) => {
          setGithubToken(token);
          setUser(user);
          // If returning from invite flow, redirect to /join
          const savedInvite = sessionStorage.getItem("egregore_invite");
          if (savedInvite) {
            window.history.replaceState({}, "", `/join?invite=${savedInvite}`);
          } else {
            window.history.replaceState({}, "", "/setup");
          }
        }} />
      </SetupLayout>
    );
  }

  // Invite accept (after OAuth callback returns)
  if (githubToken && inviteToken) {
    // Clear the stored invite token
    sessionStorage.removeItem("egregore_invite");
    return (
      <SetupLayout>
        <InviteAccept token={githubToken} user={user} inviteToken={inviteToken} />
      </SetupLayout>
    );
  }

  // Org picker (regular setup flow)
  if (githubToken && !selectedOrg) {
    return (
      <SetupLayout>
        <OrgPicker token={githubToken} user={user} onPick={setSelectedOrg} />
      </SetupLayout>
    );
  }

  // Instance picker (org has existing instances — let user join one or create new)
  if (githubToken && selectedOrg && selectedOrg.has_egregore && !joinInstance && !creatingNew) {
    return (
      <SetupLayout>
        <InstancePicker
          org={selectedOrg}
          onJoin={(inst) => setJoinInstance(inst)}
          onNew={() => setCreatingNew(true)}
        />
      </SetupLayout>
    );
  }

  // Joining a specific instance
  if (githubToken && selectedOrg && joinInstance) {
    return (
      <SetupLayout>
        <SetupProgress
          token={githubToken}
          user={user}
          org={{ ...selectedOrg, has_egregore: true }}
          joinRepoName={joinInstance.repo_name}
        />
      </SetupLayout>
    );
  }

  // Repo picker (for new setup or creating new instance in existing org)
  if (githubToken && selectedOrg && selectedRepos === null) {
    return (
      <SetupLayout>
        <RepoPicker token={githubToken} org={selectedOrg} onPick={setSelectedRepos} />
      </SetupLayout>
    );
  }

  // Setup in progress / complete
  if (githubToken && selectedOrg) {
    return (
      <SetupLayout>
        <SetupProgress token={githubToken} user={user} org={selectedOrg} repos={selectedRepos || []} />
      </SetupLayout>
    );
  }

  // Fallback — shouldn't reach here normally
  return (
    <SetupLayout>
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p style={{ ...font.serif, fontSize: "1.2rem", marginBottom: "1rem" }}>Let's get you set up.</p>
        <a href="/" style={{ ...font.mono, fontSize: "0.8rem", color: C.crimson }}>Start from the beginning</a>
      </div>
    </SetupLayout>
  );
}

function SetupLayout({ children }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center",
      background: C.parchment, padding: "2rem",
    }}>
      <a href="/" style={{ ...{ fontFamily: "'UnifrakturMaguntia', cursive" }, fontSize: "2rem", color: C.crimson, textDecoration: "none", marginBottom: "3rem" }}>
        Egregore
      </a>
      <div style={{
        width: "100%", maxWidth: 600,
        border: `1px solid ${C.warmGray}`,
        background: "rgba(255,255,255,0.3)",
        padding: "1rem",
      }}>
        {children}
      </div>
      <p style={{ ...font.mono, fontSize: "0.6rem", color: C.muted, marginTop: "2rem" }}>
        Terminal: <code>npx create-egregore</code> or <code>curl</code> (no Node.js needed)
      </p>
    </div>
  );
}
