import { useState, useEffect, useCallback } from "react";
import { C, font } from "./tokens";
import { getGitHubAuthUrl, exchangeCode, getUserKeys, updateUserKeys, deleteUserKey, getUserProfile } from "./api";

// ─── Styles ─────────────────────────────────────────────────────

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
    maxWidth: 700,
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
  keyRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: `1px solid rgba(200,165,90,0.08)`,
  },
  keyLabel: {
    ...font.ibmPlex,
    fontSize: 12,
    color: C.parchment,
  },
  keyStatus: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  keyActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  setBtn: {
    background: "none",
    border: `1px solid ${C.gold}`,
    color: C.gold,
    ...font.mono,
    fontSize: 10,
    padding: "3px 10px",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  removeBtn: {
    background: "none",
    border: `1px solid rgba(122,15,27,0.5)`,
    color: C.crimson,
    ...font.mono,
    fontSize: 10,
    padding: "3px 10px",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  inputRow: {
    marginTop: 12,
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    background: "rgba(200,165,90,0.05)",
    border: `1px solid rgba(200,165,90,0.2)`,
    color: C.parchment,
    ...font.mono,
    fontSize: 12,
    padding: "6px 10px",
    outline: "none",
  },
  saveBtn: {
    background: C.gold,
    border: "none",
    color: C.termBg,
    ...font.mono,
    fontSize: 11,
    fontWeight: 700,
    padding: "6px 16px",
    cursor: "pointer",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cancelBtn: {
    background: "none",
    border: `1px solid rgba(200,165,90,0.3)`,
    color: C.muted,
    ...font.mono,
    fontSize: 11,
    padding: "6px 12px",
    cursor: "pointer",
  },
  statusDot: (active) => ({
    display: "inline-block",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: active ? "#4a7" : "rgba(200,165,90,0.3)",
    marginRight: 6,
  }),
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
    fontSize: 12,
    padding: "8px 24px",
    cursor: "pointer",
    letterSpacing: 1,
  },
  toast: (type) => ({
    position: "fixed",
    bottom: 24,
    right: 24,
    background: type === "error" ? "rgba(122,15,27,0.9)" : "rgba(200,165,90,0.9)",
    color: type === "error" ? C.parchment : C.termBg,
    padding: "8px 16px",
    fontSize: 12,
    ...font.mono,
    zIndex: 1000,
    maxWidth: 400,
  }),
  description: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 16,
    lineHeight: 1.5,
  },
};

// ─── Key definitions ────────────────────────────────────────────

const KEY_DEFS = [
  {
    name: "anthropic_api_key",
    label: "Anthropic API Key",
    description: "Your personal API key for Claude Code. Each workspace fetches this at startup.",
    link: "https://console.anthropic.com/settings/keys",
    linkLabel: "Get one at console.anthropic.com",
    placeholder: "sk-ant-...",
  },
];

// ─── Component ──────────────────────────────────────────────────

