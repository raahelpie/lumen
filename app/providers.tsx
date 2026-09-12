"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agentId="reader"
      useSingleEndpoint={false}
      enableInspector={process.env.NODE_ENV === "development"}
    >
      {children}
    </CopilotKit>
  );
}
