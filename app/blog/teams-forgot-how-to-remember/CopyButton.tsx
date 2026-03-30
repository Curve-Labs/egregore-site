"use client";

export default function CopyButton() {
  return (
    <button
      className="cta-pill"
      onClick={() =>
        navigator.clipboard.writeText("npx create-egregore@latest --local")
      }
    >
      <span className="cmd-npx">npx</span>{" "}
      <span className="cmd-pkg">create-egregore@latest</span>{" "}
      <span className="cmd-flag">--local</span>
    </button>
  );
}
