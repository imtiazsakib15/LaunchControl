import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import LoginForm from "@/components/auth/login-form";
import { connection } from "next/server";

export const metadata: Metadata = {
  title: "Admin Sign In | LaunchControl",
  description: "Sign in to the LaunchControl admin dashboard.",
};

async function LoginPageContent() {
  await connection();

  const session = await getSession();

  if (session.adminToken) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}

function LoginPageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div
        className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary"
        role="status"
        aria-label="Loading login page"
      />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
