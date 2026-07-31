// /adoption/admin — the internal god's-eye adoption view.
//
// TWO gates, deliberately, because they defend different things.
//
// PasswordGate keeps the page out of casual sight. It is not access
// control — the password ships in the JS bundle — so it must never be the
// only thing standing between a stranger and other organisations' names.
//
// The real gate is server-side: the client sends a GitHub token straight to
// Railway, which checks it against ADMIN_USERS (api/auth.py). Someone who
// guesses the password still gets nothing but a sign-in wall, because the
// API refuses the request regardless of what this page renders.

import AdoptionAdmin from "@/components/adoption/AdoptionAdmin";
import PasswordGate from "@/components/emissary/PasswordGate";

export const metadata = {
  title: "Adoption · internal — Egregore",
  description: "Per-org adoption, activity and version spread. Admins only.",
};

export default function AdoptionAdminPage() {
  return (
    <PasswordGate password="egregore-cor" storageKey="adoption-admin-gate">
      <AdoptionAdmin />
    </PasswordGate>
  );
}
