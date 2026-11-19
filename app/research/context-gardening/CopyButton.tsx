"use client";

export default function CopyButton() {
  return (
    <button
      className="cta-pill"
      onClick={() =>
        navigator.clipboard.writeText("npx create-egregore@latest")
      }
    >
      <span className="cmd-npx">npx</span>{" "}
      <span className="cmd-pkg">create-egregore@latest</span>
    </button>
  );
}
