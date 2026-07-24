import { Suspense } from "react";
import type { Metadata } from "next";
import ConnectFlow from "@/components/setup/ConnectFlow";

export const metadata: Metadata = {
  title: "Connect your Egregore",
  description: "Choose how your existing Egregore runs.",
};

export default function ConnectPage() {
  return (
    <Suspense fallback={null}>
      <ConnectFlow />
    </Suspense>
  );
}
