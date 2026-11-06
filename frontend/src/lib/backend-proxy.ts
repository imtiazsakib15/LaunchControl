import "server-only";

import { getSession } from "@/lib/session";

const BACKEND_TIMEOUT_MS = 10_000;

const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
]);

interface ProxyContext {
  params: Promise<{
    path: string[];
  }>;
}

function errorResponse(message: string, status: number) {
  return Response.json(
    { message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function getBackendUrl(path: string[], search: string): URL | null {
  const configuredUrl = process.env.BACKEND_API_URL;

  if (!configuredUrl) {
    return null;
  }

  let baseUrl: URL;

  try {
    baseUrl = new URL(configuredUrl);
  } catch {
    return null;
  }

  if (
    !["http:", "https:"].includes(baseUrl.protocol) ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    return null;
  }

  // Only expose the versioned backend API through this proxy.
  if (path.length < 3 || path[0] !== "api" || path[1] !== "v1") {
    return null;
  }

  if (
    path.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\") ||
        segment.includes("\0"),
    )
  ) {
    return null;
  }

  const targetUrl = new URL(
    path.map(encodeURIComponent).join("/"),
    `${baseUrl.origin}/`,
  );

  targetUrl.search = search;

  return targetUrl;
}

export async function proxyBackendRequest(
  request: Request,
  context: ProxyContext,
): Promise<Response> {
  if (!ALLOWED_METHODS.has(request.method)) {
    return errorResponse("Method not allowed.", 405);
  }

  const session = await getSession();

  if (!session.adminToken) {
    return errorResponse("Unauthorized.", 401);
  }

  const { path } = await context.params;

  const requestUrl = new URL(request.url);
  const backendUrl = getBackendUrl(path, requestUrl.search);

  if (!backendUrl) {
    return errorResponse("Invalid backend API path or configuration.", 400);
  }

  const headers = new Headers({
    Authorization: `Bearer ${session.adminToken}`,
    Accept: request.headers.get("accept") ?? "application/json",
  });

  const contentType = request.headers.get("content-type");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  let body: ArrayBuffer | undefined;

  if (!["GET", "HEAD"].includes(request.method)) {
    body = await request.arrayBuffer();

    // Current admin API requests are JSON and should remain small.
    if (body.byteLength > 1_048_576) {
      return errorResponse("Request body is too large.", 413);
    }
  }

  let backendResponse: Response;

  try {
    backendResponse = await fetch(backendUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
      redirect: "manual",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return errorResponse("Backend request timed out.", 504);
    }

    return errorResponse("Backend service is unavailable.", 503);
  }

  // The backend no longer accepts this stored admin token.
  if (backendResponse.status === 401) {
    session.destroy();

    return errorResponse("Session expired. Please sign in again.", 401);
  }

  const responseHeaders = new Headers({
    "Cache-Control": "no-store",
  });

  const responseContentType = backendResponse.headers.get("content-type");
  const retryAfter = backendResponse.headers.get("retry-after");

  if (responseContentType) {
    responseHeaders.set("Content-Type", responseContentType);
  }

  if (retryAfter) {
    responseHeaders.set("Retry-After", retryAfter);
  }

  return new Response(request.method === "HEAD" ? null : backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}
