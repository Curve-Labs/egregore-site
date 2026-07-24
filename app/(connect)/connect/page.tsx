import { Suspense } from "react";
import ConnectResult from "@/components/connect/ConnectResult";

export default function ConnectPage() {
  return (
    <Suspense fallback={null}>
      <ConnectResult />
    </Suspense>
  );
}
