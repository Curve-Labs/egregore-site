import { useState, useEffect, useCallback, useRef } from "react";
import { C, font } from "./tokens";
import { getGitHubAuthUrl, exchangeCode, getMyEgregores, removeMember, ensureWorkspace, getWorkspaceStatus, enableHosting, getHostingStatus, deleteOrg, getUserKeys, updateUserKeys } from "./api";

// ─── Shared styles ─────────────────────────────────────────────────

const s = {
  page: {
    background: C.termBg,
    minHeight: "100vh",
    color: C.parchment,
    ...font.mono,
    fontSize: 13,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    borderBottom: `1px solid rgba(200,165,90,0.2)`,
  },
  headerTitle: {
    ...font.ibmPlex,
    fontSize: 14,
    fontWeight: 700,
    color: C.gold,
    letterSpacing: 2,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    fontSize: 12,
    color: C.muted,
  },
  btn: {
    background: "none",
    border: `1px solid rgba(200,165,90,0.3)`,
    color: C.parchment,
    ...font.mono,
    fontSize: 11,
    padding: "4px 12px",
    cursor: "pointer",
  },
  content: {
    padding: 24,
    maxWidth: 1000,
    margin: "0 auto",
  },
  card: {
    border: `1px solid rgba(200,165,90,0.2)`,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    ...font.ibmPlex,
    fontSize: 12,
    fontWeight: 700,
    color: C.gold,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionTitle: {
    ...font.ibmPlex,
    fontSize: 11,
    fontWeight: 700,
    color: C.muted,
    marginTop: 16,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
  th: {
    textAlign: "left",
    padding: "6px 10px",
    borderBottom: `1px solid rgba(200,165,90,0.3)`,
    color: C.gold,
    fontWeight: 700,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  td: {
    padding: "6px 10px",
    borderBottom: `1px solid rgba(200,165,90,0.08)`,
  },
  dot: (color) => ({
    display: "inline-block",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: color,
    marginRight: 6,
  }),
  badge: (severity) => ({
    display: "inline-block",
    fontSize: 10,
    padding: "2px 6px",
    border: `1px solid ${severity === "critical" ? C.crimson : severity === "warning" ? C.gold : C.muted}`,
    color: severity === "critical" ? C.crimson : severity === "warning" ? C.gold : C.muted,
    marginRight: 4,
    marginBottom: 2,
  }),
  roleBadge: (role) => ({
    display: "inline-block",
    fontSize: 10,
    padding: "1px 6px",
    border: `1px solid ${role === "admin" ? C.gold : "rgba(200,165,90,0.3)"}`,
    color: role === "admin" ? C.gold : C.muted,
    marginLeft: 8,
  }),
  keyBox: {
    background: "rgba(200,165,90,0.05)",
    border: `1px solid rgba(200,165,90,0.15)`,
    padding: "8px 12px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  copyBtn: {
    background: "none",
    border: `1px solid rgba(200,165,90,0.3)`,
    color: C.gold,
    ...font.mono,
    fontSize: 10,
    padding: "2px 8px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  alertBar: {
    background: "rgba(122,15,27,0.1)",
    border: `1px solid rgba(122,15,27,0.4)`,
    padding: "10px 16px",
    marginBottom: 16,
    fontSize: 12,
    color: C.crimson,
  },
  fixBox: {
    background: "rgba(122,15,27,0.05)",
    border: `1px solid rgba(122,15,27,0.3)`,
    padding: 12,
    marginTop: 8,
    fontSize: 12,
  },
  codeBlock: {
    background: "rgba(0,0,0,0.3)",
    padding: "6px 10px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    marginTop: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    overflowX: "auto",
  },
  loginPage: {
    background: C.termBg,
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 24,
    color: C.parchment,
    ...font.mono,
  },
  loginBtn: {
    background: "none",
    border: `1px solid ${C.gold}`,
    color: C.gold,
    ...font.mono,
    fontSize: 13,
    padding: "10px 28px",
    cursor: "pointer",
    letterSpacing: 1,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return "\u2014";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      style={s.copyBtn}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

// ─── Auth Hook ────────────────────────────────────────────────────

function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem("dash_gh_token"));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dash_gh_user")); } catch { return null; }
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const url = new URL(window.location);
    const code = url.searchParams.get("code");
    if (code && !token) {
      setLoading(true);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      window.history.replaceState({}, "", url.pathname);

      exchangeCode(code)
        .then((data) => {
          const ghToken = data.github_token;
          const ghUser = data.user;
          localStorage.setItem("dash_gh_token", ghToken);
          localStorage.setItem("dash_gh_user", JSON.stringify(ghUser));
          setToken(ghToken);
          setUser(ghUser);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [token]);

  const logout = useCallback(() => {
    localStorage.removeItem("dash_gh_token");
    localStorage.removeItem("dash_gh_user");
    setToken(null);
    setUser(null);
  }, []);

  return { token, user, error, loading, logout };
}

// ─── Health Status Component ──────────────────────────────────────

function HealthStatus({ checkin }) {
  if (!checkin) return <span style={{ color: C.muted }}>No check-in yet</span>;

  const keyOk = checkin.key_valid !== false;
  const memOk = checkin.memory_linked !== false;
  const gitOk = checkin.git_synced !== false;
  const allOk = keyOk && memOk && gitOk;

  return (
    <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
      <span>
        <span style={s.dot(allOk ? "#4a4" : C.crimson)} />
        {allOk ? "Healthy" : "Issues detected"}
      </span>
      <span style={{ color: C.muted }}>
        Checked in {timeAgo(checkin.checked_in_at)}
      </span>
      {checkin.framework_version && (
        <span style={{ color: C.muted }}>v{checkin.framework_version}</span>
      )}
      {checkin.branch && (
        <span style={{ color: C.muted }}>{checkin.branch}</span>
      )}
    </div>
  );
}

// ─── Org Card ─────────────────────────────────────────────────────

function RemoveMemberDialog({ member, slug, token, onClose, onRemoved }) {
  const [mode, setMode] = useState("revoke");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await removeMember(token, slug, member.github_username, mode);
      onRemoved();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: C.termBg, border: `1px solid ${C.gold}`, borderRadius: 8,
        padding: 24, maxWidth: 420, width: "90%", ...font.mono, fontSize: 13,
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...font.ibmPlex, fontSize: 15, fontWeight: 700, color: C.gold, marginBottom: 16 }}>
          Remove {member.display_name || member.github_username}
        </div>
        <div style={{ color: C.parchment, marginBottom: 16 }}>
          This will remove <strong style={{ color: C.gold }}>{member.github_username}</strong> from <strong>{slug}</strong>.
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 12, color: C.parchment }}>
          <input type="radio" name="mode" value="revoke" checked={mode === "revoke"} onChange={() => setMode("revoke")}
            style={{ marginTop: 3 }} />
          <div>
            <div style={{ fontWeight: 600 }}>Revoke access only</div>
            <div style={{ fontSize: 11, color: C.muted }}>Remove GitHub access and deactivate membership. Keeps their contributions in the knowledge graph.</div>
          </div>
        </label>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 20, color: C.parchment }}>
          <input type="radio" name="mode" value="full" checked={mode === "full"} onChange={() => setMode("full")}
            style={{ marginTop: 3 }} />
          <div>
            <div style={{ fontWeight: 600 }}>Remove and delete their data</div>
            <div style={{ fontSize: 11, color: C.muted }}>Revoke access and erase their sessions, profile, and telemetry from the system.</div>
          </div>
        </label>

        {error && <div style={{ color: C.crimson, fontSize: 12, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={loading} style={{
            ...font.mono, background: "transparent", color: C.muted, border: `1px solid ${C.muted}`,
            padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 12,
          }}>Cancel</button>
          <button onClick={handleConfirm} disabled={loading} style={{
            ...font.mono, background: C.crimson, color: "#fff", border: "none",
            padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 12, opacity: loading ? 0.6 : 1,
          }}>{loading ? "Removing..." : "Remove"}</button>
        </div>
      </div>
    </div>
  );
}

function DeleteOrgDialog({ slug, token, onClose, onDeleted }) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await deleteOrg(token, slug);
      onDeleted();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: C.termBg, border: `1px solid ${C.crimson}`, borderRadius: 8,
        padding: 24, maxWidth: 420, width: "90%", ...font.mono, fontSize: 13,
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...font.ibmPlex, fontSize: 15, fontWeight: 700, color: C.crimson, marginBottom: 16 }}>
          Delete Egregore
        </div>
        <div style={{ color: C.parchment, marginBottom: 12 }}>
          This will permanently delete <strong style={{ color: C.gold }}>{slug}</strong> and all its data:
        </div>
        <ul style={{ color: C.muted, fontSize: 12, marginBottom: 16, paddingLeft: 20 }}>
          <li>All memberships</li>
          <li>API keys</li>
          <li>Telemetry and event data</li>
          <li>Graph node</li>
        </ul>
        <div style={{ color: C.muted, fontSize: 11, marginBottom: 16 }}>
          GitHub repos and memory repos are not deleted — remove those manually if needed.
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.parchment, marginBottom: 6 }}>
            Type <strong style={{ color: C.crimson }}>{slug}</strong> to confirm:
          </div>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={slug}
            style={{
              width: "100%", padding: "6px 10px", background: "rgba(0,0,0,0.3)",
              border: `1px solid rgba(200,165,90,0.2)`, color: C.parchment,
              ...font.mono, fontSize: 12, boxSizing: "border-box",
            }}
          />
        </div>
        {error && <div style={{ color: C.crimson, fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={loading} style={{
            ...font.mono, background: "transparent", color: C.muted, border: `1px solid ${C.muted}`,
            padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 12,
          }}>Cancel</button>
          <button onClick={handleDelete} disabled={loading || confirmText !== slug} style={{
            ...font.mono, background: C.crimson, color: "#fff", border: "none",
            padding: "6px 16px", borderRadius: 4, cursor: "pointer", fontSize: 12,
            opacity: (loading || confirmText !== slug) ? 0.4 : 1,
          }}>{loading ? "Deleting..." : "Delete forever"}</button>
        </div>
      </div>
    </div>
  );
}

function OrgCard({ org, token, currentUser, onRefresh }) {
  const [showKey, setShowKey] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);
  const [showDeleteOrg, setShowDeleteOrg] = useState(false);
  const [terminalLoading, setTerminalLoading] = useState(false);
  const [hostingState, setHostingState] = useState(null); // null | "enabling" | "provisioning" | "ready" | "error"
  const [hostingError, setHostingError] = useState(null);
  const [hostingIp, setHostingIp] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(null); // null = unknown, true/false
  const pollRef = useRef(null);
  const isAdmin = org.role === "admin";

  // Check if user has an API key on mount
  useEffect(() => {
    if (org.hosting_enabled && token) {
      getUserKeys(token).then((keys) => {
        setHasApiKey(!!(keys?.anthropic_api_key));
      }).catch(() => setHasApiKey(false));
    }
  }, [org.hosting_enabled, token]);

  // Clean up polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const handleEnableHosting = async () => {
    setHostingState("enabling");
    setHostingError(null);
    try {
      const res = await enableHosting(token, org.slug);
      setHostingIp(res.ip);
      setHostingState("provisioning");
      // Start polling for status
      pollRef.current = setInterval(async () => {
        try {
          const status = await getHostingStatus(token, org.slug);
          if (status.coder_ready) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setHostingState("ready");
            onRefresh && onRefresh();
          }
        } catch {}
      }, 10000);
    } catch (e) {
      setHostingState("error");
      setHostingError(e.message);
    }
  };

  const [provisioningStatus, setProvisioningStatus] = useState(null); // null | "provisioning" | "starting" | "ready" | "error"

  const launchWorkspace = async () => {
    // Open window synchronously in click handler to avoid popup blocker.
    // Any window.open after an await gets blocked by browsers.
    const w = window.open("", "_blank");
    setTerminalLoading(true);
    setProvisioningStatus("provisioning");
    try {
      const res = await ensureWorkspace(token, org.slug);
      const terminalUrl = res.terminal_url;

      if (res.status === "exists") {
        w.location.href = terminalUrl;
        setProvisioningStatus(null);
        setTerminalLoading(false);
        return;
      }

      // New workspace — poll for readiness
      setProvisioningStatus("starting");
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          const status = await getWorkspaceStatus(token, org.slug);
          if (status.ready) {
            w.location.href = terminalUrl;
            setProvisioningStatus(null);
            setTerminalLoading(false);
            return;
          }
        } catch {}
        await new Promise(r => setTimeout(r, 2000));
      }

      // Timeout — open anyway
      w.location.href = terminalUrl;
    } catch (e) {
      setProvisioningStatus("error");
      w.location.href = org.hosting_workspace_url || org.hosting_coder_url;
    } finally {
      setTerminalLoading(false);
      setTimeout(() => setProvisioningStatus(null), 3000);
    }
  };

  const openTerminal = async () => {
    // If we know they have a key, go straight to workspace
    if (hasApiKey) return launchWorkspace();
    // If unknown or no key, show auth modal
    setShowAuthModal(true);
  };

  const handleSaveKeyAndOpen = async () => {
    if (!apiKeyInput.trim()) return;
    setApiKeySaving(true);
    setApiKeyError(null);
    try {
      await updateUserKeys(token, { anthropic_api_key: apiKeyInput.trim() });
      setHasApiKey(true);
      setShowAuthModal(false);
      setApiKeyInput("");
      launchWorkspace();
    } catch (e) {
      setApiKeyError(e.message || "Failed to save key");
    } finally {
      setApiKeySaving(false);
    }
  };

  const handleMaxAuth = () => {
    // Max users authenticate inside Claude Code — just open the workspace
    setShowAuthModal(false);
    launchWorkspace();
  };

  return (
    <div style={s.card}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...font.ibmPlex, fontSize: 16, fontWeight: 700, color: C.gold }}>
              {org.slug}
            </span>
            <span style={s.roleBadge(org.role)}>{org.role}</span>
          </div>
          <span style={{ fontSize: 11, color: C.muted }}>
            {org.github_org}{org.name && org.name !== org.github_org ? ` · ${org.name}` : ""}
          </span>
        </div>
      </div>

      {/* Hosted: Open in browser */}
      {org.hosting_enabled && (
        <>
          <button
            onClick={openTerminal}
            disabled={terminalLoading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 8, width: "100%", padding: "10px 16px",
              background: C.gold, color: C.termBg, border: "none",
              ...font.mono, fontSize: 12, fontWeight: 700,
              marginBottom: provisioningStatus ? 0 : 12,
              cursor: terminalLoading ? "wait" : "pointer",
              opacity: terminalLoading ? 0.7 : 1,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => { if (!terminalLoading) e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = terminalLoading ? "0.7" : "1"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            {terminalLoading ? (provisioningStatus === "provisioning" ? "Creating workspace..." : "Starting workspace...") : "Open in Browser"}
          </button>
          {provisioningStatus && (
            <div style={{
              padding: "8px 12px", marginBottom: 12,
              background: "rgba(212, 175, 55, 0.1)", border: `1px solid ${C.gold}22`,
              ...font.mono, fontSize: 11, color: C.gold,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{
                display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                background: provisioningStatus === "error" ? "#ff4444" : C.gold,
                animation: provisioningStatus !== "error" ? "pulse 1.5s infinite" : "none",
              }} />
              {provisioningStatus === "provisioning" && "Setting up your workspace..."}
              {provisioningStatus === "starting" && "Workspace created. Waiting for agent to connect..."}
              {provisioningStatus === "ready" && "Ready! Opening terminal..."}
              {provisioningStatus === "error" && "Error provisioning. Opening Coder directly..."}
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
            </div>
          )}
        </>
      )}

      {/* Auth modal — shown when user has no API key */}
      {showAuthModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => setShowAuthModal(false)}>
          <div style={{
            background: C.termBg, border: `1px solid rgba(200,165,90,0.3)`,
            padding: 28, maxWidth: 420, width: "90%",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ ...font.ibmPlex, fontSize: 14, fontWeight: 700, color: C.parchment, marginBottom: 4 }}>
              Connect to Anthropic
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
              Your workspace needs access to Claude. Choose one:
            </div>

            {/* Option 1: API Key */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ ...font.mono, fontSize: 11, color: C.gold, marginBottom: 8, fontWeight: 700 }}>
                API Key
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveKeyAndOpen()}
                  placeholder="sk-ant-..."
                  style={{
                    flex: 1, padding: "8px 10px", background: "rgba(0,0,0,0.3)",
                    border: `1px solid rgba(200,165,90,0.2)`, color: C.parchment,
                    ...font.mono, fontSize: 12, boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={handleSaveKeyAndOpen}
                  disabled={apiKeySaving || !apiKeyInput.trim()}
                  style={{
                    ...font.mono, fontSize: 12, fontWeight: 700, padding: "8px 16px",
                    background: C.gold, color: C.termBg, border: "none",
                    cursor: (apiKeySaving || !apiKeyInput.trim()) ? "default" : "pointer",
                    opacity: (apiKeySaving || !apiKeyInput.trim()) ? 0.4 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {apiKeySaving ? "Saving..." : "Save & Open"}
                </button>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                Get one at{" "}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer"
                  style={{ color: C.gold, textDecoration: "none" }}>console.anthropic.com</a>
              </div>
              {apiKeyError && (
                <div style={{ fontSize: 11, color: C.crimson, marginTop: 6 }}>{apiKeyError}</div>
              )}
            </div>

            {/* Divider */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
            }}>
              <div style={{ flex: 1, height: 1, background: "rgba(200,165,90,0.15)" }} />
              <span style={{ ...font.mono, fontSize: 11, color: C.muted }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(200,165,90,0.15)" }} />
            </div>

            {/* Option 2: Claude Max */}
            <button
              onClick={handleMaxAuth}
              style={{
                width: "100%", padding: "10px 16px", background: "none",
                border: `1px solid rgba(200,165,90,0.3)`, color: C.parchment,
                ...font.mono, fontSize: 12, cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(200,165,90,0.3)"; }}
            >
              I have Claude Max — sign in inside workspace
            </button>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
              You'll authenticate with Anthropic when the workspace opens.
            </div>
          </div>
        </div>
      )}

      {/* Enable hosting for non-hosted orgs (admin only) */}
      {!org.hosting_enabled && isAdmin && !hostingState && (
        <button
          onClick={handleEnableHosting}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, width: "100%", padding: "10px 16px",
            background: "none", color: C.gold, border: `1px solid ${C.gold}`,
            ...font.mono, fontSize: 12, fontWeight: 700,
            marginBottom: 12, cursor: "pointer",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          Enable Hosted Access
        </button>
      )}

      {/* Hosting provisioning state */}
      {hostingState === "enabling" && (
        <div style={{ padding: "10px 16px", marginBottom: 12, fontSize: 12, color: C.muted, textAlign: "center" }}>
          Requesting server...
        </div>
      )}
      {hostingState === "provisioning" && (
        <div style={{
          padding: "10px 16px", marginBottom: 12, fontSize: 12,
          border: `1px solid rgba(200,165,90,0.2)`, background: "rgba(200,165,90,0.05)",
        }}>
          <div style={{ color: C.gold, fontWeight: 700, marginBottom: 4 }}>Provisioning VPS...</div>
          <div style={{ color: C.muted }}>
            Server {hostingIp ? `(${hostingIp}) ` : ""}is starting up. Coder will be ready in 2-5 minutes.
          </div>
          <div style={{ color: C.muted, marginTop: 4, fontSize: 11 }}>
            Checking every 10s...
          </div>
        </div>
      )}
      {hostingState === "ready" && (
        <div style={{
          padding: "10px 16px", marginBottom: 12, fontSize: 12,
          border: `1px solid rgba(74,170,74,0.3)`, background: "rgba(74,170,74,0.05)", color: "#4a4",
        }}>
          Hosting enabled! Refreshing...
        </div>
      )}
      {hostingState === "error" && (
        <div style={{
          padding: "10px 16px", marginBottom: 12, fontSize: 12,
          border: `1px solid rgba(122,15,27,0.3)`, background: "rgba(122,15,27,0.05)", color: C.crimson,
        }}>
          Failed: {hostingError || "Unknown error"}
          <button onClick={() => setHostingState(null)} style={{
            ...font.mono, background: "transparent", color: C.muted, border: `1px solid ${C.muted}`,
            padding: "2px 8px", marginLeft: 8, fontSize: 10, cursor: "pointer",
          }}>Retry</button>
        </div>
      )}

      {/* Health Status */}
      <HealthStatus checkin={org.latest_checkin} />

      {/* Diagnostics / Quick Fix */}
      {org.diagnostics && org.diagnostics.length > 0 && (
        <div style={s.fixBox}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: C.crimson }}>
            Issues Found
          </div>
          {org.diagnostics.map((d, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <span style={s.badge(d.severity)}>{d.type.replace(/_/g, " ")}</span>
              <span style={{ color: C.parchment }}>{d.detail}</span>
              {d.correct_key && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
                    Correct key for this org:
                  </div>
                  <div style={s.codeBlock}>
                    <code>{d.correct_key}</code>
                    <CopyButton text={d.correct_key} />
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6, marginBottom: 4 }}>
                    Fix command:
                  </div>
                  <div style={s.codeBlock}>
                    <code style={{ whiteSpace: "nowrap" }}>
                      {`sed -i.bak "s/^EGREGORE_API_KEY=.*/EGREGORE_API_KEY=${d.correct_key}/" .env`}
                    </code>
                    <CopyButton
                      text={`sed -i.bak "s/^EGREGORE_API_KEY=.*/EGREGORE_API_KEY=${d.correct_key}/" .env`}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* API Key */}
      <div style={s.sectionTitle}>API Key</div>
      <div style={s.keyBox}>
        <code>{showKey ? org.api_key : org.api_key_masked}</code>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={s.copyBtn} onClick={() => setShowKey(!showKey)}>
            {showKey ? "Hide" : "Reveal"}
          </button>
          {org.api_key && <CopyButton text={org.api_key} />}
        </div>
      </div>

      {/* Members */}
      <div style={s.sectionTitle}>Members ({org.members.length})</div>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>GitHub</th>
            <th style={s.th}>Name</th>
            <th style={s.th}>Role</th>
            <th style={s.th}>Status</th>
            {isAdmin && <th style={s.th}></th>}
          </tr>
        </thead>
        <tbody>
          {org.members.map((m, i) => {
            const isSelf = currentUser && m.github_username?.toLowerCase() === currentUser.toLowerCase();
            const canRemove = isAdmin && !isSelf && m.role !== "admin" && m.status === "active";
            return (
              <tr key={i}>
                <td style={{ ...s.td, color: C.gold }}>{m.github_username || "\u2014"}</td>
                <td style={s.td}>{m.display_name || m.github_name || "\u2014"}</td>
                <td style={s.td}>{m.role}</td>
                <td style={s.td}>
                  <span style={s.dot(m.status === "active" ? "#4a4" : C.muted)} />
                  {m.status}
                </td>
                {isAdmin && (
                  <td style={s.td}>
                    {canRemove && (
                      <button onClick={() => setRemovingMember(m)} style={{
                        ...font.mono, background: "transparent", color: C.crimson, border: `1px solid ${C.crimson}`,
                        padding: "2px 8px", borderRadius: 3, cursor: "pointer", fontSize: 10,
                      }}>Remove</button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {removingMember && (
        <RemoveMemberDialog
          member={removingMember}
          slug={org.slug}
          token={token}
          onClose={() => setRemovingMember(null)}
          onRemoved={() => { setRemovingMember(null); onRefresh && onRefresh(); }}
        />
      )}

      {/* Info row + delete */}
      <div style={{ marginTop: 12, fontSize: 11, color: C.muted, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 16 }}>
          <span>GitHub: {org.github_org}</span>
          <span>Telegram: {org.has_telegram ? "connected" : "not connected"}</span>
        </div>
        {isAdmin && (
          <button onClick={() => setShowDeleteOrg(true)} style={{
            ...font.mono, background: "transparent", color: C.crimson, border: `1px solid rgba(122,15,27,0.3)`,
            padding: "2px 8px", borderRadius: 3, cursor: "pointer", fontSize: 10,
            opacity: 0.6, transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
          >Delete Egregore</button>
        )}
      </div>

      {showDeleteOrg && (
        <DeleteOrgDialog
          slug={org.slug}
          token={token}
          onClose={() => setShowDeleteOrg(false)}
          onDeleted={() => { setShowDeleteOrg(false); onRefresh && onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export default function UserDashboard() {
  const { token, user, error: authError, loading: authLoading, logout } = useAuth();
  const [data, setData] = useState(null);
  const [dashError, setDashError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(() => {
    if (!token) return;
    getMyEgregores(token)
      .then((d) => {
        setData(d);
        setLastUpdated(new Date());
        setDashError(null);
      })
      .catch((e) => setDashError(e.message));
  }, [token]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  // ── Not logged in ──
  if (!token && !authLoading) {
    return (
      <div style={s.loginPage}>
        <div style={{ ...font.ibmPlex, fontSize: 16, color: C.gold, letterSpacing: 2 }}>
          EGREGORE DASHBOARD
        </div>
        <div style={{ color: C.muted, fontSize: 12, textAlign: "center", maxWidth: 400 }}>
          Sign in with GitHub to see your Egregore instances, API keys, and health status.
        </div>
        {authError && <div style={{ color: C.crimson, fontSize: 13 }}>{authError}</div>}
        <button style={s.loginBtn} onClick={() => {
          sessionStorage.setItem("dash_auth_pending", "1");
          window.location.href = getGitHubAuthUrl("joiner");
        }}>
          Sign in with GitHub
        </button>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div style={s.loginPage}>
        <div style={{ color: C.muted }}>Authenticating...</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerTitle}>EGREGORE DASHBOARD</div>
        <div style={s.headerRight}>
          {data && (
            <span>{data.egregores.length} org{data.egregores.length !== 1 ? "s" : ""}</span>
          )}
          <span>{user?.login}</span>
          <button style={s.btn} onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={s.content}>
        {/* Updated indicator */}
        {lastUpdated && (
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 16 }}>
            Updated {timeAgo(lastUpdated.toISOString())} &middot; auto-refreshes every 60s
          </div>
        )}

        {dashError && (
          <div style={s.alertBar}>Error: {dashError}</div>
        )}

        {/* Org cards */}
        {data === null ? (
          <div style={{ color: C.muted }}>Loading your egregores...</div>
        ) : data.egregores.length === 0 ? (
          <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>No Egregore instances found</div>
            <div style={{ fontSize: 12 }}>
              Visit <a href="/setup" style={{ color: C.gold }}>egregore.xyz/setup</a> to create one,
              or ask your team admin to invite you.
            </div>
          </div>
        ) : (
          data.egregores.map((org) => (
            <OrgCard key={org.slug} org={org} token={token} currentUser={user?.login} onRefresh={fetchData} />
          ))
        )}
      </div>
    </div>
  );
}
