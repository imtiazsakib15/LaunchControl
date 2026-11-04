import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();

  return Response.json({
    authenticated: Boolean(session.adminToken),
  });
}
