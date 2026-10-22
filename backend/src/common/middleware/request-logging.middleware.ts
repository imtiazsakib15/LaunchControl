import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = randomUUID();
    const startedAt = process.hrtime.bigint();

    Object.assign(request, { requestId });
    response.setHeader('x-request-id', requestId);

    response.on('finish', () => {
      const durationMs =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000;

      const logEntry = {
        event: 'http_request_completed',
        requestId,
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
      };

      const message = JSON.stringify(logEntry);

      if (response.statusCode >= 500) {
        this.logger.error(message);
      } else if (response.statusCode >= 400) {
        this.logger.warn(message);
      } else {
        this.logger.log(message);
      }
    });

    next();
  }
}
