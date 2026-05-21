import EmissaryHub from "@/components/emissary/EmissaryHub";
import PasswordGate from "@/components/emissary/PasswordGate";

export const metadata = {
  title: "Emissary Courier — Send a portable handoff",
  description:
    "An emissary is a portable, runnable task you hand to someone else's AI. Install egregore-emissary once — it sends and receives. The link works cold; installed, every emissary runs at full fidelity.",
};

export default function EmissaryHubPage() {
  return (
    <PasswordGate>
      <EmissaryHub />
    </PasswordGate>
  );
}
