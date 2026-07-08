import { Suspense } from "react";
import LoginFlow from "@/components/emissary/LoginFlow";

// /login — static Next route (NOT proxied). Owns the email sign-in form and
// forwards legacy ?token= links to the API verify endpoint. See LoginFlow.tsx.

export const metadata = {
  title: "Sign in — Egregore",
  description:
    "Sign in to Egregore with a one-time email link. No password — open the link and you're in.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginFlow />
    </Suspense>
  );
}
