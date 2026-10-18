import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async check() {
    const timestamp = new Date().toISOString();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        checks: {
          api: 'ok',
          database: 'ok',
        },
        timestamp,
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        checks: {
          api: 'ok',
          database: 'error',
        },
        timestamp,
      });
    }
  }
}
