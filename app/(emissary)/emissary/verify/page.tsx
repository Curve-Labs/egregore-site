import { Suspense } from "react";
import VerifyFlow from "@/components/emissary/VerifyFlow";

export const metadata = {
  title: "Verify your email — Emissary Courier",
  description:
    "Confirm your emissary identity. Verified senders carry a verified badge on every emissary's human render.",
};

export default function EmissaryVerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyFlow />
    </Suspense>
  );
}
