"use client";

// Token-bound install entry point (/emissary/i/{token}). In a static export
// the token is unknown at build time, so netlify.toml rewrites
// /emissary/i/:token -> /emissary/i.html (this page) and the token is read
// from the URL path here. Falls back to a ?token= query param when present
// (useful for local `next dev`, where there is no netlify rewrite).

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import InstallHub from "./InstallHub";

// Pull the token segment out of /emissary/i/<token>[/].
function tokenFromPath(pathname: string): string | undefined {
  const m = pathname.match(/\/emissary\/i\/([^/?#]+)/);
  if (!m) return undefined;
  const raw = decodeURIComponent(m[1]);
  // Guard against the rewrite target leaking through ("i.html", "i").
  if (!raw || raw === "i" || raw === "i.html") return undefined;
  return raw;
}

export default function TokenInstall() {
  const params = useSearchParams();
  const [token, setToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fromQuery = params.get("token") || undefined;
    const fromPath = tokenFromPath(window.location.pathname);
    setToken(fromPath || fromQuery);
  }, [params]);

  return <InstallHub installToken={token} />;
}
