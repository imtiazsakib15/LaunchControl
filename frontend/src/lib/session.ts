import "server-only";

import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export interface SessionData {
  adminToken?: string;
}

const sessionPassword = process.env.SESSION_PASSWORD;

if (!sessionPassword || sessionPassword.length < 32) {
  throw new Error(
    "SESSION_PASSWORD must be configured and contain at least 32 characters.",
  );
}

const sessionOptions: SessionOptions = {
  password: sessionPassword,
  cookieName: "launchcontrol_admin_session",
  ttl: 60 * 60 * 8, // 8 hours
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8 - 60,
  },
};

export async function getSession() {
  const cookieStore = await cookies();

  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
