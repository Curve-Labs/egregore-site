import { Suspense } from "react";
import AccountFlow from "@/components/emissary/AccountFlow";

// /emissary/account — static Next route. Resolves the signed-in identity
// client-side (GET /api/v1/emissary/session, cookie-authed) and manages stars.
// See AccountFlow.tsx.

export const metadata = {
  title: "Your account — Emissary Courier",
  description:
    "Your emissary identity and the emissaries you've starred. Sign in with a one-time email link.",
};

export default function EmissaryAccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountFlow />
    </Suspense>
  );
}
