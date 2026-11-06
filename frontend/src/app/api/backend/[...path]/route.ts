import { proxyBackendRequest } from "@/lib/backend-proxy";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export const GET = (request: Request, context: RouteContext) =>
  proxyBackendRequest(request, context);

export const POST = (request: Request, context: RouteContext) =>
  proxyBackendRequest(request, context);

export const PUT = (request: Request, context: RouteContext) =>
  proxyBackendRequest(request, context);

export const PATCH = (request: Request, context: RouteContext) =>
  proxyBackendRequest(request, context);

export const DELETE = (request: Request, context: RouteContext) =>
  proxyBackendRequest(request, context);

export const HEAD = (request: Request, context: RouteContext) =>
  proxyBackendRequest(request, context);
