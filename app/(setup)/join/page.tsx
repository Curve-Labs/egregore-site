import { Suspense } from "react";
import SetupFlow from "@/components/setup/SetupFlow";

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <SetupFlow mode="join" />
    </Suspense>
  );
}
