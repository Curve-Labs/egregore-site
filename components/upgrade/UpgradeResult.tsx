"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Verification =
  | "cancelled"
  | "checking"
  | "confirmed"
  | "processing"
  | "pending"
  | "unknown";

type CheckoutStatus = {
  payment_confirmed?: boolean;
};

export default function UpgradeResult() {
  const searchParams = useSearchParams();
  const checkout = useMemo(
    () => ({
      outcome: searchParams.get("checkout"),
      sessionId: searchParams.get("session_id"),
    }),
    [searchParams],
  );
  const cancelled = ["cancelled", "canceled"].includes(checkout.outcome ?? "");
  const [verification, setVerification] = useState<Verification>(
    cancelled
      ? "cancelled"
      : checkout.outcome === "success" && checkout.sessionId
        ? "checking"
        : "unknown",
  );

  useEffect(() => {
    if (cancelled || checkout.outcome !== "success" || !checkout.sessionId) {
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
  }, [cancelled, checkout.outcome, checkout.sessionId]);

  const content = {
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

        {!cancelled && verification !== "unknown" && (
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

        <div className="upgrade-actions">
          <p>Return to the terminal to continue.</p>
          <Link href="/">egregore.xyz ↗</Link>
        </div>
      </section>

      <footer className="upgrade-footer">
        <span>Egregore Connect</span>
        <span>Local memory remains the source of truth.</span>
      </footer>
    </main>
  );
}
