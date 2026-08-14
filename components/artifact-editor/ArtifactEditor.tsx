"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  EditableArtifact,
  getEditableArtifact,
  getGitHubAuthUrl,
  saveEditableArtifact,
} from "@/components/setup/api";
import "./artifact-editor.css";

const TOKEN_KEY = "egregore_github_token";
const EDITABLE_ATTR = "data-eg-text-editable";
const EDITOR_STYLE_ID = "eg-text-editor-preview-style";
const BLOCKED_TAGS = new Set([
  "BODY", "MAIN", "SECTION", "ARTICLE", "HEADER", "FOOTER", "NAV",
  "SCRIPT", "STYLE", "SVG", "PATH", "CANVAS", "IFRAME", "OBJECT", "EMBED",
  "FORM", "BUTTON", "INPUT", "SELECT", "TEXTAREA", "UL", "OL", "TABLE",
  "THEAD", "TBODY", "TFOOT", "TR", "DL", "VIDEO", "AUDIO",
]);
const INLINE_TAGS = new Set([
  "A", "ABBR", "B", "BR", "CITE", "CODE", "DEL", "EM", "I", "INS",
  "KBD", "MARK", "Q", "S", "SAMP", "SMALL", "SPAN", "STRONG", "SUB",
  "SUP", "TIME", "U", "VAR", "WBR",
]);

type ThemeMode = "light" | "auto" | "dark";

function currentSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  if (
    process.env.NODE_ENV === "development" &&
    /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) &&
    new URLSearchParams(window.location.search).get("local") === "1"
  ) {
    return "local-artifact-editor";
  }
  return sessionStorage.getItem(TOKEN_KEY) || sessionStorage.getItem("dash_gh_token");
}

function resolveAutoTheme(): "light" | "dark" {
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  if (window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
  const hour = new Date().getHours();
  return hour >= 19 || hour < 7 ? "dark" : "light";
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode === "auto" ? resolveAutoTheme() : mode;
}

function editableElements(doc: Document): HTMLElement[] {
  const all = Array.from(doc.body.querySelectorAll<HTMLElement>("*"));
  return all.filter((element) => {
    if (BLOCKED_TAGS.has(element.tagName)) return false;
    if (!element.textContent?.trim()) return false;
    if (element.closest("button, input, select, textarea, [aria-hidden='true']")) return false;
    return Array.from(element.children).every((child) => INLINE_TAGS.has(child.tagName));
  }).filter((element, index, candidates) => {
    return !candidates.slice(0, index).some((parent) => parent.contains(element));
  });
}

function preparePreviewDocument(doc: Document, onDirty: () => void, onSave: () => void): number {
  doc.getElementById(EDITOR_STYLE_ID)?.remove();
  const style = doc.createElement("style");
  style.id = EDITOR_STYLE_ID;
  style.textContent = `
    [${EDITABLE_ATTR}] { cursor: text; border-radius: 3px; transition: outline-color 120ms ease, background 120ms ease; }
    [${EDITABLE_ATTR}]:hover { outline: 1px dashed var(--terracotta, var(--t1, #d4875a)); outline-offset: 4px; }
    [${EDITABLE_ATTR}]:focus { outline: 2px solid var(--terracotta, var(--t1, #d4875a)); outline-offset: 4px; background: var(--terracotta-soft, var(--t1-bg, rgba(212, 135, 90, 0.10))); }
  `;
  doc.head.appendChild(style);

  const elements = editableElements(doc);
  for (const element of elements) {
    element.setAttribute(EDITABLE_ATTR, "");
    element.setAttribute("contenteditable", "plaintext-only");
    element.setAttribute("spellcheck", "true");
    element.addEventListener("input", onDirty);
  }
  doc.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      onSave();
    }
  });
  return elements.length;
}

function serializePreview(doc: Document): string {
  const clone = doc.documentElement.cloneNode(true) as HTMLElement;
  clone.querySelector(`#${EDITOR_STYLE_ID}`)?.remove();
  clone.querySelectorAll(`[${EDITABLE_ATTR}]`).forEach((element) => {
    element.removeAttribute(EDITABLE_ATTR);
    element.removeAttribute("contenteditable");
    element.removeAttribute("spellcheck");
  });
  return `<!doctype html>\n${clone.outerHTML}`;
}

