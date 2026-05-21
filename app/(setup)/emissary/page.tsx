import { Suspense } from "react";
import InstallHub from "@/components/emissary/InstallHub";
import EmissaryLab from "@/components/emissary/EmissaryLab";
import PasswordGate from "@/components/emissary/PasswordGate";

export const metadata = {
  title: "Emissary Courier — Send a portable handoff",
  description:
    "An emissary is a portable, runnable task you hand to someone else's AI. Install egregore-emissary once — it sends and receives. The link works cold; installed, every emissary runs at full fidelity.",
};

export default function EmissaryHubPage() {
  return (
    <PasswordGate>
      <Suspense fallback={null}>
        <InstallHub />
      </Suspense>
      <EmissaryLab />
    </PasswordGate>
  );
}
