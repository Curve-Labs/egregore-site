import type { Metadata } from "next";
import Link from "next/link";
import "./pricing.css";

export const metadata: Metadata = {
  title: "Pricing — Egregore",
  description:
    "Start with open-source Egregore. Add connected organizational memory when your team's work needs a shared, durable home.",
  alternates: { canonical: "/pricing" },
};

const tiers = [
  {
    name: "Free",
    price: "$0",
    cadence: "/ forever",
    note: "Open source",
    description: "A durable shared record, built as your team works.",
    features: [
      "Shared memory that grows with every session",
      "Works across Claude Code, Codex, and Pi",
      "Search everything your team has written",
      "Automated branching, commits, and pull-request hygiene",
      "Render your work as beautiful temporary links",
      "Community support",
    ],
    cta: "Start free",
    href: "/docs/guides/installation",
  },
  {
    name: "Connected",
    price: "$500",
    cadence: "/ month · team",
    note: "Hosted organizational memory",
    description:
      "A living organizational memory that connects people, decisions, meetings, and work—and brings the right context into every session.",
    features: [
      "Everything in Free",
      "A living graph of people, decisions, handoffs, meetings, and artifacts",
      "Relevant organizational context restored into every session",
      "Bring in your existing docs and query them alongside meetings, decisions, handoffs, and original evidence",
      "See open work, handoffs, questions, and knowledge growth across the team",
      "Publish permanent, branded surfaces for internal and external work",
      "Slack, Teams, and Telegram connections",
      "Guided setup, migration, and a dedicated support channel",
    ],
    cta: "Get connected",
    href: "mailto:info@egregore.xyz?subject=Egregore%20Connected",
    featured: true,
  },
  {
    name: "Egregore+",
    price: "Talk to us",
    cadence: "",
    note: "Custom infrastructure",
    description:
      "Your organization’s accumulated way of working, distilled into infrastructure and models you control.",
    features: [
      "Everything in Connected",
      "Your accumulated record distilled into a model for your organization",
      "Train, fine-tune, and deploy an open-source model for your team",
      "Memory and runtime deployed on your own infrastructure",
      "Governance, audit, retention, and SSO",
      "Multi-team topology and access scopes",
      "Priority support",
    ],
    cta: "Talk to us",
    href: "mailto:info@egregore.xyz?subject=Egregore%2B",
  },
];

export default function PricingPage() {
  return (
    <main className="pricing-page">
      <div className="pricing-grid" aria-hidden="true" />
      <div className="pricing-wizard" aria-hidden="true" />

      <header className="pricing-header">
        <Link href="/" aria-label="Egregore home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_egregore.svg" alt="Egregore" />
        </Link>
        <Link href="/docs" className="pricing-docs-link">
          Documentation
        </Link>
      </header>

      <section className="pricing-cards" aria-label="Pricing plans">
        {tiers.map((tier) => (
          <article
            className={`pricing-card${tier.featured ? " pricing-card-featured" : ""}`}
            key={tier.name}
          >
            <p className="pricing-tier">{tier.name}</p>
            <div className={`pricing-price${tier.cadence ? "" : " pricing-price-talk"}`}>
              {tier.price}
              {tier.cadence && <span>{tier.cadence}</span>}
            </div>
            <p className="pricing-note">{tier.note}</p>
            <p className="pricing-description">{tier.description}</p>
            <ul className="pricing-features">
              {tier.features.map((feature) => (
                <li key={feature}>
                  <span aria-hidden="true">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a className="pricing-cta" href={tier.href}>
              {tier.cta}
            </a>
          </article>
        ))}
      </section>

      <footer className="pricing-footer">
        <p>Questions about fit or infrastructure?</p>
        <a href="mailto:info@egregore.xyz">info@egregore.xyz</a>
      </footer>
    </main>
  );
}
