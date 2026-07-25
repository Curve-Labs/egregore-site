// /adoption/admin — the internal god's-eye adoption view.
//
// No PasswordGate here, and that is deliberate: PasswordGate ships its
// password in the JS bundle, so it is obscurity, not access control. This
// page carries other organizations' slugs, creator handles and activity, so
// it is gated on a real GitHub token checked server-side against ADMIN_USERS
// (api/auth.py). The client component renders a sign-in wall until it has
// one, and the API refuses the request regardless of what the page renders.

import AdoptionAdmin from "@/components/adoption/AdoptionAdmin";

export const metadata = {
  title: "Adoption · internal — Egregore",
  description: "Per-org adoption, activity and version spread. Admins only.",
};

export default function AdoptionAdminPage() {
  return <AdoptionAdmin />;
}