export default function SettingsPage() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [keyStatus, setKeyStatus] = useState(null);
  const [editing, setEditing] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth
  useEffect(() => {
    const stored = sessionStorage.getItem("gh_token");
    if (stored) {
      setToken(stored);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      window.history.replaceState({}, "", "/settings");
      exchangeCode(code)
        .then((data) => {
          sessionStorage.setItem("gh_token", data.access_token);
          setToken(data.access_token);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [profile, keys] = await Promise.all([
        getUserProfile(token).catch(() => null),
        getUserKeys(token).catch(() => ({})),
      ]);
      if (profile) setUser(profile);
      setKeyStatus(keys);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  // Toast helper
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Save key
  const handleSave = async (keyName) => {
    if (!inputValue.trim()) return;
    setSaving(true);
    try {
      await updateUserKeys(token, { [keyName]: inputValue.trim() });
      showToast("Key saved and encrypted");
      setEditing(null);
      setInputValue("");
      await loadData();
    } catch (e) {
      showToast(e.message || "Failed to save key", "error");
    }
    setSaving(false);
  };

  // Delete key
  const handleDelete = async (keyName) => {
    setSaving(true);
    try {
      await deleteUserKey(token, keyName);
      showToast("Key removed");
      await loadData();
    } catch (e) {
      showToast(e.message || "Failed to remove key", "error");
    }
    setSaving(false);
  };

  // Login screen
  if (!token) {
    if (loading) return <div style={s.loginPage}><span style={{ color: C.muted }}>Loading...</span></div>;
    return (
      <div style={s.loginPage}>
        <div style={{ ...font.ibmPlex, fontSize: 16, fontWeight: 700, color: C.gold, letterSpacing: 2 }}>
          EGREGORE SETTINGS
        </div>
        <div style={{ fontSize: 12, color: C.muted, textAlign: "center", maxWidth: 340 }}>
          Sign in with GitHub to manage your API keys and workspace settings.
        </div>
        <button
          style={s.loginBtn}
          onClick={() => {
            sessionStorage.setItem("settings_auth_pending", "1");
            window.location.href = getGitHubAuthUrl("joiner");
          }}
        >
          Sign in with GitHub
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={s.page}>
        <div style={{ ...s.content, textAlign: "center", paddingTop: 80, color: C.muted }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerTitle}>SETTINGS</div>
        <div style={s.headerRight}>
          {user && <span>{user.github_username || user.login}</span>}
          <a href="/dashboard" style={{ ...s.btn, textDecoration: "none" }}>Dashboard</a>
          <button style={s.btn} onClick={() => { sessionStorage.removeItem("gh_token"); setToken(null); }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={s.content}>
        {/* API Keys */}
        <div style={s.card}>
          <div style={s.cardTitle}>API Keys</div>
          <div style={s.description}>
            Your API keys are encrypted at rest and only decrypted when a Coder workspace starts.
            They are never stored in plaintext or logged.
          </div>

          {KEY_DEFS.map((def) => {
            const isSet = keyStatus?.[def.name];
            const isEditing = editing === def.name;

            return (
              <div key={def.name}>
                <div style={s.keyRow}>
                  <div>
                    <div style={s.keyLabel}>
                      <span style={s.statusDot(isSet)} />
                      {def.label}
                    </div>
                    <div style={s.keyStatus}>
                      {isSet ? "Active" : "Not set"}
                      {def.link && !isSet && (
                        <>
                          {" \u2014 "}
                          <a href={def.link} target="_blank" rel="noopener noreferrer"
                            style={{ color: C.gold, textDecoration: "none", fontSize: 10 }}>
                            {def.linkLabel}
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={s.keyActions}>
                    {!isEditing && (
                      <button style={s.setBtn} onClick={() => { setEditing(def.name); setInputValue(""); }}>
                        {isSet ? "Rotate" : "Set"}
                      </button>
                    )}
                    {isSet && !isEditing && (
                      <button style={s.removeBtn} onClick={() => handleDelete(def.name)} disabled={saving}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div style={s.inputRow}>
                    <input
                      style={s.input}
                      type="password"
                      placeholder={def.placeholder}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSave(def.name)}
                      autoFocus
                    />
                    <button style={s.saveBtn} onClick={() => handleSave(def.name)} disabled={saving}>
                      {saving ? "..." : "Save"}
                    </button>
                    <button style={s.cancelBtn} onClick={() => { setEditing(null); setInputValue(""); }}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {keyStatus?.updated_at && (
            <div style={{ fontSize: 10, color: C.muted, marginTop: 12 }}>
              Last updated: {new Date(keyStatus.updated_at).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Info card */}
        <div style={s.card}>
          <div style={s.cardTitle}>How it works</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
            <p style={{ marginBottom: 8 }}>
              When you create or restart a Coder workspace, the startup script fetches your
              encrypted key from the Egregore API and injects it into your environment.
            </p>
            <p style={{ marginBottom: 8 }}>
              Keys are encrypted with AES-256 before storage. The Egregore API server
              holds the encryption key — your plaintext key is never stored in a database.
            </p>
            <p>
              You can rotate your key at any time. The new key takes effect on the next
              workspace restart.
            </p>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <div style={s.toast(toast.type)}>{toast.msg}</div>}
    </div>
  );
}
