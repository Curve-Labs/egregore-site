"use client";

import { useCallback, useState } from "react";

export function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// A secondary-styled copy button — matches the setup flow's CopyButton.
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [value]);
  return (
    <button
      type="button"
      className="setup-btn setup-btn-secondary"
      onClick={onClick}
      aria-label={label}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span style={{ marginLeft: 8 }}>{copied ? "Copied" : label}</span>
    </button>
  );
}

// A dark terminal-style command block with an inline copy button.
// Reuses the .setup-install-* classes from setup.css.
export function CommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(() => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [command]);
  return (
    <div className="setup-install-body">
      <code>{command}</code>
      <button
        type="button"
        className="setup-install-copy"
        onClick={onCopy}
        aria-label="Copy command"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
