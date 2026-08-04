import type { Metadata } from "next";
import TractionBoard from "@/components/traction/TractionBoard";

export const metadata: Metadata = {
  title: "Traction — Egregore",
  description:
    "Egregore adoption, expanding usage, activation, and accumulated organizational knowledge.",
};

export default function TractionPage() {
  return <TractionBoard />;
}
