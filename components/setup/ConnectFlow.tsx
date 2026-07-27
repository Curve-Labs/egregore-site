"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  createConnectCheckout,
  getConnectCheckoutStatus,
  getConnectContext,
  type ConnectContext,
} from "./api";
import "./setup.css";

const CAPABILITIES = [
  ["Source memory", "Markdown + Git", "Same Markdown + Git"],
  ["Branches/worktrees", "Full", "Full"],
  ["/save, /wrap, /handoff, /quest, /ask, /todo", "Full explicit rituals", "Same rituals plus lifecycle state"],
  ["Search", "Local hybrid/file search", "Graph-enriched, relational search; file fallback"],
  ["Artifacts", "Local or quota/TTL-limited hosting", "Permanent branded URLs and boards"],
  ["Handoffs", "Files; limited shared status", "Read, claimed, done, auto-resolved"],
  ["/activity", "Derived from Git/files", "Live sessions, presence and handoff state"],
  ["Notifications", "Group relay/fallback", "Real Telegram DMs"],
  ["Harvest", "Solo/degraded path", "Async multiplayer elicitation"],
  ["Pulse", "No ambient hosted synthesis", "Post-session synthesis and greeting briefs"],
  ["/deep-reflect", "Local reflection fallback", "Graph-cross-referenced reflection"],
  ["Graph", "None required", "People, sessions, artifacts, quests and relationships"],
  ["Loom", "Local execution visibility", "Durable route ledger and savings reporting"],
  ["Dashboards", "Local/generated views", "Hosted, persistent views"],
] as const;

const ACTIVATION_STAGES = [
  { id: "checkout_pending", label: "Payment", detail: "Stripe confirms the subscription" },
  { id: "entitled", label: "Entitlement", detail: "Connected access is recorded" },
  { id: "provisioning", label: "Infrastructure", detail: "Organization and graph scope are prepared" },
  { id: "backfilling", label: "Backfill", detail: "The terminal is projecting existing memory" },
  { id: "connected", label: "Connected", detail: "Backfill complete; hosted capabilities are active" },
] as const;

type PackageChoice = "local" | "connect";
type PaymentState = "idle" | "checking" | "confirmed" | "processing" | "pending";

