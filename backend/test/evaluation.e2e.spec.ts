import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PREFIX = 'evaluation-e2e-';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

describe('Evaluation API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  async function cleanup() {
    const flags = await prisma.flag.findMany({
      where: { key: { startsWith: PREFIX } },
      select: { id: true },
    });

    const flagIds = flags.map((flag) => flag.id);

    if (flagIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { flagId: { in: flagIds } },
      });
    }

    await prisma.flag.deleteMany({
      where: { key: { startsWith: PREFIX } },
    });
  }

  async function createFlag(
    overrides: {
      key?: string;
      enabled?: boolean;
      defaultValue?: boolean;
      rolloutPercentage?: number;
      rules?: object[];
    } = {},
  ) {
    return prisma.flag.create({
      data: {
        key: overrides.key ?? `${PREFIX}test-flag`,
        name: 'Evaluation E2E Test Flag',
        enabled: overrides.enabled ?? true,
        defaultValue: overrides.defaultValue ?? false,
        rolloutPercentage: overrides.rolloutPercentage ?? 0,
        rules: overrides.rules ?? [],
      },
    });
  }

  function evaluate(flagKey: string, userKey = 'user-123') {
    return request(app.getHttpServer())
      .post('/api/v1/evaluate')
      .send({
        flagKey,
        user: { key: userKey },
      });
  }

  function debugEvaluate(flagKey: string, userKey = 'user-123') {
    return request(app.getHttpServer())
      .post('/api/v1/evaluate/debug')
      .set('Authorization', `Bearer ${ADMIN_TOKEN ?? ''}`)
      .send({
        flagKey,
        user: {
          key: userKey,
          attributes: { country: 'BD' },
        },
      });
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    if (prisma) {
      await cleanup();
    }

    if (app) {
      await app.close();
    }
  });

  it('evaluates an enabled flag using its rollout configuration', async () => {
    await createFlag({
      key: `${PREFIX}rollout`,
      enabled: true,
      defaultValue: true,
      rolloutPercentage: 0,
    });

    const response = await evaluate(`${PREFIX}rollout`).expect(200);

    expect(response.body).toEqual({
      value: false,
      reason: 'PERCENTAGE_ROLLOUT',
      flagVersion: 1,
    });
  });

  it('returns FLAG_OFF when the flag is disabled', async () => {
    await createFlag({
      key: `${PREFIX}disabled`,
      enabled: false,
      defaultValue: true,
    });

    const response = await evaluate(`${PREFIX}disabled`).expect(200);

    expect(response.body).toEqual({
      value: false,
      reason: 'FLAG_OFF',
      flagVersion: 1,
    });
  });

  it('evaluates the first matching targeting rule', async () => {
    await createFlag({
      key: `${PREFIX}targeting`,
      rules: [
        {
          serve: true,
          when: {
            attr: 'country',
            operator: 'equals',
            value: 'BD',
          },
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/evaluate')
      .send({
        flagKey: `${PREFIX}targeting`,
        user: {
          key: 'user-123',
          attributes: { country: 'BD' },
        },
      })
      .expect(200);

    expect(response.body).toEqual({
      value: true,
      reason: 'TARGETING_RULE',
      flagVersion: 1,
    });
  });

  it('returns the documented fallback for a missing flag', async () => {
    const response = await evaluate(`${PREFIX}missing`).expect(200);

    expect(response.body).toEqual({
      value: false,
      reason: 'DEFAULT_VALUE',
      flagVersion: 0,
    });
  });

  it('rejects an invalid evaluation request', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/evaluate')
      .send({
        flagKey: '',
        user: {},
      })
      .expect(400);
  });

  it('evaluates publicly without an admin token', async () => {
    await createFlag({
      key: `${PREFIX}public`,
      enabled: true,
      rolloutPercentage: 100,
    });

    const response = await evaluate(`${PREFIX}public`).expect(200);

    expect(response.body).toEqual({
      value: true,
      reason: 'PERCENTAGE_ROLLOUT',
      flagVersion: 1,
    });
  });

  it('rejects debug requests without a valid admin token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/evaluate/debug')
      .send({
        flagKey: `${PREFIX}target`,
        user: { key: 'user-123', attributes: {} },
      })
      .expect(401);
  });

  it('returns a decision and trace for an authorized debug request', async () => {
    await createFlag({
      key: `${PREFIX}debug`,
      enabled: true,
      rules: [
        {
          serve: true,
          when: {
            attr: 'country',
            operator: 'equals',
            value: 'BD',
          },
        },
      ],
    });

    const response = await debugEvaluate(`${PREFIX}debug`).expect(200);

    expect(response.body).toMatchObject({
      flagKey: `${PREFIX}debug`,
      value: true,
      reason: 'TARGETING_RULE',
      flagVersion: 1,
      trace: expect.arrayContaining([
        { step: 'FLAG_LOOKUP', result: 'FOUND' },
        { step: 'TARGETING_RULE', ruleIndex: 0, matched: true },
      ]),
    });
  });

  it('returns a not-found trace for a missing flag', async () => {
    const response = await debugEvaluate(`${PREFIX}not-found`).expect(200);

    expect(response.body).toMatchObject({
      flagKey: `${PREFIX}not-found`,
      value: false,
      reason: 'DEFAULT_VALUE',
      flagVersion: 0,
      trace: [{ step: 'FLAG_LOOKUP', result: 'NOT_FOUND' }],
    });
  });

  it('returns the same decision for public and debug evaluation', async () => {
    await createFlag({
      key: `${PREFIX}consistent`,
      enabled: true,
      rolloutPercentage: 100,
    });

    const publicResponse = await evaluate(`${PREFIX}consistent`).expect(200);
    const debugResponse = await debugEvaluate(`${PREFIX}consistent`).expect(
      200,
    );

    expect(debugResponse.body).toMatchObject({
      value: publicResponse.body.value,
      reason: publicResponse.body.reason,
      flagVersion: publicResponse.body.flagVersion,
    });
  });
});
