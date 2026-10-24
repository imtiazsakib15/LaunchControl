import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../src/prisma/prisma.service.js';

describe('PrismaService lifecycle', () => {
  let moduleRef:
    | Awaited<
        ReturnType<ReturnType<typeof Test.createTestingModule>['compile']>
      >
    | undefined;

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
      moduleRef = undefined;
    }
  });

  it('connects during module initialization and disconnects during shutdown', async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: vi
              .fn()
              .mockReturnValue(
                'postgresql://test:test@localhost:5432/launchcontrol_test',
              ),
          },
        },
      ],
    }).compile();

    const prisma = moduleRef.get(PrismaService);

    const connectSpy = vi
      .spyOn(prisma, '$connect')
      .mockResolvedValue(undefined);

    const disconnectSpy = vi
      .spyOn(prisma, '$disconnect')
      .mockResolvedValue(undefined);

    await moduleRef.init();

    expect(connectSpy).toHaveBeenCalledOnce();

    await moduleRef.close();
    moduleRef = undefined;

    expect(disconnectSpy).toHaveBeenCalledOnce();
  });
});
