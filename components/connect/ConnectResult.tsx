"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Verification =
  | "device"
  | "ready"
  | "cancelled"
  | "checking"
  | "confirmed"
  | "processing"
  | "pending"
  | "unknown";

type CheckoutStatus = {
  payment_confirmed?: boolean;
};

export default function ConnectResult() {
  const searchParams = useSearchParams();
  const checkout = useMemo(
    () => ({
      outcome: searchParams.get("checkout"),
      sessionId: searchParams.get("session_id"),
      intent: searchParams.get("intent"),
      deviceCode: searchParams.get("code"),
    }),
    [searchParams],
  );
  const deviceApproval = Boolean(checkout.deviceCode);
  const cancelled = ["cancelled", "canceled"].includes(checkout.outcome ?? "");
  const [verification, setVerification] = useState<Verification>(
    deviceApproval
      ? "device"
      : cancelled
      ? "cancelled"
      : checkout.outcome === "success" && checkout.sessionId
        ? "checking"
        : checkout.intent && checkout.sessionId
          ? "ready"
        : "unknown",
  );

  useEffect(() => {
    if (!checkout.deviceCode) return;
    window.location.replace(
      `/connect/device?code=${encodeURIComponent(checkout.deviceCode)}`,
    );
  }, [checkout.deviceCode]);

  useEffect(() => {
    if (
      deviceApproval ||
      cancelled ||
      checkout.outcome !== "success" ||
      !checkout.sessionId
    ) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4500);

    fetch(
      `/api/billing/checkout/${encodeURIComponent(checkout.sessionId)}/status`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error(`status ${response.status}`);
        return (await response.json()) as CheckoutStatus;
      })
      .then((data) => {
        setVerification(data.payment_confirmed ? "confirmed" : "processing");
      })
      .catch(() => setVerification("pending"))
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [deviceApproval, cancelled, checkout.outcome, checkout.sessionId]);

  const content = {
    device: {
      marker: "device approval",
      title: "Opening device approval.",
      body: "Continue in the secure Egregore device flow.",
    },
    ready: {
      marker: "ready",
      title: "Connect this Egregore.",
      body: "Add the hosted graph, coordination state, and Connected infrastructure to the Egregore already on this machine.",
    },
    confirmed: {
      marker: "confirmed",
      title: "Payment confirmed.",
      body: "Your Connected entitlement is ready for provisioning.",
    },
    checking: {
      marker: "checking",
      title: "Checkout complete.",
      body: "Confirming the subscription with Stripe.",
    },
    processing: {
      marker: "processing",
      title: "Payment processing.",
      body: "Stripe accepted the Checkout and is finalizing payment.",
    },
    pending: {
      marker: "confirmation pending",
      title: "Checkout complete.",
      body: "The activation service is temporarily unavailable. Stripe will retry delivery; your payment record is not lost.",
    },
    cancelled: {
      marker: "not purchased",
      title: "Checkout cancelled.",
      body: "No Connected entitlement was created. Your local Egregore is unchanged.",
    },
    unknown: {
      marker: "return incomplete",
      title: "We could not identify this Checkout.",
      body: "Return to the terminal and start the Connect flow again.",
    },
  }[verification];
  const checkoutStart =
    checkout.intent && checkout.sessionId
      ? `/api/billing/checkout/${encodeURIComponent(checkout.sessionId)}/start?intent=${encodeURIComponent(checkout.intent)}`
      : "";

  return (
    <main className="upgrade-page">
      <div className="upgrade-grid" aria-hidden="true" />
      <header className="upgrade-header">
        <Link className="upgrade-wordmark" href="/">
          Egregore
        </Link>
        <span className="upgrade-environment">Connected</span>
      </header>

      <section className="upgrade-result" aria-live="polite">
        <p className="upgrade-kicker">Subscription / {content.marker}</p>
        <h1>{content.title}</h1>
        <p className="upgrade-lede">{content.body}</p>
        {verification === "ready" && (
          <div className="upgrade-offer">
            <p className="upgrade-price">
              <strong>€500</strong>
              <span>per month</span>
            </p>
            <p>
              Markdown, Git history, branches, and memory stay in place. After
              payment, the CLI projects the existing history into the graph.
            </p>
          </div>
        )}

        {!deviceApproval && !cancelled && verification !== "unknown" && (
          <ol className="upgrade-steps">
            <li>
              <span>01</span>
              <div>
                <strong>Entitlement</strong>
                <p>Stripe confirms the subscription through a signed webhook.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Provisioning</strong>
                <p>The organization and people nodes are created in the graph.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Backfill</strong>
                <p>Existing memory is enriched without replacing local files.</p>
              </div>
            </li>
          </ol>
        )}

        {verification === "ready" ? (
          <div className="upgrade-checkout">
            <a className="upgrade-checkout-button" href={checkoutStart}>
              Continue to Stripe
            </a>
            <p>Promotion codes for one or three free months are entered in Stripe.</p>
          </div>
        ) : (
          <div className="upgrade-actions">
            <p>Return to the terminal to continue.</p>
            <Link href="/">egregore.xyz ↗</Link>
          </div>
        )}
      </section>

      <footer className="upgrade-footer">
        <span>Egregore Connect</span>
        <span>Local memory remains the source of truth.</span>
      </footer>
    </main>
  );
}