export default function ArtifactEditor() {
  const searchParams = useSearchParams();
  const org = searchParams.get("org") || "";
  const id = searchParams.get("id") || "";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [artifact, setArtifact] = useState<EditableArtifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editableCount, setEditableCount] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewKey, setPreviewKey] = useState(0);
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");

  useEffect(() => {
    const saved = (localStorage.getItem("eg-theme-mode") || "auto") as ThemeMode;
    const safe = ["light", "auto", "dark"].includes(saved) ? saved : "auto";
    setThemeMode(safe);
    applyTheme(safe);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const refresh = () => safe === "auto" && applyTheme("auto");
    media.addEventListener("change", refresh);
    return () => media.removeEventListener("change", refresh);
  }, []);

  useEffect(() => {
    setToken(currentSessionToken());
  }, []);

  useEffect(() => {
    if (!token || !org || !id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    getEditableArtifact(token, org, id)
      .then((value) => {
        setArtifact(value);
        setDirty(false);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [token, org, id]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = useCallback(async () => {
    if (!artifact || !token || !iframeRef.current?.contentDocument || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const html = serializePreview(iframeRef.current.contentDocument);
      const result = await saveEditableArtifact(token, artifact, html);
      setArtifact({ ...artifact, html, sha256: result.sha256 });
      setDirty(false);
      setNotice("Saved to the published artifact.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save artifact");
    } finally {
      setSaving(false);
    }
  }, [artifact, token, saving]);

  const preparePreview = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const shell = iframeRef.current?.closest<HTMLElement>(".ae-shell");
    const previewWindow = iframeRef.current?.contentWindow;
    if (shell && previewWindow) {
      const bodyStyle = previewWindow.getComputedStyle(doc.body);
      const htmlStyle = previewWindow.getComputedStyle(doc.documentElement);
      const bodyBackground = bodyStyle.backgroundColor;
      const background = bodyBackground === "rgba(0, 0, 0, 0)"
        ? htmlStyle.backgroundColor
        : bodyBackground;
      if (background !== "rgba(0, 0, 0, 0)") {
        shell.style.setProperty("--ae-artifact-bg", background);
      }
      shell.style.setProperty("--ae-artifact-ink", bodyStyle.color);
    }
    setEditableCount(preparePreviewDocument(doc, () => {
      setDirty(true);
      setNotice("");
    }, () => { void save(); }));
  }, [save]);

  const cancelChanges = () => {
    if (!artifact) return;
    setDirty(false);
    setNotice("Changes discarded.");
    setPreviewKey((value) => value + 1);
  };

  const cycleTheme = () => {
    const modes: ThemeMode[] = ["light", "auto", "dark"];
    const next = modes[(modes.indexOf(themeMode) + 1) % modes.length];
    setThemeMode(next);
    localStorage.setItem("eg-theme-mode", next);
    applyTheme(next);
  };

  if (!org || !id) {
    return <EditorMessage title="Artifact not specified" body="Open the editor from an artifact’s Edit text button." />;
  }

  if (!token && !loading) {
    const returnTo = `/edit?org=${encodeURIComponent(org)}&id=${encodeURIComponent(id)}`;
    return (
      <EditorMessage title="Sign in to edit" body="Only members of this Egregore can change its published artifacts.">
        <a className="ae-primary-link" href={getGitHubAuthUrl(returnTo)}>Sign in with GitHub</a>
      </EditorMessage>
    );
  }

  if (loading) return <EditorMessage title="Opening artifact" body="Preparing the editable copy…" />;
  if (error && !artifact) return <EditorMessage title="Couldn’t open this artifact" body={error} />;
  if (!artifact) return <EditorMessage title="Artifact unavailable" body="This artifact could not be loaded." />;

  const publishedUrl = `/view/${encodeURIComponent(org)}/${encodeURIComponent(id)}`;
  return (
    <main className="ae-shell">
      <header className="ae-toolbar">
        <div className="ae-identity">
          <span className="ae-sigil" aria-hidden="true">✦</span>
          <span className="ae-mode">Editing</span>
          <span className="ae-title">{artifact.title}</span>
          <span className="ae-hint">Click text to edit · {editableCount} regions · ⌘S</span>
        </div>
        <div className="ae-actions">
          <span className={`ae-state ${dirty ? "is-dirty" : ""}`}>
            {saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}
          </span>
          <button className="ae-button ae-button-quiet" onClick={cancelChanges} disabled={!dirty || saving}>Discard</button>
          <button className="ae-button ae-button-primary" onClick={() => void save()} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <a className="ae-icon-button" href={publishedUrl} target="_blank" rel="noreferrer" aria-label="Open published artifact" title="Open published artifact">↗</a>
          <button className="ae-icon-button" onClick={cycleTheme} aria-label={`Theme: ${themeMode}`} title={`Theme: ${themeMode}`}>◐</button>
        </div>
      </header>

      {(error || notice) && <div className={`ae-notice ${error ? "is-error" : ""}`}>{error || notice}</div>}

      <section className="ae-canvas" aria-label="Editable artifact preview">
        <iframe
          key={previewKey}
          ref={iframeRef}
          title={`Editing ${artifact.title}`}
          srcDoc={artifact.html}
          sandbox="allow-same-origin"
          onLoad={preparePreview}
        />
      </section>
    </main>
  );
}

function EditorMessage({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="ae-message-shell">
      <section className="ae-message-card">
        <span className="ae-sigil" aria-hidden="true">✦</span>
        <p className="ae-kicker">Egregore · text editor</p>
        <h1>{title}</h1>
        <p>{body}</p>
        {children}
      </section>
    </main>
  );
}
