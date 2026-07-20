"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  TOKEN_KEY,
  answerQuestion,
  approvePlan,
  cancelTask,
  createTask,
  getMemberships,
  getTask,
  listTasks,
  listWorkers,
  importTaskBatch,
  previewTaskBatch,
  type BatchImport,
  type BatchPreview,
  type CreateTask,
  type Membership,
  type Task,
  type TaskDetail,
  type TaskStatus,
  type Worker,
} from "./api";
import "./desk.css";

const STATUS_LABEL: Record<TaskStatus, string> = {
  draft: "Draft", planning: "Planning", awaiting_plan_approval: "Plan ready",
  queued: "Queued", running: "Running", verifying: "Verifying", reviewing: "Reviewing",
  ready_for_you: "Ready for you", needs_input: "Needs input", paused_quota: "Quota paused",
  done: "Done", failed: "Failed", cancelled: "Cancelled",
};

const ACTIVE = new Set<TaskStatus>(["planning", "queued", "running", "verifying", "reviewing"]);
const TERMINAL = new Set<TaskStatus>(["done", "failed", "cancelled"]);

type Filter = "all" | "attention" | "active" | "done";

function relativeTime(value?: string | null) {
  if (!value) return "—";
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(delta / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function ArrowIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-4 4 4-4 4" /></svg>;
}

function CloseIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>;
}

function StatusMark({ status }: { status: TaskStatus }) {
  return <span className={`desk-status-mark status-${status}`} aria-hidden="true" />;
}

function EmptyDesk({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="desk-empty">
      <span className="desk-kicker">No work here yet</span>
      <h2>Put the first task on the desk.</h2>
      <p>Describe the outcome. Egregore will prepare a plan and wait for approval before writing code.</p>
      <button className="desk-button desk-button-dark" onClick={onCreate}>New task <ArrowIcon /></button>
    </div>
  );
}

function SignIn() {
  return (
    <main className="desk-auth">
      <a href="/" className="desk-logo"><img src="/logo_egregore.svg" alt="Egregore" /></a>
      <div className="desk-auth-copy">
        <span className="desk-kicker">Agent Desk</span>
        <h1>Your team&apos;s work,<br />running in one place.</h1>
        <p>Sign in through setup once. Your GitHub session is reused here to show only organizations you belong to.</p>
        <a className="desk-button desk-button-dark" href="/setup">Sign in with GitHub <ArrowIcon /></a>
      </div>
    </main>
  );
}

function CreatePanel({ org, onClose, onCreated, token }: {
  org: string; token: string; onClose: () => void; onCreated: (task: Task) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "", description: "", kind: "code" as CreateTask["kind"], repository: "",
    base_branch: "main", executor: "codex" as "codex" | "claude", network: false, criteria: "",
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const task = await createTask(token, {
        org_slug: org,
        title: form.title.trim(),
        description: form.description.trim(),
        kind: form.kind,
        repository: form.repository.trim() || undefined,
        base_branch: form.base_branch.trim() || undefined,
        executor_preference: form.executor,
        network_policy: form.network ? "allowed" : "off",
        acceptance_criteria: form.criteria.split("\n").map((line) => line.trim()).filter(Boolean),
      }, crypto.randomUUID());
      onCreated(task);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create task");
      setSaving(false);
    }
  }

  return (
    <div className="desk-panel-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="desk-create-panel" aria-label="Create task">
        <header><div><span className="desk-kicker">New task</span><h2>What needs to get done?</h2></div><button className="desk-icon-button" onClick={onClose} aria-label="Close"><CloseIcon /></button></header>
        <form onSubmit={submit}>
          <label>Title<input required maxLength={240} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Add organization task filters" autoFocus /></label>
          <label>Description<textarea required rows={8} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the outcome, useful context, constraints, and what not to change." /></label>
          <div className="desk-form-row">
            <label>Kind<select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as CreateTask["kind"] })}><option value="code">Code</option><option value="research">Research</option><option value="content">Content</option><option value="operations">Operations</option></select></label>
            <label>Executor<select value={form.executor} onChange={(e) => setForm({ ...form, executor: e.target.value as "codex" | "claude" })}><option value="codex">Codex</option><option value="claude">Claude</option></select></label>
          </div>
          <div className="desk-form-row">
            <label>Repository<input value={form.repository} onChange={(e) => setForm({ ...form, repository: e.target.value })} placeholder="Curve-Labs/repo" /></label>
            <label>Base branch<input value={form.base_branch} onChange={(e) => setForm({ ...form, base_branch: e.target.value })} /></label>
          </div>
          <label>Acceptance criteria <span>one per line</span><textarea rows={4} value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} placeholder={"Tests pass\nA pull request is ready\nNo deployment"} /></label>
          <label className="desk-check"><input type="checkbox" checked={form.network} onChange={(e) => setForm({ ...form, network: e.target.checked })} /><span><strong>Allow network access</strong>Needed for online research or dependency access.</span></label>
          {error && <p className="desk-error" role="alert">{error}</p>}
          <footer><p>Planning is read-only. Implementation waits for approval.</p><button className="desk-button desk-button-dark" disabled={saving}>{saving ? "Starting…" : "Start planning"} <ArrowIcon /></button></footer>
        </form>
      </aside>
    </div>
  );
}

