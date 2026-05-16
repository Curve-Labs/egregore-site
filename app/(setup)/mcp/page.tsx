import { Suspense } from "react";
import McpRegisterFlow from "@/components/setup/McpRegisterFlow";

export const metadata = {
  title: "Install the Egregore MCP — Egregore",
  description:
    "Connect Egregore handoffs to Claude.ai, ChatGPT, and other LLMs you already use. Register once, paste a personalised URL into your harness's connector panel.",
};

export default function McpInstallPage() {
  return (
    <Suspense fallback={null}>
      <McpRegisterFlow />
    </Suspense>
  );
}
