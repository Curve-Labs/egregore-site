import { Suspense } from "react";
import SetupFlow from "@/components/setup/SetupFlow";

export default function CallbackPage() {
  return (
    <Suspense fallback={null}>
      <SetupFlow mode="callback" />
    </Suspense>
  );
}