const BATCH_EXAMPLE = `# Development batch
Defaults:
- organization: curvelabs
- network: off
- base branch: main

## T001 — First outcome
Kind: code
Repository: Curve-Labs/egregore
Priority: high
Preferred executor: codex

### Outcome
Describe what should be true when this is complete.

### Acceptance criteria
- Add concrete evidence of completion.

## T002 — Follow-up task
Kind: research
Depends on: T001

### Outcome
Describe the next outcome.`;

function ImportPanel({ org, onClose, onImported, token }: {
  org: string;
  token: string;
  onClose: () => void;
  onImported: (result: BatchImport) => void;
}) {
  const [markdown, setMarkdown] = useState("");
  const [preview, setPreview] = useState<BatchPreview | null>(null);
  const [working, setWorking] = useState<"preview" | "import" | "">("");
  const [error, setError] = useState("");

  function updateMarkdown(value: string) {
    setMarkdown(value);
    setPreview(null);
    setError("");
  }

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    updateMarkdown(await file.text());
  }

  async function runPreview() {
    setWorking("preview");
    setError("");
    try {
      setPreview(await previewTaskBatch(token, org, markdown));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not preview batch");
    } finally {
      setWorking("");
    }
  }

  async function runImport() {
    setWorking("import");
    setError("");
    try {
      onImported(await importTaskBatch(token, org, markdown, crypto.randomUUID()));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not import batch");
      setWorking("");
    }
  }

  return (
    <div className="desk-panel-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="desk-create-panel desk-import-panel" aria-label="Import Markdown batch">
        <header>
          <div><span className="desk-kicker">Batch import</span><h2>Put a development list on the desk.</h2></div>
          <button className="desk-icon-button" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </header>
        <div className="desk-import-body">
          {!preview ? <>
            <div className="desk-import-intro">
              <p>Paste one Markdown file. Each <code>## T001 — Title</code> becomes a task; <code>Depends on</code> sets the execution order.</p>
              <label className="desk-file-button">Choose .md file<input type="file" accept=".md,text/markdown,text/plain" onChange={readFile} /></label>
            </div>
            <label className="desk-markdown-label">Markdown
              <textarea
                rows={24}
                value={markdown}
                onChange={(event) => updateMarkdown(event.target.value)}
                placeholder={BATCH_EXAMPLE.replace("curvelabs", org)}
                autoFocus
                spellCheck={false}
              />
            </label>
          </> : <div className="desk-batch-preview">
            <div className="desk-batch-summary">
              <div><span className="desk-kicker">Validated batch</span><h3>{preview.title}</h3></div>
              <dl><div><dt>Tasks</dt><dd>{preview.task_count}</dd></div><div><dt>Dependencies</dt><dd>{preview.dependency_count}</dd></div></dl>
            </div>
            <ol className="desk-batch-tasks">
              {preview.tasks.map((task) => <li key={task.ref}>
                <span>{task.ref}</span>
                <div><strong>{task.title}</strong><p>{task.kind} · {task.repository || "no repository"} · {task.executor_preference || "auto"}</p>{task.depends_on.length > 0 && <small>After {task.depends_on.join(", ")}</small>}</div>
              </li>)}
            </ol>
            <button className="desk-edit-markdown" onClick={() => setPreview(null)}>← Edit Markdown</button>
          </div>}
          {error && <p className="desk-error desk-import-error" role="alert">{error}</p>}
          <footer>
            <p>{preview ? "All tasks are created together and sent to planning." : "Preview validates every task before anything is created."}</p>
            {preview
              ? <button className="desk-button desk-button-dark" disabled={!!working} onClick={runImport}>{working === "import" ? "Importing…" : `Import ${preview.task_count} tasks`} <ArrowIcon /></button>
              : <button className="desk-button desk-button-dark" disabled={!markdown.trim() || !!working} onClick={runPreview}>{working === "preview" ? "Validating…" : "Preview batch"} <ArrowIcon /></button>}
          </footer>
        </div>
      </aside>
    </div>
  );
}

