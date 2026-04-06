import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { C, font } from './tokens';
import { exchangeCode, getMyEgregores, getGitHubAuthUrl } from './api';

const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === "localhost" ? "" : "https://egregore-production-55f2.up.railway.app"
);

// ─── Auth (same pattern as UserDashboard) ──────────────────────

function useAuth() {
  const [token, setToken] = useState(() => sessionStorage.getItem("dash_gh_token"));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("dash_gh_user")); } catch { return null; }
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
          sessionStorage.setItem("dash_gh_token", data.github_token);
          sessionStorage.setItem("dash_gh_user", JSON.stringify(data.user));
          setToken(data.github_token);
          setUser(data.user);
          setLoading(false);
        })
        .catch((err) => { setError(err.message); setLoading(false); });
    }
  }, [token]);

  const logout = useCallback(() => {
    sessionStorage.removeItem("dash_gh_token");
    sessionStorage.removeItem("dash_gh_user");
    setToken(null);
    setUser(null);
  }, []);

  return { token, user, error, loading, logout };
}

// ─── Type badges ───────────────────────────────────────────────

const TYPE_COLORS = {
  handoff: { bg: 'rgba(122,15,27,0.08)', color: C.crimson },
  quest: { bg: 'rgba(200,165,90,0.12)', color: '#8a6d2b' },
  activity: { bg: 'rgba(100,130,160,0.1)', color: '#5a7a9a' },
  document: { bg: 'rgba(138,133,120,0.1)', color: C.muted },
};

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.document;
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '3px',
      ...font.ibmPlex,
      fontSize: '11px',
      fontWeight: 500,
      letterSpacing: '0.02em',
      background: c.bg,
      color: c.color,
      textTransform: 'uppercase',
    }}>{type}</span>
  );
}

// ─── Main page ─────────────────────────────────────────────────

