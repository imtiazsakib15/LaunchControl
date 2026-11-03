import { z } from "zod";

import { getSession } from "@/lib/session";

const loginSchema = z.object({
  token: z
    .string()
    .min(1, "Admin token is required.")
    .max(4096)
    .refine((value) => value.trim().length > 0, {
      message: "Admin token is required.",
    }),
});

const BACKEND_TIMEOUT_MS = 5000;

export async function POST(request: Request) {
  // Validate request body.
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { message: "A valid admin token is required." },
      { status: 400 },
    );
  }

  const backendUrl = process.env.BACKEND_API_URL;

  if (!backendUrl) {
    return Response.json(
      { message: "Authentication service is not configured." },
      { status: 500 },
    );
  }

  // Validate the token against the protected backend API.
  let backendResponse: Response;

  try {
    const normalizedBackendUrl = backendUrl.replace(/\/+$/, "");

    backendResponse = await fetch(
      `${normalizedBackendUrl}/api/v1/flags?page=1&pageSize=1`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${parsed.data.token}`,
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      },
    );
  } catch {
    return Response.json(
      { message: "Authentication service is unavailable." },
      { status: 503 },
    );
  }

  if (backendResponse.status === 401 || backendResponse.status === 403) {
    return Response.json({ message: "Invalid admin token." }, { status: 401 });
  }

  if (backendResponse.status === 429) {
    return Response.json(
      { message: "Too many login attempts. Please try again later." },
      { status: 429 },
    );
  }

  if (!backendResponse.ok) {
    return Response.json(
      { message: "Authentication service is unavailable." },
      { status: 503 },
    );
  }

  // Create the encrypted session only after successful validation.
  try {
    const session = await getSession();

    session.adminToken = parsed.data.token;

    await session.save();
  } catch {
    return Response.json(
      { message: "Unable to create an authenticated session." },
      { status: 500 },
    );
  }

  return Response.json({ message: "Login successful." }, { status: 200 });
}