function Detail({ detail, token, onChanged }: { detail: TaskDetail; token: string; onChanged: () => void }) {
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const openQuestions = detail.questions.filter((q) => q.state === "open");
  const currentRun = detail.runs.find((run) => run.status === "running") || detail.runs[0];

  async function run(name: string, fn: () => Promise<unknown>) {
    setAction(name); setError("");
    try { await fn(); await onChanged(); } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed");
    } finally { setAction(""); }
  }

  return (
    <article className="desk-detail">
      <header className="desk-detail-header">
        <div className="desk-title-line"><span className="desk-kicker">{detail.kind} · {detail.executor_preference || "auto"}</span><span className={`desk-status status-${detail.status}`}><StatusMark status={detail.status} />{STATUS_LABEL[detail.status]}</span></div>
        <h1>{detail.title}</h1>
        <p>{detail.description}</p>
        <div className="desk-detail-meta"><span>{detail.repository || "No repository"}</span>{detail.branch && <span>{detail.branch}</span>}<span>Updated {relativeTime(detail.updated_at)} ago</span></div>
      </header>

      <section className="desk-progress" aria-label={`${detail.progress.percent}% complete`}>
        <div><span className="desk-kicker">Accepted progress</span><strong>{detail.progress.percent}%</strong></div>
        <div className="desk-progress-track"><span style={{ width: `${detail.progress.percent}%` }} /></div>
        <p>{detail.progress.completed_steps} of {detail.progress.total_steps} steps have accepted evidence.</p>
      </section>

      {openQuestions.map((question) => (
        <section className="desk-attention" key={question.id}>
          <span className="desk-kicker">Input required</span><h2>{question.prompt}</h2>
          <textarea rows={4} value={answers[question.id] || ""} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} placeholder="Write the information the agent needs." />
          <button className="desk-button desk-button-dark" disabled={!answers[question.id]?.trim() || !!action} onClick={() => run(`answer-${question.id}`, () => answerQuestion(token, detail, question.id, answers[question.id]))}>{action === `answer-${question.id}` ? "Sending…" : "Answer and resume"} <ArrowIcon /></button>
        </section>
      ))}

      {detail.status === "awaiting_plan_approval" && detail.plan && (
        <section className="desk-plan-ready">
          <div><span className="desk-kicker">Plan {detail.plan_version} ready</span><h2>Review before implementation starts.</h2><p>{detail.plan.summary}</p></div>
          <button className="desk-button desk-button-dark" disabled={!!action} onClick={() => run("approve", () => approvePlan(token, detail))}>{action === "approve" ? "Approving…" : "Approve plan"} <ArrowIcon /></button>
        </section>
      )}

      <section className="desk-section">
        <div className="desk-section-heading"><div><span className="desk-kicker">Current plan</span><h2>Work steps</h2></div><span>{detail.steps.length} steps</span></div>
        {detail.steps.length ? <ol className="desk-steps">{detail.steps.map((step) => <li key={step.id}><span className={`desk-step-index step-${step.status}`}>{step.status === "completed" ? "✓" : String(step.step_order + 1).padStart(2, "0")}</span><div><strong>{step.title}</strong><p>{step.description || step.phase}</p>{step.evidence && <code>{Object.keys(step.evidence).join(" · ")}</code>}</div><span className="desk-step-weight">{Number(step.weight)}%</span></li>)}</ol> : <p className="desk-muted">The planner has not returned named steps yet.</p>}
      </section>

      <section className="desk-section desk-run-grid">
        <div><span className="desk-kicker">Current run</span><h2>{currentRun ? `${currentRun.phase} · ${currentRun.status}` : "Waiting for a worker"}</h2>{currentRun && <dl><div><dt>Worker</dt><dd>{currentRun.worker_id || "unassigned"}</dd></div><div><dt>Model</dt><dd>{currentRun.model || "—"}</dd></div><div><dt>Lane</dt><dd>{currentRun.lane}</dd></div></dl>}</div>
        <div><span className="desk-kicker">Outputs</span><h2>{detail.pull_request_url || detail.artifact_url ? "Ready to inspect" : "Nothing published yet"}</h2><div className="desk-output-links">{detail.pull_request_url && <a href={detail.pull_request_url} target="_blank" rel="noreferrer">Open pull request <ArrowIcon /></a>}{detail.artifact_url && <a href={detail.artifact_url} target="_blank" rel="noreferrer">Open artifact <ArrowIcon /></a>}{detail.verified_commit_sha && <code>{detail.verified_commit_sha.slice(0, 10)}</code>}</div></div>
      </section>

      <section className="desk-section">
        <div className="desk-section-heading"><div><span className="desk-kicker">Record</span><h2>Activity</h2></div><span>{detail.events.length} events</span></div>
        <ol className="desk-timeline">{detail.events.length ? detail.events.slice().reverse().map((event) => <li key={event.id}><span /><div><strong>{event.event_type.replaceAll("_", " ")}</strong><p>{event.actor_type} · {new Date(event.created_at).toLocaleString()}</p></div></li>) : <li><span /><div><strong>No recorded events</strong></div></li>}</ol>
      </section>

      {!TERMINAL.has(detail.status) && <footer className="desk-danger"><div><strong>Stop this task</strong><p>Active workers are asked to stop safely before the task becomes cancelled.</p></div><button className="desk-button desk-button-light" disabled={!!action || detail.cancel_requested} onClick={() => run("cancel", () => cancelTask(token, detail))}>{detail.cancel_requested ? "Cancellation requested" : action === "cancel" ? "Requesting…" : "Cancel task"}</button></footer>}
      {error && <p className="desk-error desk-action-error" role="alert">{error}</p>}
    </article>
  );
}

