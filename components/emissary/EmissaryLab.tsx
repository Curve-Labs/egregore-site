"use client";

// The emissary test surface — appended below the install hub on /emissary,
// behind PasswordGate. Internal: real emissary links to copy and run while
// smoke-testing the receive flow.

import { CopyButton } from "./ui";
import "../setup/setup.css";
import "./emissary.css";

const SPIRAL_URL =
  "https://egregore.xyz/emissary/e/75bedab5-e4da-42c0-a955-cd360388442c";
const INSTALL_URL =
  "https://egregore.xyz/emissary/e/d9ba091e-2083-4546-8243-bae37f168bbc";

function EmissaryRow({
  label,
  title,
  desc,
  url,
}: {
  label: string;
  title: string;
  desc: string;
  url: string;
}) {
  return (
    <div className="em-section">
      <div className="em-section-label">{label}</div>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "16px",
          color: "var(--black)",
        }}
      >
        {title}
      </div>
      <p className="em-prose">{desc}</p>
      <div className="em-url-field">
        <code>{url}</code>
        <CopyButton value={url} label="Copy link" />
      </div>
    </div>
  );
}

export default function EmissaryLab() {
  return (
    <div className="setup-stage" style={{ marginTop: "8px" }}>
      <div className="em-or">
        <span>Test surface</span>
      </div>

      <p className="em-prose">
        Internal — for smoke-testing the receive flow. Paste a link below into
        any AI harness and watch it run. With <code>egregore-emissary</code>{" "}
        installed it runs clean; without it, cold (lossier, caveated).
      </p>

      <EmissaryRow
        label="Copy from · template"
        title="One ring of the Spiral"
        desc="A real example emissary — a Socratic pressure-test for a half-formed thesis. Copy it to see how a good emissary reads, or paste it into a harness to run it."
        url={SPIRAL_URL}
      />

      <EmissaryRow
        label="Install · try"
        title="Install egregore-emissary"
        desc="The bootstrap emissary. Run this one and it walks you through installing egregore-emissary — the cold-to-installed conversion, delivered as an emissary."
        url={INSTALL_URL}
      />

      <div className="em-section">
        <div className="em-section-label">MCP · not yet tested</div>
        <p className="em-prose">
          The MCP connector (claude.ai / ChatGPT) is wired through the Web chat
          path above, but it hasn&apos;t been smoke-tested end to end yet.
        </p>
      </div>
    </div>
  );
}
