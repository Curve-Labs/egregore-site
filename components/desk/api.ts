const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://egregore-production-55f2.up.railway.app";

export const TOKEN_KEY = "egregore_github_token";

export type TaskStatus =
  | "draft" | "planning" | "awaiting_plan_approval" | "queued" | "running"
  | "verifying" | "reviewing" | "ready_for_you" | "needs_input"
  | "paused_quota" | "done" | "failed" | "cancelled";

export type Task = {
  id: string;
  org_slug: string;
  title: string;
  description: string;
  kind: "code" | "research" | "content" | "operations";
  status: TaskStatus;
  phase?: string | null;
  priority: number;
  repository?: string | null;
  base_branch?: string | null;
  branch?: string | null;
  verified_commit_sha?: string | null;
  pull_request_url?: string | null;
  artifact_url?: string | null;
  executor_preference?: "claude" | "codex" | null;
  network_policy: "off" | "allowed";
  acceptance_criteria?: unknown[];
  plan?: { summary?: string; risks?: string[]; steps?: unknown[] } | null;
  plan_version: number;
  plan_content_hash?: string | null;
  row_version: number;
  cancel_requested?: boolean;
  updated_at?: string;
  created_at?: string;
  batch_id?: string | null;
  batch_ref?: string | null;
};

export type TaskStep = {
  id: string;
  step_order: number;
  phase: string;
  title: string;
  description?: string | null;
  weight: number;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  evidence?: Record<string, unknown> | null;
  evidence_accepted_at?: string | null;
};

export type TaskQuestion = {
  id: string;
  prompt: string;
  options?: unknown[];
  state: "open" | "answered" | "expired" | "cancelled";
  answer?: Record<string, unknown> | null;
  created_at?: string;
};

export type TaskRun = {
  id: string;
  phase: string;
  lane: string;
  harness?: string | null;
  model?: string | null;
  worker_id?: string | null;
  status: string;
  result_summary?: string | null;
  commit_sha?: string | null;
  created_at?: string;
};

export type TaskEvent = {
  id: string;
  event_type: string;
  actor_type: string;
  payload?: Record<string, unknown>;
  created_at: string;
};

export type TaskApproval = {
  id: string;
  action: string;
  state: string;
  plan_version?: number | null;
  created_at?: string;
};

export type TaskDetail = Task & {
  steps: TaskStep[];
  questions: TaskQuestion[];
  runs: TaskRun[];
  events: TaskEvent[];
  approvals: TaskApproval[];
  progress: {
    completed_steps: number;
    total_steps: number;
    completed_weight: number;
    total_weight: number;
    percent: number;
  };
};

export type Worker = {
  id: string;
  status: "healthy" | "busy" | "degraded" | "auth_expired" | "quota_paused" | "offline";
  models?: string[];
  queues?: string[];
  capacity?: {
    cpu_count?: number;
    load_per_cpu?: number | null;
    memory_available_mb?: number | null;
    disk_free_mb?: number;
    max_parallel_jobs?: number;
    current_jobs?: number;
    available_slots?: number;
  };
  current_run_id?: string | null;
  last_heartbeat_at?: string | null;
};

export type Membership = {
  org_slug: string;
  org_name: string;
  in_telegram_group?: boolean;
};

export type CreateTask = {
  org_slug: string;
  title: string;
  description: string;
  kind: Task["kind"];
  repository?: string;
  base_branch?: string;
  executor_preference?: "claude" | "codex";
  network_policy: "off" | "allowed";
  acceptance_criteria: string[];
};

export type BatchPreviewTask = {
  ref: string;
  title: string;
  description: string;
  kind: Task["kind"];
  priority: number;
  repository?: string | null;
  base_branch?: string | null;
  executor_preference?: "claude" | "codex" | null;
  network_policy: "off" | "allowed";
  acceptance_criteria: string[];
  constraints: string[];
  depends_on: string[];
};

export type BatchPreview = {
  title: string;
  source_hash: string;
  defaults: Record<string, string>;
  tasks: BatchPreviewTask[];
  dependencies: Array<{
    task_ref: string;
    depends_on_ref: string;
    policy: "require_done";
  }>;
  execution_order: string[];
  task_count: number;
  dependency_count: number;
};

export type BatchImport = {
  batch: { id: string; title?: string };
  tasks: Task[];
  reused: boolean;
  preview: BatchPreview;
};

async function request<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const baseUrl = token ? API_URL : "";
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail;
    const message = typeof detail === "string"
      ? detail
      : Array.isArray(detail?.errors)
        ? detail.errors.join("\n")
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

export async function getMemberships(token: string | null): Promise<Membership[]> {
  const profile = await request<{ memberships?: Membership[] }>("/api/v1/tasks/desk/session", token);
  return profile.memberships || [];
}

export async function listTasks(token: string | null, orgSlug: string): Promise<Task[]> {
  const data = await request<{ tasks: Task[] }>(
    `/api/v1/tasks?org_slug=${encodeURIComponent(orgSlug)}`,
    token,
  );
  return data.tasks;
}

export function getTask(token: string | null, taskId: string): Promise<TaskDetail> {
  return request(`/api/v1/tasks/${encodeURIComponent(taskId)}`, token);
}

export async function listWorkers(token: string | null, orgSlug: string): Promise<Worker[]> {
  const data = await request<{ workers: Worker[] }>(
    `/api/v1/tasks/desk/workers?org_slug=${encodeURIComponent(orgSlug)}`,
    token,
  );
  return data.workers;
}

export function createTask(token: string | null, body: CreateTask, requestId: string): Promise<Task> {
  return request("/api/v1/tasks", token, {
    method: "POST",
    headers: { "X-Idempotency-Key": requestId },
    body: JSON.stringify(body),
  });
}

export function previewTaskBatch(
  token: string | null,
  orgSlug: string,
  markdown: string,
): Promise<BatchPreview> {
  return request("/api/v1/task-batches/preview", token, {
    method: "POST",
    body: JSON.stringify({ org_slug: orgSlug, markdown }),
  });
}

export function importTaskBatch(
  token: string | null,
  orgSlug: string,
  markdown: string,
  requestId: string,
): Promise<BatchImport> {
  return request("/api/v1/task-batches/import", token, {
    method: "POST",
    headers: { "X-Idempotency-Key": requestId },
    body: JSON.stringify({ org_slug: orgSlug, markdown }),
  });
}

export function approvePlan(
  token: string | null,
  task: Task,
  executor?: "claude" | "codex",
): Promise<Task> {
  return request(`/api/v1/tasks/${task.id}/approve-plan`, token, {
    method: "POST",
    body: JSON.stringify({
      plan_version: task.plan_version,
      plan_content_hash: task.plan_content_hash,
      channel: "desk",
      executor,
    }),
  });
}

export function answerQuestion(
  token: string | null,
  task: Task,
  questionId: string,
  text: string,
): Promise<Task> {
  return request(`/api/v1/tasks/${task.id}/questions/${questionId}/answer`, token, {
    method: "POST",
    body: JSON.stringify({
      expected_row_version: task.row_version,
      answer: { text },
      channel: "desk",
    }),
  });
}

export function cancelTask(token: string | null, task: Task): Promise<Task> {
  return request(`/api/v1/tasks/${task.id}/cancel`, token, {
    method: "POST",
    body: JSON.stringify({ expected_row_version: task.row_version }),
  });
}

export function completeTask(token: string | null, task: Task): Promise<Task> {
  return request(`/api/v1/tasks/${task.id}/complete`, token, {
    method: "POST",
    body: JSON.stringify({ expected_row_version: task.row_version, channel: "desk" }),
  });
}