export default function AgentDesk() {
  const [token, setToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [org, setOrg] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { setToken(sessionStorage.getItem(TOKEN_KEY)); setHydrated(true); }, []);
  useEffect(() => {
    if (!token) return;
    getMemberships(token).then((items) => {
      setMemberships(items); setOrg((current) => current || items[0]?.org_slug || "");
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load organizations"));
  }, [token]);

  const refresh = useCallback(async (quiet = false) => {
    if (!token || !org) return;
    if (!quiet) setLoading(true);
    try {
      const [nextTasks, nextWorkers] = await Promise.all([listTasks(token, org), listWorkers(token, org)]);
      setTasks(nextTasks); setWorkers(nextWorkers); setError("");
      const target = selectedId || nextTasks[0]?.id;
      if (target) { setSelectedId(target); setDetail(await getTask(token, target)); }
      else setDetail(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not refresh the desk"); }
    finally { setLoading(false); }
  }, [token, org, selectedId]);

  useEffect(() => { refresh(); }, [org, token]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!token || !org) return;
    const timer = window.setInterval(() => refresh(true), 5000);
    return () => window.clearInterval(timer);
  }, [token, org, refresh]);

  async function selectTask(id: string) {
    if (!token) return;
    setSelectedId(id); setDetail(null);
    try { setDetail(await getTask(token, id)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load task"); }
  }

  async function handleCreated(task: Task) {
    setCreating(false);
    setSelectedId(task.id);
    setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
    if (!token) return;
    try { setDetail(await getTask(token, task.id)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Task started, but its detail could not be loaded"); }
  }

  async function handleImported(result: BatchImport) {
    setImporting(false);
    const first = result.tasks[0];
    if (first) setSelectedId(first.id);
    if (!token || !org) return;
    try {
      const nextTasks = await listTasks(token, org);
      setTasks(nextTasks);
      if (first) setDetail(await getTask(token, first.id));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Tasks were imported, but the desk could not refresh");
    }
  }

  const filtered = useMemo(() => tasks.filter((task) => {
    if (filter === "attention") return ["needs_input", "awaiting_plan_approval", "ready_for_you", "failed"].includes(task.status);
    if (filter === "active") return ACTIVE.has(task.status);
    if (filter === "done") return TERMINAL.has(task.status);
    return true;
  }), [tasks, filter]);
  const attentionCount = tasks.filter((task) => ["needs_input", "awaiting_plan_approval", "ready_for_you", "failed"].includes(task.status)).length;
  const healthyWorkers = workers.filter((worker) => ["healthy", "busy"].includes(worker.status)).length;

  if (!hydrated) return <div className="desk-loading">Opening desk…</div>;
  if (!token) return <SignIn />;

  return (
    <div className="desk-shell">
      <header className="desk-topbar"><a href="/" className="desk-logo"><img src="/logo_egregore.svg" alt="Egregore" /></a><span className="desk-topbar-title">Desk</span><div className="desk-topbar-actions"><label className="desk-org"><span>Organization</span><select value={org} onChange={(e) => { setOrg(e.target.value); setSelectedId(""); }}>{memberships.map((m) => <option key={m.org_slug} value={m.org_slug}>{m.org_name || m.org_slug}</option>)}</select></label><span className="desk-workers"><i className={healthyWorkers ? "is-live" : ""} />{healthyWorkers}/{workers.length} workers</span><button className="desk-button desk-button-light desk-import-trigger" onClick={() => setImporting(true)}>Import Markdown</button><button className="desk-button desk-button-dark" onClick={() => setCreating(true)}>New task <span>+</span></button></div></header>
      <div className="desk-workspace">
        <aside className="desk-sidebar"><div className="desk-sidebar-head"><div><span className="desk-kicker">Organization work</span><strong>{tasks.length} tasks</strong></div><button className="desk-refresh" onClick={() => refresh()} aria-label="Refresh">↻</button></div><nav className="desk-filters" aria-label="Task filters">{(["all", "attention", "active", "done"] as Filter[]).map((item) => <button key={item} className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>{item === "attention" ? "Needs you" : item}<span>{item === "all" ? tasks.length : item === "attention" ? attentionCount : item === "active" ? tasks.filter((t) => ACTIVE.has(t.status)).length : tasks.filter((t) => TERMINAL.has(t.status)).length}</span></button>)}</nav><div className="desk-task-list">{filtered.map((task) => <button key={task.id} className={`desk-task ${selectedId === task.id ? "is-selected" : ""}`} onClick={() => selectTask(task.id)}><div><StatusMark status={task.status} /><span>{STATUS_LABEL[task.status]}</span><time>{relativeTime(task.updated_at)}</time></div><strong>{task.title}</strong><p>{task.repository || task.kind}</p></button>)}</div></aside>
        <main className="desk-content">{error && <div className="desk-banner" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}{loading && !detail ? <div className="desk-loading">Loading work…</div> : !tasks.length ? <EmptyDesk onCreate={() => setCreating(true)} /> : detail ? <Detail detail={detail} token={token} onChanged={() => refresh()} /> : <div className="desk-loading">Loading task…</div>}</main>
      </div>
      {creating && <CreatePanel org={org} token={token} onClose={() => setCreating(false)} onCreated={handleCreated} />}
      {importing && <ImportPanel org={org} token={token} onClose={() => setImporting(false)} onImported={handleImported} />}
    </div>
  );
}
