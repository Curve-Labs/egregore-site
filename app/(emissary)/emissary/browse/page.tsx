import EmissaryHub from "@/components/emissary/EmissaryHub";
import PasswordGate from "@/components/emissary/PasswordGate";

export const metadata = {
  title: "Emissary Directory — Browse and collect emissaries",
  description:
    "Browse published emissaries, star the ones worth keeping, and pull them into your agent from the terminal.",
};

export default function EmissaryBrowsePage() {
  return (
    <PasswordGate password="emissary-cor" storageKey="emissary-browse-gate">
      <EmissaryHub />
    </PasswordGate>
  );
}