function CheckMark() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
      <path d="m4 10 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function IdentityCard({ context }: { context: ConnectContext }) {
  const actorLabel = context.actor.name || context.actor.login;
  return (
    <div className="connect-identity">
      <div className="connect-identity-person">
        {context.actor.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={context.actor.avatar_url} alt="" className="connect-avatar" />
        ) : (
          <span className="connect-avatar connect-avatar-fallback" aria-hidden="true">
            {actorLabel.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div>
          <span className="connect-meta-label">Authenticated through Egregore CLI</span>
          <strong>{actorLabel}</strong>
          {context.actor.login && <small>@{context.actor.login}</small>}
        </div>
      </div>
      <div className="connect-identity-org">
        <span className="connect-meta-label">Existing Egregore</span>
        <strong>{context.organization.name}</strong>
        <small>{context.organization.slug}</small>
      </div>
    </div>
  );
}

function PackageCard({
  id,
  choice,
  eyebrow,
  title,
  price,
  description,
  features,
  badge,
  onChoose,
}: {
  id: PackageChoice;
  choice: PackageChoice;
  eyebrow: string;
  title: string;
  price: string;
  description: string;
  features: string[];
  badge: string;
  onChoose: (choice: PackageChoice) => void;
}) {
  const selected = choice === id;
  return (
    <button
      type="button"
      className={`connect-package ${selected ? "is-selected" : ""}`}
      aria-pressed={selected}
      onClick={() => onChoose(id)}
    >
      <div className="connect-package-topline">
        <span>{eyebrow}</span>
        <span className={`connect-package-badge ${id === "connect" ? "is-accent" : ""}`}>{badge}</span>
      </div>
      <div className="connect-package-heading">
        <h2>{title}</h2>
        <div className="connect-package-price">
          <strong>{price}</strong>
          {id === "connect" && <small>per month</small>}
        </div>
      </div>
      <p>{description}</p>
      <ul>
        {features.map((feature) => (
          <li key={feature}><CheckMark /> {feature}</li>
        ))}
      </ul>
      <span className="connect-package-radio" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

function CapabilityTable() {
  return (
    <details className="connect-comparison">
      <summary>Compare all capabilities <span>14 capabilities</span></summary>
      <div className="connect-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Capability</th>
              <th>Open Source / Local</th>
              <th>Connected</th>
            </tr>
          </thead>
          <tbody>
            {CAPABILITIES.map(([capability, local, connected]) => (
              <tr key={capability}>
                <th scope="row">{capability}</th>
                <td>{local}</td>
                <td>{connected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ActivationStatus({
  context,
  paymentState,
}: {
  context: ConnectContext;
  paymentState: PaymentState;
}) {
  const currentIndex = ACTIVATION_STAGES.findIndex((stage) => stage.id === context.status);
  const effectiveIndex = currentIndex >= 0 ? currentIndex : paymentState === "confirmed" ? 1 : 0;
  const activationComplete = context.status === "connected";
  const backfillActive = context.status === "backfilling";
  const provisioningActive = context.status === "provisioning";
  const heading = activationComplete
    ? "Your Egregore is connected."
    : backfillActive
      ? "Backfilling your Egregore."
      : provisioningActive
        ? "Preparing Connected infrastructure."
        : context.status === "entitled"
          ? "Subscription confirmed."
          : paymentState === "confirmed"
            ? "Payment confirmed."
            : "Checkout complete.";
  const description = activationComplete
    ? "The historical graph backfill is complete. Your local Markdown and Git history remain the source of truth."
    : backfillActive
      ? "You can close this page. Keep the terminal open while sessions, artifacts, quests, and ingest history are projected into the graph."
      : "You can close this page. Keep the terminal open while provisioning and the historical graph backfill continue.";
  const terminalTitle = activationComplete
    ? "Backfill complete"
    : "You can close this page";
  const terminalDetail = activationComplete
    ? "Return to the terminal for the final backfill counts."
    : backfillActive
      ? "Keep the terminal open. It will show the exact counts when projection finishes."
      : "Keep the terminal open. Provisioning continues there automatically after payment.";

  return (
    <div className="setup-stage connect-flow">
      <div className="setup-stage-centered connect-result-heading">
        <div className="setup-success-check"><CheckMark /></div>
        <p className="setup-eyebrow">Egregore Connect</p>
        <h1 className="setup-title setup-title-lg">{heading}</h1>
        <p className="setup-sub">{description}</p>
      </div>

      <IdentityCard context={context} />

      <ol className="connect-activation">
        {ACTIVATION_STAGES.map((stage, index) => {
          const complete = activationComplete ? index <= effectiveIndex : index < effectiveIndex;
          const active = !activationComplete && index === effectiveIndex;
          return (
            <li key={stage.id} className={`${complete ? "is-complete" : ""} ${active ? "is-active" : ""}`}>
              <span className="connect-activation-mark">{complete ? <CheckMark /> : String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{stage.label}</strong>
                <p>{stage.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="connect-terminal-note">
        {activationComplete ? (
          <span className="connect-terminal-check" aria-hidden="true"><CheckMark /></span>
        ) : (
          <span className="connect-terminal-pulse" aria-hidden="true" />
        )}
        <div>
          <strong>{terminalTitle}</strong>
          <p>{terminalDetail}</p>
        </div>
      </div>
    </div>
  );
}

export default function ConnectFlow() {
  const params = useSearchParams();
  const intentId = params.get("intent") || "";
  const ticket = params.get("ticket") || "";
  const checkout = (params.get("checkout") || "").toLowerCase();
  const sessionId = params.get("session_id") || "";
  const deviceCode = params.get("code") || "";

  const [context, setContext] = useState<ConnectContext | null>(null);
  const [choice, setChoice] = useState<PackageChoice>("connect");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [localConfirmed, setLocalConfirmed] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState>(
    checkout === "success" ? "checking" : "idle",
  );

  const isCheckoutReturn = checkout === "success" && Boolean(sessionId);
  const isCancelled = ["cancelled", "canceled"].includes(checkout);

  useEffect(() => {
    if (deviceCode && !intentId) {
      window.location.replace(`/connect/device?code=${encodeURIComponent(deviceCode)}`);
    }
  }, [deviceCode, intentId]);

  useEffect(() => {
    if (!intentId || !ticket) {
      if (!deviceCode) {
        setError("This Connect link is incomplete. Start again from the Egregore CLI.");
        setLoading(false);
      }
      return;
    }
    let cancelled = false;
    getConnectContext(intentId, ticket)
      .then((data) => {
        if (!cancelled) setContext(data);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load this Connect intent.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [deviceCode, intentId, ticket]);

  useEffect(() => {
    if (!isCheckoutReturn || !sessionId) return;
    let stopped = false;
    const check = async () => {
      try {
        const status = await getConnectCheckoutStatus(sessionId);
        if (!stopped) {
          setPaymentState(
            status.payment_confirmed
              ? "confirmed"
              : status.checkout_status === "complete"
                ? "processing"
                : "pending",
          );
        }
      } catch {
        if (!stopped) setPaymentState("pending");
      }
    };
    void check();
    return () => { stopped = true; };
  }, [isCheckoutReturn, sessionId]);

  useEffect(() => {
    if (!isCheckoutReturn || !intentId || !ticket) return;
    const interval = window.setInterval(() => {
      getConnectContext(intentId, ticket)
        .then(setContext)
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(interval);
  }, [intentId, isCheckoutReturn, ticket]);

  const subtitle = useMemo(() => {
    if (!context) return "";
    const repo = context.instance.repo_name ? ` · ${context.instance.repo_name}` : "";
    return `${context.organization.name}${repo}`;
  }, [context]);

  const beginCheckout = async () => {
    if (!context) return;
    if (choice === "local") {
      setLocalConfirmed(true);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await createConnectCheckout(intentId, ticket);
      window.location.assign(result.checkout_url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start Stripe Checkout.");
      setSubmitting(false);
    }
  };

  if (loading || (deviceCode && !intentId)) {
    return (
      <div className="setup-stage setup-stage-centered">
        <div className="setup-spinner" />
        <p className="setup-sub">Loading your Egregore…</p>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="setup-stage setup-stage-centered">
        <p className="setup-eyebrow">Egregore Connect</p>
        <h1 className="setup-title">This Connect link is unavailable.</h1>
        <p className="setup-sub">{error}</p>
        <div className="connect-command">egregore connect</div>
      </div>
    );
  }

  if (isCheckoutReturn) {
    return <ActivationStatus context={context} paymentState={paymentState} />;
  }

  if (localConfirmed) {
    return (
      <div className="setup-stage connect-flow">
        <div className="setup-stage-centered">
          <p className="setup-eyebrow">Open Source / Local</p>
          <h1 className="setup-title setup-title-lg">Nothing changed.</h1>
          <p className="setup-sub">
            {context.organization.name} stays Local. Return to the terminal; your existing Egregore continues as before.
          </p>
        </div>
        <IdentityCard context={context} />
      </div>
    );
  }

  return (
    <div className="setup-stage connect-flow">
      <div className="connect-heading">
        <p className="setup-eyebrow">Existing Egregore · {subtitle}</p>
        <h1 className="setup-title setup-title-lg">Choose how your Egregore runs.</h1>
        <p className="setup-sub">
          The public runtime, Markdown memory, and Git history stay the same. Connected adds the hosted graph and coordination infrastructure around them.
        </p>
      </div>

      <IdentityCard context={context} />

      {isCancelled && (
        <div className="connect-notice">
          Checkout was cancelled. No entitlement was created and your local Egregore is unchanged.
        </div>
      )}

      <div className="connect-packages" aria-label="Egregore packages">
        <PackageCard
          id="local"
          choice={choice}
          eyebrow="Open source"
          title="Local"
          price="€0"
          description="The complete inspectable runtime with Git and Markdown as the source of truth."
          badge="Current"
          features={[
            "Full branches, worktrees, and explicit rituals",
            "Local hybrid and file search",
            "Local and generated views",
          ]}
          onChoose={setChoice}
        />
        <PackageCard
          id="connect"
          choice={choice}
          eyebrow="Hosted service plane"
          title="Connected"
          price="€500"
          description="Everything in Local, enriched by durable coordination and hosted intelligence."
          badge="Selected"
          features={[
            "Graph-enriched relational search",
            "Live lifecycle, presence, and notifications",
            "Permanent artifacts and hosted dashboards",
          ]}
          onChoose={setChoice}
        />
      </div>

      <CapabilityTable />

      {error && <div className="setup-error">{error}</div>}

      <div className="connect-checkout-bar">
        <div>
          <strong>{choice === "connect" ? "Egregore Connect · €500/month" : "Open Source / Local · €0"}</strong>
          <span>
            {choice === "connect"
              ? "One- and three-month promotion codes can be entered in Stripe."
              : "No payment. No infrastructure changes."}
          </span>
        </div>
        <button
          type="button"
          className={`setup-btn ${choice === "connect" ? "setup-btn-accent" : "setup-btn-secondary"}`}
          onClick={() => void beginCheckout()}
          disabled={submitting}
        >
          {submitting
            ? "Opening Stripe…"
            : choice === "connect"
              ? "Continue to secure checkout"
              : "Keep Local"}
        </button>
      </div>
    </div>
  );
}
