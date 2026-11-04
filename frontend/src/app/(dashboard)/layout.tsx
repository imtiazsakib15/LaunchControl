import { Suspense, type ReactNode } from "react";

import { verifySession } from "@/lib/dal";

async function ProtectedContent({ children }: { children: ReactNode }) {
  await verifySession();

  return children;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div>Checking authentication...</div>}>
      <ProtectedContent>{children}</ProtectedContent>
    </Suspense>
  );
}
