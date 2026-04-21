import { Suspense } from "react";
import SetupFlow from "@/components/setup/SetupFlow";

export default function SetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupFlow mode="setup" />
    </Suspense>
  );
}
