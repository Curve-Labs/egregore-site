import { Suspense } from "react";
import TokenInstall from "@/components/emissary/TokenInstall";

// Token-bound install entry point. Static export builds this to
// out/emissary/i.html; netlify.toml rewrites /emissary/i/:token to it, and
// the client reads the token from the URL path. See TokenInstall.tsx.

export const metadata = {
  title: "Install Emissary — Emissary Courier",
  description:
    "Set up the Emissary Courier to send and respond to portable handoffs.",
};

export default function EmissaryTokenInstallPage() {
  return (
    <Suspense fallback={null}>
      <TokenInstall />
    </Suspense>
  );
}
