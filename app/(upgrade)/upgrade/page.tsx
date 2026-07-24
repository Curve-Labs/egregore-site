import { Suspense } from "react";
import UpgradeResult from "@/components/upgrade/UpgradeResult";

export default function UpgradePage() {
  return (
    <Suspense fallback={null}>
      <UpgradeResult />
    </Suspense>
  );
}
