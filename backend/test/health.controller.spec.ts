import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { HealthController } from '../src/health/health.controller.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('HealthController', () => {
  const createController = () => {
    const prisma = {
      $queryRaw: vi.fn(),
    };

    const controller = new HealthController(prisma as unknown as PrismaService);

    return { controller, prisma };
  };

  it('returns healthy status when the database is reachable', async () => {
    const { controller, prisma } = createController();

    prisma.$queryRaw.mockResolvedValue(1);

    const result = await controller.check();

    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      status: 'ok',
      checks: {
        api: 'ok',
        database: 'ok',
      },
    });
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });

  it('returns 503 when the database is unavailable', async () => {
    const { controller, prisma } = createController();

    prisma.$queryRaw.mockRejectedValue(
      new Error('Internal database connection details'),
    );

    let thrown: unknown;

    try {
      await controller.check();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ServiceUnavailableException);

    const exception = thrown as ServiceUnavailableException;

    expect(exception.getStatus()).toBe(503);
    expect(exception.getResponse()).toMatchObject({
      status: 'error',
      checks: {
        api: 'ok',
        database: 'error',
      },
    });

    expect(JSON.stringify(exception.getResponse())).not.toContain(
      'Internal database connection details',
    );
  });

  it('does not expose internal database errors', async () => {
    const { controller, prisma } = createController();

    prisma.$queryRaw.mockRejectedValue(
      new Error('Internal database connection details'),
    );

    let thrown: unknown;

    try {
      await controller.check();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ServiceUnavailableException);

    const exception = thrown as ServiceUnavailableException;

    expect(exception.getStatus()).toBe(503);

    expect(JSON.stringify(exception.getResponse())).not.toContain(
      'Internal database connection details',
    );
  });
});
