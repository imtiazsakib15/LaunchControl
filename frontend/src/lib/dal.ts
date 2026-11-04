import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { getSession } from "@/lib/session";

export const verifySession = cache(async () => {
  await connection();

  const session = await getSession();

  if (!session.adminToken) {
    redirect("/login");
  }

  return { authenticated: true };
});
