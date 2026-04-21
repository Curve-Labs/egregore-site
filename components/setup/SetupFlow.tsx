"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  exchangeCode,
  getOrgs,
  getOrgRepos,
  setupOrg,
  joinOrg,
  getTelegramStatus,
  getInviteInfo,
  acceptInvite,
  getGitHubAuthUrl,
  checkTelegramMembership,
  getUserProfile,
  updateUserProfile,
  type GithubUser,
  type OrgInfo,
  type OrgInstance,
  type SetupOrgsResponse,
  type RepoInfo,
  type SetupResult,
  type TelegramMembership,
  type UserProfile,
  type InviteInfo,
} from "./api";
import { isAdmin } from "./auth";
import "./setup.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://egregore-production-55f2.up.railway.app";

// ── Icons ──────────────────────────────────────────────────────

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function Spinner() {
  return <div className="setup-spinner" />;
}

function SmallSpinner() {
  return <div className="setup-spinner-sm" />;
}

function Divider() {
  return (
    <div className="setup-divider" aria-hidden>
      <span className="diamond" />
    </div>
  );
}

// ── Install command ────────────────────────────────────────────

function InstallCommand({ setupToken, label = "Install" }: { setupToken: string; label?: string }) {
  const [method, setMethod] = useState<"npx" | "curl">("npx");
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
    <div className="setup-install">
      <div className="setup-install-header">
        <span className="setup-eyebrow" style={{ textAlign: "left", marginBottom: 0 }}>{label}</span>
        <div className="setup-install-tabs">
          {(["npx", "curl"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMethod(m); setCopied(false); }}
              className={`setup-install-tab ${method === m ? "is-active" : ""}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="setup-install-body">
        <code>{cmd}</code>
        <button onClick={handleCopy} className="setup-install-copy">
          {copied ? <><CheckIcon size={12} /> Copied</> : <><CopyIcon /> Copy</>}
        </button>
      </div>
      <p className="setup-install-note">
        {method === "npx"
          ? "Paste in your terminal. Takes ~5 seconds."
          : "No Node.js needed. Paste in your terminal."}
      </p>
    </div>
  );
}

// ── Stages ─────────────────────────────────────────────────────

function OAuthCallback({ onAuth }: { onAuth: (token: string, user: GithubUser) => void }) {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams?.get("code");
    if (!code) {
      setError("No authorization code received");
      return;
    }
    exchangeCode(code)
      .then(({ github_token, user }) => {
        router.replace("/setup");
        onAuth(github_token, user);
      })
      .catch((err: Error) => setError(err.message));
    // onAuth intentionally omitted to match original behavior
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="setup-stage setup-stage-centered">
        <p className="setup-error">{error}</p>
        <a href="/" className="setup-btn setup-btn-secondary" style={{ alignSelf: "center" }}>Try again</a>
      </div>
    );
  }

  return (
    <div className="setup-stage setup-stage-centered">
      <Spinner />
      <p className="setup-sub" style={{ marginBottom: 0, marginTop: 16 }}>Authenticating with GitHub…</p>
    </div>
  );
}

function OrgButton({
  name,
  hasEgregore,
  instanceCount,
  onClick,
}: {
  name: string;
  login: string;
  hasEgregore: boolean;
  isMember?: boolean;
  instanceCount: number;
  onClick: () => void;
}) {
  const badgeText = hasEgregore
    ? instanceCount > 1
      ? `${instanceCount} instances`
      : instanceCount === 1
        ? "1 instance"
        : "Join"
    : "Set up";
  const badgeClass = hasEgregore ? "setup-badge setup-badge-join" : "setup-badge setup-badge-new";

  return (
    <button onClick={onClick} className="setup-option">
      <span className="setup-option-main">{name}</span>
      <span className={badgeClass}>{badgeText}</span>
    </button>
  );
}

function OrgPicker({
  token,
  user,
  onPick,
}: {
  token: string;
  user: GithubUser;
  onPick: (org: OrgInfo & { is_personal: boolean; instances: OrgInstance[] }) => void;
}) {
  const [orgs, setOrgs] = useState<SetupOrgsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrgs(token)
      .then((data) => { setOrgs(data); setLoading(false); })
      .catch((err: Error) => { setError(err.message); setLoading(false); });
  }, [token]);

  if (loading) {
    return (
      <div className="setup-stage setup-stage-centered">
        <Spinner />
        <p className="setup-sub" style={{ marginTop: 16, marginBottom: 0 }}>Checking your organizations…</p>
      </div>
    );
  }
  if (error) return <div className="setup-stage setup-stage-centered"><p className="setup-error">{error}</p></div>;
  if (!orgs) return null;

  return (
    <div className="setup-stage">
      <p className="setup-eyebrow">Signed in as</p>
      <p className="setup-title" style={{ marginBottom: 24 }}>{user.name || user.login}</p>
      <p className="setup-sub">Where should we set up Egregore?</p>

      <div className="setup-option-list">
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
          onClick={() =>
            onPick({
              login: orgs.user.login,
              name: orgs.user.login,
              has_egregore: orgs.personal.has_egregore,
              is_personal: true,
              instances: orgs.personal.instances || [],
            })
          }
        />
      </div>
    </div>
  );
}

function InstanceButton({ instance, onClick }: { instance: OrgInstance; onClick: () => void }) {
  const { repo_name, org_name, repos } = instance;
  const repoList = repos && repos.length > 0 ? repos.join(", ") : null;

  return (
    <button onClick={onClick} className="setup-option setup-option-col">
      <div className="setup-option-row">
        <span className="setup-option-mono">{repo_name}</span>
        <span className="setup-badge setup-badge-join">Join</span>
      </div>
      {(org_name || repoList) && (
        <span className="setup-option-meta">
          {org_name}{repoList ? ` · ${repoList}` : ""}
        </span>
      )}
    </button>
  );
}

function InstancePicker({
  org,
  onJoin,
  onNew,
}: {
  org: OrgInfo & { instances: OrgInstance[] };
  onJoin: (inst: OrgInstance) => void;
  onNew: () => void;
}) {
  const instances = org.instances || [];

  return (
    <div className="setup-stage">
      <p className="setup-eyebrow">{org.name || org.login}</p>
      <p className="setup-sub">Which instance do you want to join?</p>

      <div className="setup-option-list">
        {instances.map((inst) => (
          <InstanceButton key={inst.repo_name} instance={inst} onClick={() => onJoin(inst)} />
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 8 }}>
        <button onClick={onNew} className="setup-btn setup-btn-secondary">
          + Create new instance
        </button>
      </div>
    </div>
  );
}

function InstanceNamePrompt({ org, onSubmit }: { org: OrgInfo; onSubmit: (name: string) => void }) {
  const [name, setName] = useState("");
  const slug = name.trim().toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="setup-stage">
      <p className="setup-eyebrow">New instance for {org.name || org.login}</p>
      <p className="setup-title">Name this instance</p>
      <p className="setup-sub">A short name to distinguish it from other instances. This will be used in the repo name.</p>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. research, frontend, ops"
        autoFocus
        className="setup-input"
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) onSubmit(name.trim());
        }}
      />
      {name.trim() && (
        <p className="setup-input-hint">
          Repo: <strong>egregore-{slug}</strong>
        </p>
      )}
      <div className="setup-actions-right">
        <button
          onClick={() => onSubmit(name.trim())}
          disabled={!name.trim()}
          className="setup-btn setup-btn-primary"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function RepoPicker({
  token,
  org,
  onPick,
}: {
  token: string;
  org: OrgInfo;
  onPick: (repos: string[]) => void;
}) {
  const [repos, setRepos] = useState<RepoInfo[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    getOrgRepos(token, org.login)
      .then((data) => { setRepos(data.repos || []); setLoading(false); })
      .catch(() => { setRepos([]); setLoading(false); });
  }, [token, org.login]);

  if (loading) {
    return (
      <div className="setup-stage setup-stage-centered">
        <Spinner />
        <p className="setup-sub" style={{ marginTop: 16, marginBottom: 0 }}>Loading repos…</p>
      </div>
    );
  }

  if (!repos || repos.length === 0) {
    return (
      <div className="setup-stage setup-stage-centered">
        <p className="setup-sub" style={{ marginBottom: 16 }}>No repos found — setting up collaboration-only mode.</p>
        <button onClick={() => onPick([])} className="setup-btn setup-btn-primary" style={{ alignSelf: "center" }}>
          Continue
        </button>
      </div>
    );
  }

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === repos.length) setSelected(new Set());
    else setSelected(new Set(repos.map((r) => r.name)));
  };

  return (
    <div className="setup-stage">
      <p className="setup-eyebrow">Setting up {org.name || org.login}</p>
      <p className="setup-title">Which repos should Egregore manage?</p>
      <p className="setup-sub">Select repos for shared context. You can add more later.</p>

      <div className="setup-option-list">
        {repos.map((repo) => {
          const isSelected = selected.has(repo.name);
          return (
            <button
              key={repo.name}
              onClick={() => toggle(repo.name)}
              className={`setup-option ${isSelected ? "is-selected" : ""}`}
            >
              <span className="setup-check">
                <CheckIcon size={12} />
              </span>
              <div className="setup-repo-body">
                <div className="setup-repo-row">
                  <span className="setup-repo-name">{repo.name}</span>
                  {repo.language && <span className="setup-repo-lang">{repo.language}</span>}
                </div>
                {repo.description && <p className="setup-repo-desc">{repo.description}</p>}
              </div>
              {repo.private && <span className="setup-badge setup-badge-muted">private</span>}
            </button>
          );
        })}
      </div>

      <div className="setup-actions">
        <button onClick={toggleAll} className="setup-btn setup-btn-ghost">
          {selected.size === repos.length ? "Deselect all" : "Select all"}
        </button>
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => onPick([])} className="setup-btn setup-btn-secondary">Skip</button>
          <button onClick={() => onPick([...selected])} className="setup-btn setup-btn-primary">
            Continue{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

function TranscriptConsent({ onChoice }: { onChoice: (enabled: boolean) => void }) {
  const [enabled, setEnabled] = useState(true);
  const options: { value: boolean; label: string; desc: string }[] = [
    { value: true, label: "Enable transcript collection", desc: "Sessions are archived and used to build shared knowledge" },
    { value: false, label: "Skip for now", desc: "You can enable this later in your org settings" },
  ];

  return (
    <div className="setup-stage">
      <p className="setup-eyebrow">Session transcripts</p>
      <p className="setup-title">Build organizational memory</p>
      <p className="setup-sub">
        Egregore can collect session transcripts to surface decisions, patterns, and handoffs across your team. Transcripts are private to your org. Members can opt out individually.
      </p>

      <div className="setup-option-list">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => setEnabled(opt.value)}
            className={`setup-option ${enabled === opt.value ? "is-selected" : ""}`}
            style={{ alignItems: "flex-start" }}
          >
            <span className="setup-radio">
              <span className="setup-radio-dot" />
            </span>
            <div className="setup-option-body">
              <span className="setup-option-label">{opt.label}</span>
              <span className="setup-option-desc">{opt.desc}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="setup-actions-right">
        <button onClick={() => onChoice(enabled)} className="setup-btn setup-btn-primary">Continue</button>
      </div>
    </div>
  );
}

function TelegramStep({
  isFounder,
  telegramInviteLink,
  telegramGroupLink,
  telegramConnected,
  orgSlug,
  githubToken,
}: {
  isFounder: boolean;
  telegramInviteLink?: string;
  telegramGroupLink?: string;
  telegramConnected: boolean;
  orgSlug: string;
  githubToken: string;
}) {
  const [membershipStatus, setMembershipStatus] = useState<TelegramMembership | null>(null);

  useEffect(() => {
    if (!orgSlug || !githubToken || isFounder) return;
    checkTelegramMembership(orgSlug, githubToken)
      .then(setMembershipStatus)
      .catch(() => { /* silent — falls back */ });
  }, [orgSlug, githubToken, isFounder]);

  if (isFounder) {
    return (
      <div className="setup-telegram">
        <p className="setup-eyebrow" style={{ textAlign: "left", marginBottom: 0 }}>Step 2 — Connect Telegram</p>

        {telegramConnected ? (
          <>
            <div className="setup-status-connected">
              <CheckIcon /> Telegram connected
            </div>
            <div className="setup-status-info">
              To invite team members to the Telegram group, open the group in Telegram and share the invite link. Or use <code>/invite</code> in Egregore to send setup links.
            </div>
          </>
        ) : (
          <>
            <div className="setup-telegram-steps">
              <div><span className="num">1.</span>Open Telegram and create a new group</div>
              <div><span className="num">2.</span>Name it (e.g. your team name)</div>
              <div><span className="num">3.</span>Click below to add the Egregore bot</div>
            </div>
            {telegramInviteLink && (
              <a
                href={telegramInviteLink}
                target="_blank"
                rel="noopener noreferrer"
                className="setup-btn setup-btn-accent"
                style={{ alignSelf: "flex-start" }}
              >
                <TelegramIcon /> Add bot to group
              </a>
            )}
            <div className="setup-status-waiting">
              <SmallSpinner />
              <span>Waiting for bot to connect…</span>
            </div>
            <p className="setup-install-note" style={{ marginTop: 0 }}>
              Select the group you just created. Notifications, handoffs, and questions will appear there.
            </p>
          </>
        )}
      </div>
    );
  }

  // Joiner / invitee path
  const inGroup = membershipStatus?.in_group;
  const isConfigured = membershipStatus?.status === "configured";
  const groupName = membershipStatus?.group_name;
  const groupLink = membershipStatus?.telegram_group_link || telegramGroupLink;
  const telegramHandle = membershipStatus?.telegram_username;

  const inGroupLabel = (
    <>
      <CheckIcon /> You&apos;re in <strong>{groupName || "the Telegram group"}</strong>
      {telegramHandle && <span style={{ opacity: 0.7, fontWeight: "normal" }}>&nbsp;as @{telegramHandle}</span>}
    </>
  );

  return (
    <div className="setup-telegram">
      <p className="setup-eyebrow" style={{ textAlign: "left", marginBottom: 0 }}>Step 2 — Telegram</p>
      {inGroup ? (
        groupLink ? (
          <a href={groupLink} target="_blank" rel="noopener noreferrer" className="setup-status-connected" style={{ textDecoration: "none" }}>
            {inGroupLabel}
          </a>
        ) : (
          <div className="setup-status-connected">{inGroupLabel}</div>
        )
      ) : telegramGroupLink ? (
        <a
          href={telegramGroupLink}
          target="_blank"
          rel="noopener noreferrer"
          className="setup-btn setup-btn-secondary"
          style={{ alignSelf: "flex-start", color: "var(--terracotta)", borderColor: "var(--terracotta)" }}
        >
          <TelegramIcon /> Join {groupName || "the Telegram group"}
        </a>
      ) : isConfigured ? (
        <p className="setup-install-note" style={{ marginTop: 0 }}>
          {groupName || "A Telegram group"} is set up. Ask your admin for the invite link, or open Telegram and search for the group.
        </p>
      ) : (
        <p className="setup-install-note" style={{ marginTop: 0 }}>
          Your team hasn&apos;t connected a Telegram group yet. Ask your admin to set it up, or skip this step.
        </p>
      )}
    </div>
  );
}

function SetupProgress({
  token,
  org,
  repos = [],
  joinRepoName,
  instanceName,
  transcriptSharing = false,
}: {
  token: string;
  user: GithubUser;
  org: OrgInfo & { is_personal?: boolean };
  repos?: string[];
  joinRepoName?: string;
  instanceName?: string | null;
  transcriptSharing?: boolean;
}) {
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [result, setResult] = useState<SetupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [telegramConnected, setTelegramConnected] = useState(false);

  useEffect(() => {
    const action = org.has_egregore
      ? joinOrg(token, { github_org: org.login, repo_name: joinRepoName || "egregore" })
      : setupOrg(token, {
          github_org: org.login,
          org_name: org.name || org.login,
          is_personal: org.is_personal || false,
          repos,
          instance_name: instanceName || undefined,
          transcript_sharing: transcriptSharing,
        });

    action
      .then((data) => { setResult(data); setStatus("done"); })
      .catch((err: Error) => { setError(err.message); setStatus("error"); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!result?.org_slug) return;
    const id = setInterval(async () => {
      try {
        const s = await getTelegramStatus(result.org_slug);
        if (s.connected) { setTelegramConnected(true); clearInterval(id); }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(id);
  }, [result?.org_slug]);

  if (status === "working") {
    return (
      <div className="setup-stage setup-stage-centered">
        <Spinner />
        <p className="setup-title" style={{ marginTop: 16 }}>
          {org.has_egregore ? "Joining" : "Setting up Egregore for"} {org.name || org.login}…
        </p>
        <p className="setup-install-note">
          {org.has_egregore ? "Verifying access" : "Creating repo, setting up memory, bootstrapping graph"}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="setup-stage setup-stage-centered">
        <p className="setup-error">{error}</p>
        <a href="/setup" className="setup-btn setup-btn-secondary" style={{ alignSelf: "center" }}>Try again</a>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="setup-stage">
      <div className="setup-stage-centered" style={{ padding: 0, marginBottom: 8 }}>
        <div className="setup-success-check">
          <CheckIcon size={22} />
        </div>
        <p className="setup-title setup-title-lg">
          Egregore is ready for {org.name || org.login}
        </p>
      </div>

      <InstallCommand setupToken={result.setup_token} label="Step 1 — Install" />

      <Divider />

      <TelegramStep
        isFounder={!org.has_egregore}
        telegramInviteLink={result.telegram_invite_link}
        telegramGroupLink={result.telegram_group_link}
        telegramConnected={telegramConnected}
        orgSlug={result.org_slug}
        githubToken={token}
      />

      <div className="setup-after">
        <p className="setup-after-label">After install</p>
        <p className="setup-after-body">
          Type <code>egregore</code> in any terminal to launch. Your shared memory, graph, and notifications are all connected.
        </p>
      </div>
    </div>
  );
}

function ProfileStep({
  token,
  user,
  onContinue,
}: {
  token: string;
  user: GithubUser;
  onContinue: () => void;
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUserProfile(token)
      .then((data) => {
        setProfile(data);
        if (data.telegram_username) setHandle(data.telegram_username);
        setLoading(false);
      })
      .catch(() => onContinue());
  }, [token, onContinue]);

  if (loading || !profile) {
    return (
      <div className="setup-stage setup-stage-centered">
        <Spinner />
        <p className="setup-sub" style={{ marginTop: 16, marginBottom: 0 }}>Loading profile…</p>
      </div>
    );
  }

  const hasMemberships = (profile.memberships?.length ?? 0) > 0;
  const cleaned = handle.replace(/^@/, "").trim();
  const handleChanged = cleaned !== (profile.telegram_username || "");

  const handleContinue = async () => {
    if (cleaned && handleChanged) {
      setSaving(true);
      try {
        await updateUserProfile(token, { telegram_username: cleaned });
      } catch { /* ignore */ }
      setSaving(false);
    }
    onContinue();
  };

  return (
    <div className="setup-stage">
      <p className="setup-eyebrow">{hasMemberships ? "Welcome back" : "Your profile"}</p>
      <p className="setup-title" style={{ marginBottom: 24 }}>{profile.name || user.login}</p>

      <div>
        <p className="setup-eyebrow" style={{ textAlign: "left", marginBottom: 8 }}>Telegram</p>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@your_handle"
          className="setup-input"
        />
        <p className="setup-install-note">Used for notifications and group membership detection</p>
      </div>

      {hasMemberships && (
        <div>
          <p className="setup-eyebrow" style={{ textAlign: "left", marginBottom: 8 }}>Organizations</p>
          <div className="setup-option-list">
            {profile.memberships!.map((m) => (
              <div key={m.org_slug} className="setup-membership">
                <span className="setup-membership-name">{m.org_name}</span>
                {m.in_telegram_group ? (
                  <span className="setup-membership-status setup-membership-in">
                    <CheckIcon size={11} /> in group
                  </span>
                ) : (
                  <span className="setup-membership-status setup-membership-out">not in group</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="setup-actions">
        <button onClick={onContinue} className="setup-btn setup-btn-ghost">Skip</button>
        <button onClick={handleContinue} disabled={saving} className="setup-btn setup-btn-primary">
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}

function AccessRestricted({ user }: { user: GithubUser | null }) {
  return (
    <div className="setup-stage setup-stage-centered">
      <p className="setup-title setup-title-lg">Not yet, {user?.name || user?.login || "friend"}</p>
      <p className="setup-sub">
        Egregore is in early access. Join the waitlist and we&apos;ll reach out when it&apos;s your turn.
      </p>
      <a href="/#join" className="setup-btn setup-btn-primary" style={{ alignSelf: "center" }}>
        Join the waitlist
      </a>
      <p className="setup-install-note" style={{ marginTop: 16 }}>
        Already have an invite link? <a href="/join" style={{ color: "var(--terracotta)" }}>Use it here</a>
      </p>
    </div>
  );
}

function InviteLanding({ inviteToken }: { inviteToken: string }) {
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInviteInfo(inviteToken)
      .then(setInfo)
      .catch((err: Error) => setError(err.message));
  }, [inviteToken]);

  if (error) {
    return (
      <div className="setup-stage setup-stage-centered">
        <p className="setup-title">Invite not found</p>
        <p className="setup-sub">This invite may have expired or already been used.</p>
        <a href="/" className="setup-btn setup-btn-secondary" style={{ alignSelf: "center" }}>Go to egregore.xyz</a>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="setup-stage setup-stage-centered">
        <Spinner />
        <p className="setup-sub" style={{ marginTop: 16, marginBottom: 0 }}>Loading invite…</p>
      </div>
    );
  }

  // Preserve invite through OAuth round-trip
  if (typeof window !== "undefined") {
    sessionStorage.setItem("egregore_invite", inviteToken);
  }

  return (
    <div className="setup-stage setup-stage-centered">
      <p className="setup-eyebrow">You&apos;ve been invited</p>
      <p className="setup-title setup-title-lg">Join {info.org_name}</p>
      <p className="setup-sub">Invited by {info.invited_by}</p>

      <a href={getGitHubAuthUrl()} className="setup-btn setup-btn-primary" style={{ alignSelf: "center" }}>
        <GitHubIcon /> Join with GitHub
      </a>

      <p className="setup-install-note" style={{ marginTop: 12 }}>
        You&apos;ll authorize with GitHub, then get a one-line install command.
      </p>
    </div>
  );
}

function InviteAccept({
  token,
  inviteToken,
}: {
  token: string;
  user: GithubUser | null;
  inviteToken: string;
}) {
  const [status, setStatus] = useState<"working" | "done" | "pending_github" | "error">("working");
  const [result, setResult] = useState<SetupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);
  const MAX_RETRIES = 20;

  const doAccept = () => {
    setStatus("working");
    setError(null);
    acceptInvite(token, inviteToken)
      .then((data) => {
        if (data.status === "pending_github") {
          setRetries((r) => r + 1);
          setStatus("pending_github");
          setResult(data);
        } else {
          setResult(data);
          setStatus("done");
        }
      })
      .catch((err: Error) => { setError(err.message); setStatus("error"); });
  };

  const didStart = useRef(false);
  useEffect(() => {
    if (didStart.current) return;
    didStart.current = true;
    doAccept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "working") {
    return (
      <div className="setup-stage setup-stage-centered">
        <Spinner />
        <p className="setup-title" style={{ marginTop: 16 }}>Joining…</p>
        <p className="setup-install-note">Verifying access and setting up your account</p>
      </div>
    );
  }

  if (status === "pending_github") {
    if (retries < MAX_RETRIES) {
      setTimeout(doAccept, 3000);
    }
    return (
      <div className="setup-stage setup-stage-centered">
        {retries < MAX_RETRIES ? <Spinner /> : null}
        <p className="setup-title" style={{ marginTop: 16 }}>
          {retries < MAX_RETRIES ? "Setting up your access…" : "Still waiting for GitHub access"}
        </p>
        <p className="setup-install-note">
          {retries < MAX_RETRIES
            ? "Waiting for GitHub to process the invitation"
            : result?.message ||
              "The GitHub invitation may not have been sent yet. Check your GitHub notifications or ask your admin."}
        </p>
        {retries >= MAX_RETRIES && (
          <button onClick={() => { setRetries(0); doAccept(); }} className="setup-btn setup-btn-secondary" style={{ alignSelf: "center" }}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="setup-stage setup-stage-centered">
        <p className="setup-error">{error}</p>
        <button onClick={doAccept} className="setup-btn setup-btn-secondary" style={{ alignSelf: "center" }}>
          Try again
        </button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="setup-stage">
      <div className="setup-stage-centered" style={{ padding: 0, marginBottom: 8 }}>
        <div className="setup-success-check">
          <CheckIcon size={22} />
        </div>
        <p className="setup-title setup-title-lg">Welcome to {result.org_name}</p>
      </div>

      <InstallCommand setupToken={result.setup_token} />

      <Divider />

      <TelegramStep
        isFounder={false}
        telegramGroupLink={result.telegram_group_link}
        telegramConnected={false}
        orgSlug={result.org_slug}
        githubToken={token}
      />

      <div className="setup-after">
        <p className="setup-after-label">After install</p>
        <p className="setup-after-body">
          Type <code>egregore</code> in any terminal to launch.
        </p>
      </div>
    </div>
  );
}

// ── Orchestrator ─────────────────────────────────────────────────

type FlowMode = "setup" | "join" | "callback";

type SelectedOrg = OrgInfo & { is_personal: boolean; instances: OrgInstance[] };

export default function SetupFlow({ mode }: { mode: FlowMode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [user, setUser] = useState<GithubUser | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<SelectedOrg | null>(null);
  const [selectedRepos, setSelectedRepos] = useState<string[] | null>(null);
  const [transcriptConsent, setTranscriptConsent] = useState<boolean | null>(null);
  const [joinInstance, setJoinInstance] = useState<OrgInstance | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [instanceName, setInstanceName] = useState<string | null>(null);

  const isCallback = mode === "callback" || pathname === "/callback";
  const isJoin = mode === "join" || pathname === "/join";
  const inviteParam = searchParams?.get("invite") ?? null;

  // Only use the saved invite token on /join or /callback — on /setup, ignore stale tokens.
  const inviteToken =
    inviteParam ||
    ((isJoin || isCallback) && typeof window !== "undefined"
      ? sessionStorage.getItem("egregore_invite")
      : null);

  // Clear stale invite token when on /setup directly
  useEffect(() => {
    if (!isJoin && !isCallback && !inviteParam && typeof window !== "undefined") {
      sessionStorage.removeItem("egregore_invite");
    }
  }, [isJoin, isCallback, inviteParam]);

  // Invite landing: /join?invite=inv_xxx
  if (isJoin && inviteToken && !githubToken) {
    return <InviteLanding inviteToken={inviteToken} />;
  }

  // OAuth callback
  if (isCallback && !githubToken) {
    return (
      <OAuthCallback
        onAuth={(token, u) => {
          setGithubToken(token);
          setUser(u);
          if (typeof window !== "undefined") {
            const savedInvite = sessionStorage.getItem("egregore_invite");
            if (savedInvite) {
              router.replace(`/join?invite=${savedInvite}`);
            } else {
              router.replace("/setup");
            }
          }
        }}
      />
    );
  }

  // Invite accept (post-OAuth)
  if (githubToken && inviteToken) {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("egregore_invite");
    }
    return <InviteAccept token={githubToken} user={user} inviteToken={inviteToken} />;
  }

  // Admin gate
  if (githubToken && !inviteToken && !isAdmin(user?.login)) {
    return <AccessRestricted user={user} />;
  }

  // Org picker
  if (githubToken && user && !selectedOrg) {
    return <OrgPicker token={githubToken} user={user} onPick={setSelectedOrg} />;
  }

  // Instance picker
  if (githubToken && selectedOrg && selectedOrg.has_egregore && !joinInstance && !creatingNew) {
    return (
      <InstancePicker
        org={selectedOrg}
        onJoin={(inst) => setJoinInstance(inst)}
        onNew={() => setCreatingNew(true)}
      />
    );
  }

  // Joining specific instance
  if (githubToken && user && selectedOrg && joinInstance) {
    return (
      <SetupProgress
        token={githubToken}
        user={user}
        org={{ ...selectedOrg, has_egregore: true }}
        joinRepoName={joinInstance.repo_name}
      />
    );
  }

  // Instance name prompt
  if (githubToken && selectedOrg && creatingNew && instanceName === null) {
    return <InstanceNamePrompt org={selectedOrg} onSubmit={setInstanceName} />;
  }

  // Repo picker
  if (githubToken && selectedOrg && selectedRepos === null) {
    return <RepoPicker token={githubToken} org={selectedOrg} onPick={setSelectedRepos} />;
  }

  // Transcript consent (new orgs only)
  if (githubToken && selectedOrg && !selectedOrg.has_egregore && transcriptConsent === null) {
    return <TranscriptConsent onChoice={setTranscriptConsent} />;
  }

  // Setup in progress / complete
  if (githubToken && user && selectedOrg) {
    const orgForSetup = creatingNew ? { ...selectedOrg, has_egregore: false } : selectedOrg;
    return (
      <SetupProgress
        token={githubToken}
        user={user}
        org={orgForSetup}
        repos={selectedRepos || []}
        instanceName={instanceName}
        transcriptSharing={transcriptConsent || false}
      />
    );
  }

  // Landing — not authenticated yet
  return (
    <div className="setup-stage setup-stage-centered">
      <p className="setup-eyebrow">Managed setup</p>
      <p className="setup-title setup-title-lg">Set up Egregore</p>
      <p className="setup-sub">
        Create a shared intelligence layer for your team — repo, memory, knowledge graph, and Telegram group, all wired up.
      </p>
      <a href={getGitHubAuthUrl()} className="setup-btn setup-btn-primary" style={{ alignSelf: "center" }}>
        <GitHubIcon /> Sign in with GitHub
      </a>
      <Divider />
      <p className="setup-install-note" style={{ textAlign: "center", marginTop: 0 }}>
        Prefer the OSS path? Run <code style={{ color: "var(--terracotta)" }}>npx create-egregore@latest --open</code> in your terminal.
      </p>
    </div>
  );
}

// Preserved from the original flow. Not wired into the orchestrator yet; the
// admin/org picker kicks off setup directly after OAuth.
export { ProfileStep };
