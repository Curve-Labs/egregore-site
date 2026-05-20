import { Suspense } from "react";
import InstallHub from "@/components/emissary/InstallHub";

export const metadata = {
  title: "Emissary Courier — Send a portable handoff",
  description:
    "An emissary is a portable, structured handoff you hand to someone else's AI. Install the emissary CLI or the MCP connector to send. Receiving needs nothing installed.",
};

export default function EmissaryHubPage() {
  return (
    <Suspense fallback={null}>
      <InstallHub />
    </Suspense>
  );
}
