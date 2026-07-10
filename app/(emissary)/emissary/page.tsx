import EmissaryHub from "@/components/emissary/EmissaryHub";
import PasswordGate from "@/components/emissary/PasswordGate";

export const metadata = {
  title: "Emissary Directory — Browse and collect emissaries",
  description:
    "Browse published emissaries, star the ones worth keeping, and pull them into your agent from the terminal.",
};

export default function EmissaryHubPage() {
  return (
    <PasswordGate password="egregore-cor">
      <EmissaryHub />
    </PasswordGate>
  );
}