export default function ArtifactsPage() {
  const { org } = useParams();
  const { token, user, error: authError, loading: authLoading, logout } = useAuth();
  const [artifacts, setArtifacts] = useState([]);
  const [orgName, setOrgName] = useState(org);
  const [apiKey, setApiKey] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get org API key from user's egregores
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    getMyEgregores(token).then((data) => {
      const match = (data.egregores || []).find(e => e.slug === org);
      if (match) {
        setApiKey(match.api_key);
        setOrgName(match.org_name || org);
      } else {
        setLoadError(`You don't have access to "${org}"`);
        setLoading(false);
      }
    }).catch(err => {
      setLoadError(err.message);
      setLoading(false);
    });
  }, [token, org]);

  // Fetch artifacts once we have the API key
  useEffect(() => {
    if (!apiKey) return;
    setLoading(true);
    fetch(`${API_URL}/api/artifacts/list/${org}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    })
      .then(r => r.json())
      .then(data => {
        setArtifacts(data.artifacts || []);
        setLoading(false);
      })
      .catch(err => {
        setLoadError(err.message);
        setLoading(false);
      });
  }, [apiKey, org]);

  // ─── Login screen ──────────────────────────────────────────

  if (!token && !authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: C.parchment, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: '2rem' }}>
          <div style={{ ...font.ibmPlex, fontSize: '13px', color: C.muted, letterSpacing: '0.04em', marginBottom: '1rem' }}>
            EGREGORE
          </div>
          <h1 style={{ ...font.courierPrime, fontSize: '24px', color: C.ink, marginBottom: '0.5rem' }}>
            Artifacts
          </h1>
          <p style={{ ...font.courierPrime, fontSize: '14px', color: C.muted, marginBottom: '2rem' }}>
            Sign in to view published artifacts for <strong>{org}</strong>
          </p>
          {authError && (
            <p style={{ color: C.crimson, fontSize: '13px', marginBottom: '1rem' }}>{authError}</p>
          )}
          <a
            href={getGitHubAuthUrl("joiner")}
            onClick={() => {
              sessionStorage.setItem("artifacts_auth_pending", "1");
              sessionStorage.setItem("artifacts_return_path", `/view/${org}`);
            }}
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              background: C.ink,
              color: C.parchment,
              ...font.ibmPlex,
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '4px',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            Sign in with GitHub
          </a>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: C.parchment, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ ...font.ibmPlex, color: C.muted, fontSize: '13px' }}>Authenticating...</p>
      </div>
    );
  }

  // ─── Artifact list ─────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: C.parchment }}>
      {/* Header */}
      <header style={{
        maxWidth: 780,
        margin: '0 auto',
        padding: '2.5rem 2rem 1.5rem',
        borderBottom: `1px solid ${C.warmGray}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <div style={{ ...font.ibmPlex, fontSize: '12px', color: C.muted, letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
            <span style={{ color: C.crimson, marginRight: 6 }}>&#10022;</span>
            EGREGORE &middot; ARTIFACTS
          </div>
          <h1 style={{ ...font.courierPrime, fontSize: '28px', color: C.ink, lineHeight: 1.2 }}>
            {orgName}
          </h1>
          <p style={{ ...font.courierPrime, fontSize: '14px', color: C.muted, marginTop: '0.25rem' }}>
            {artifacts.length} published artifact{artifacts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={logout}
          style={{
            background: 'none',
            border: `1px solid ${C.warmGray}`,
            borderRadius: '4px',
            padding: '4px 12px',
            ...font.ibmPlex,
            fontSize: '11px',
            color: C.muted,
            cursor: 'pointer',
          }}
        >
          {user?.login || 'Sign out'}
        </button>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 780, margin: '0 auto', padding: '1.5rem 2rem 4rem' }}>
        {loadError && (
          <div style={{
            padding: '1rem',
            background: 'rgba(122,15,27,0.05)',
            borderRadius: '8px',
            ...font.courierPrime,
            fontSize: '14px',
            color: C.crimson,
          }}>
            {loadError}
          </div>
        )}

        {loading && !loadError && (
          <p style={{ ...font.ibmPlex, color: C.muted, fontSize: '13px' }}>Loading...</p>
        )}

        {!loading && !loadError && artifacts.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: C.muted,
          }}>
            <p style={{ ...font.courierPrime, fontSize: '16px', marginBottom: '0.5rem' }}>
              No artifacts published yet
            </p>
            <p style={{ ...font.ibmPlex, fontSize: '13px' }}>
              Run <code style={{ background: 'rgba(0,0,0,0.04)', padding: '2px 6px', borderRadius: '3px' }}>/view</code> in a session to generate one
            </p>
          </div>
        )}

        {artifacts.map((a, i) => (
          <a
            key={a.id}
            href={a.url}
            style={{
              display: 'block',
              padding: '1rem 1.25rem',
              background: '#fff',
              border: `1px solid ${C.warmGray}`,
              borderRadius: '8px',
              marginBottom: '0.75rem',
              textDecoration: 'none',
              color: C.ink,
              transition: 'border-color 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = C.gold}
            onMouseOut={e => e.currentTarget.style.borderColor = C.warmGray}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TypeBadge type={a.type} />
                <span style={{ ...font.courierPrime, fontSize: '15px', fontWeight: 400 }}>
                  {a.title}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', ...font.ibmPlex, fontSize: '12px', color: C.muted }}>
              {a.author && <span>{a.author}</span>}
              {a.date && <span>{new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
            </div>
          </a>
        ))}
      </main>

      {/* Footer */}
      <footer style={{
        maxWidth: 780,
        margin: '0 auto',
        padding: '1.5rem 2rem',
        borderTop: `1px solid ${C.warmGray}`,
        display: 'flex',
        justifyContent: 'space-between',
        ...font.ibmPlex,
        fontSize: '11px',
        color: C.muted,
      }}>
        <div>
          <span style={{ color: C.crimson, marginRight: 4 }}>&#10022;</span>
          egregore
        </div>
        <div>
          <a href="/dashboard" style={{ color: C.muted, textDecoration: 'none' }}>Dashboard</a>
        </div>
      </footer>
    </div>
  );
}
