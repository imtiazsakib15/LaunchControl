import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = randomUUID();

  res.setHeader('X-Request-Id', requestId);

  Object.assign(req, { requestId });

  next();
}
