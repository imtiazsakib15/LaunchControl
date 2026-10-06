import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import type { Response } from 'supertest';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

async function createFlag(
  app: INestApplication,
  adminToken: string,
  overrides: Record<string, unknown> = {},
): Promise<Response> {
  return request
    .default(app.getHttpServer())
    .post('/api/v1/flags')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      key: 'test-flag',
      name: 'Test Flag',
      description: 'Test flag',
      enabled: true,
      defaultValue: false,
      rolloutPercentage: 0,
      rules: [],
      ...overrides,
    });
}

describe('Flags API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get(PrismaService);

    await app.init();

    const configService = moduleFixture.get(ConfigService);
    adminToken = configService.getOrThrow<string>('ADMIN_TOKEN');
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.flag.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/flags', () => {
    it('should reject request without admin token', async () => {
      const payload = {
        key: 'no-auth-flag',
        name: 'No Auth Flag',
        description: 'Should not be created',
        enabled: true,
        defaultValue: false,
        rolloutPercentage: 10,
        rules: [],
      };

      await request
        .default(app.getHttpServer())
        .post('/api/v1/flags')
        .send(payload)
        .expect(401);
    });

    it('should reject request with invalid admin token', async () => {
      const payload = {
        key: 'invalid-auth-flag',
        name: 'Invalid Auth Flag',
        description: 'Should not be created',
        enabled: true,
        defaultValue: false,
        rolloutPercentage: 10,
        rules: [],
      };

      await request
        .default(app.getHttpServer())
        .post('/api/v1/flags')
        .set('Authorization', 'Bearer wrong-token')
        .send(payload)
        .expect(401);
    });

    it('should allow request with valid admin token', async () => {
      const payload = {
        key: 'valid-auth-flag',
        name: 'Valid Auth Flag',
        description: 'Should be created',
        enabled: true,
        defaultValue: false,
        rolloutPercentage: 10,
        rules: [],
      };

      await request
        .default(app.getHttpServer())
        .post('/api/v1/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);
    });

    it('should create a flag and audit log', async () => {
      const payload = {
        key: 'new-dashboard',
        name: 'New Dashboard',
        description: 'Controls the new dashboard experience',
        enabled: true,
        defaultValue: false,
        rolloutPercentage: 25,
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
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/api/v1/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      expect(response.body).toMatchObject({
        key: payload.key,
        name: payload.name,
        description: payload.description,
        enabled: payload.enabled,
        defaultValue: payload.defaultValue,
        rolloutPercentage: payload.rolloutPercentage,
        version: 1,
      });

      expect(response.body.id).toBeDefined();

      const flag = await prisma.flag.findUnique({
        where: {
          key: payload.key,
        },
      });

      expect(flag).not.toBeNull();

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          flagId: flag!.id,
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog!.action).toBe('CREATED');
      expect(auditLog!.flagId).toBe(flag!.id);
      expect(auditLog!.after).toBeDefined();
      expect(auditLog!.requestId).toBeDefined();
    });

    it('should reject duplicate flag key', async () => {
      const payload = {
        key: 'duplicate-flag',
        name: 'Duplicate Flag',
        description: 'Testing duplicate keys',
        enabled: false,
        defaultValue: false,
        rolloutPercentage: 0,
        rules: [],
      };

      await request
        .default(app.getHttpServer())
        .post('/api/v1/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      await request
        .default(app.getHttpServer())
        .post('/api/v1/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(409);
    });

    it('should reject invalid flag key', async () => {
      const payload = {
        key: 'New Dashboard!',
        name: 'Invalid Flag',
        description: 'Invalid key test',
        enabled: true,
        defaultValue: false,
        rolloutPercentage: 10,
        rules: [],
      };

      const response = await request
        .default(app.getHttpServer())
        .post('/api/v1/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should reject rollout percentage greater than 100', async () => {
      const payload = {
        key: 'invalid-rollout',
        name: 'Invalid Rollout',
        description: 'Invalid rollout test',
        enabled: true,
        defaultValue: false,
        rolloutPercentage: 101,
        rules: [],
      };

      await request
        .default(app.getHttpServer())
        .post('/api/v1/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(400);
    });

    it('should reject rollout percentage below 0', async () => {
      const payload = {
        key: 'negative-rollout',
        name: 'Negative Rollout',
        description: 'Negative rollout test',
        enabled: true,
        defaultValue: false,
        rolloutPercentage: -1,
        rules: [],
      };

      await request
        .default(app.getHttpServer())
        .post('/api/v1/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(400);
    });
  });

  describe('GET /api/v1/flags', () => {
    it('should return paginated flags', async () => {
      await createFlag(app, adminToken, {
        key: 'first-flag',
        name: 'First Flag',
      });

      await createFlag(app, adminToken, {
        key: 'second-flag',
        name: 'Second Flag',
      });

      const response = await request
        .default(app.getHttpServer())
        .get('/api/v1/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        pagination: {
          page: 1,
          pageSize: 20,
          total: 2,
          totalPages: 1,
        },
      });

      expect(response.body.items).toHaveLength(2);

      expect(response.body.items[0].key).toBe('second-flag');
      expect(response.body.items[1].key).toBe('first-flag');
    });

    it('should support custom pagination', async () => {
      for (let index = 1; index <= 5; index++) {
        await createFlag(app, adminToken, {
          key: `flag-${index}`,
          name: `Flag ${index}`,
        });
      }

      const response = await request
        .default(app.getHttpServer())
        .get('/api/v1/flags?page=2&pageSize=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.pagination).toEqual({
        page: 2,
        pageSize: 2,
        total: 5,
        totalPages: 3,
      });

      expect(response.body.items).toHaveLength(2);
    });

    it('should use default pagination values', async () => {
      await createFlag(app, adminToken, {
        key: 'default-pagination',
      });

      const response = await request
        .default(app.getHttpServer())
        .get('/api/v1/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.pageSize).toBe(20);
    });

    it('should reject request without admin token', async () => {
      await request
        .default(app.getHttpServer())
        .get('/api/v1/flags')
        .expect(401);
    });

    it('should reject invalid page', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/api/v1/flags?page=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });

    it('should reject invalid page size', async () => {
      const response = await request
        .default(app.getHttpServer())
        .get('/api/v1/flags?pageSize=101')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/flags/:key', () => {
    it('should return a flag by key', async () => {
      await createFlag(app, adminToken, {
        key: 'new-dashboard',
        name: 'New Dashboard',
        description: 'Controls the new dashboard',
        enabled: true,
        defaultValue: false,
        rolloutPercentage: 25,
      });

      const response = await request
        .default(app.getHttpServer())
        .get('/api/v1/flags/new-dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        key: 'new-dashboard',
        name: 'New Dashboard',
        description: 'Controls the new dashboard',
        enabled: true,
        defaultValue: false,
        rolloutPercentage: 25,
        version: 1,
      });

      expect(response.body.id).toBeDefined();
    });

    it('should return 404 when flag does not exist', async () => {
      await request
        .default(app.getHttpServer())
        .get('/api/v1/flags/does-not-exist')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should reject request without admin token', async () => {
      await request
        .default(app.getHttpServer())
        .get('/api/v1/flags/new-dashboard')
        .expect(401);
    });
  });

  describe('PATCH /api/v1/flags/:key', () => {
    it('should update a flag and create an audit log', async () => {
      await createFlag(app, adminToken, {
        key: 'update-test',
        name: 'Original Name',
        description: 'Original description',
        enabled: true,
        defaultValue: false,
        rolloutPercentage: 10,
        rules: [],
      });

      const response = await request
        .default(app.getHttpServer())
        .patch('/api/v1/flags/update-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          expectedVersion: 1,
          name: 'Updated Name',
          description: 'Updated description',
          enabled: true,
          defaultValue: true,
          rolloutPercentage: 25,
          rules: [],
        })
        .expect(200);

      expect(response.body).toMatchObject({
        key: 'update-test',
        name: 'Updated Name',
        description: 'Updated description',
        enabled: true,
        defaultValue: true,
        rolloutPercentage: 25,
        version: 2,
      });

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          flagId: response.body.id,
          action: 'UPDATED',
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog!.before).toBeDefined();
      expect(auditLog!.after).toBeDefined();
      expect(auditLog!.requestId).toBeDefined();
    });

    it('should return 404 when flag does not exist', async () => {
      await request
        .default(app.getHttpServer())
        .patch('/api/v1/flags/does-not-exist')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          expectedVersion: 1,
          name: 'Updated Name',
          description: 'Updated description',
          enabled: true,
          defaultValue: false,
          rolloutPercentage: 10,
          rules: [],
        })
        .expect(404);
    });

    it('should return 409 for stale expectedVersion', async () => {
      await createFlag(app, adminToken, {
        key: 'concurrent-flag',
        name: 'Original Name',
      });

      await request
        .default(app.getHttpServer())
        .patch('/api/v1/flags/concurrent-flag')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          expectedVersion: 1,
          name: 'First Update',
          description: 'First update',
          enabled: true,
          defaultValue: false,
          rolloutPercentage: 20,
          rules: [],
        })
        .expect(200);

      const flagBeforeStaleUpdate = await prisma.flag.findUnique({
        where: {
          key: 'concurrent-flag',
        },
      });

      const auditCountBefore = await prisma.auditLog.count({
        where: {
          flagId: flagBeforeStaleUpdate!.id,
          action: 'UPDATED',
        },
      });

      await request
        .default(app.getHttpServer())
        .patch('/api/v1/flags/concurrent-flag')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          expectedVersion: 1,
          name: 'Stale Update',
          description: 'Should fail',
          enabled: true,
          defaultValue: false,
          rolloutPercentage: 30,
          rules: [],
        })
        .expect(409);

      const flagAfterStaleUpdate = await prisma.flag.findUnique({
        where: {
          key: 'concurrent-flag',
        },
      });

      const auditCountAfter = await prisma.auditLog.count({
        where: {
          flagId: flagBeforeStaleUpdate!.id,
          action: 'UPDATED',
        },
      });

      expect(flagAfterStaleUpdate).toMatchObject({
        name: 'First Update',
        version: 2,
      });

      expect(auditCountAfter).toBe(auditCountBefore);
    });

    it('should reject update without admin token', async () => {
      await createFlag(app, adminToken, {
        key: 'protected-update',
      });

      await request
        .default(app.getHttpServer())
        .patch('/api/v1/flags/protected-update')
        .send({
          expectedVersion: 1,
          name: 'Updated Name',
          description: 'Updated description',
          enabled: true,
          defaultValue: false,
          rolloutPercentage: 10,
          rules: [],
        })
        .expect(401);
    });

    it('should reject invalid rollout percentage', async () => {
      await createFlag(app, adminToken, {
        key: 'invalid-update',
      });

      await request
        .default(app.getHttpServer())
        .patch('/api/v1/flags/invalid-update')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          expectedVersion: 1,
          name: 'Updated Name',
          description: 'Updated description',
          enabled: true,
          defaultValue: false,
          rolloutPercentage: 101,
          rules: [],
        })
        .expect(400);
    });
  });

  describe('POST /api/v1/flags/:key/disable', () => {
    it('should disable a flag and create an audit log', async () => {
      await createFlag(app, adminToken, {
        key: 'kill-switch-test',
        name: 'Kill Switch Test',
        enabled: true,
      });

      const response = await request
        .default(app.getHttpServer())
        .post('/api/v1/flags/kill-switch-test/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Critical production issue',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        key: 'kill-switch-test',
        enabled: false,
        version: 2,
      });

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          flagId: response.body.id,
          action: 'DISABLED',
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog!.reason).toBe('Critical production issue');
      expect(auditLog!.before).toBeDefined();
      expect(auditLog!.after).toBeDefined();
    });

    it('should return 409 when the flag is already disabled', async () => {
      await createFlag(app, adminToken, {
        key: 'already-disabled-test',
        name: 'Already Disabled Test',
        enabled: false,
      });

      const flagBefore = await prisma.flag.findUnique({
        where: {
          key: 'already-disabled-test',
        },
      });

      const auditCountBefore = await prisma.auditLog.count({
        where: {
          flagId: flagBefore!.id,
          action: 'DISABLED',
        },
      });

      await request
        .default(app.getHttpServer())
        .post('/api/v1/flags/already-disabled-test/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Should not disable again',
        })
        .expect(409);

      const flagAfter = await prisma.flag.findUnique({
        where: {
          key: 'already-disabled-test',
        },
      });

      const auditCountAfter = await prisma.auditLog.count({
        where: {
          flagId: flagBefore!.id,
          action: 'DISABLED',
        },
      });

      expect(flagAfter).toMatchObject({
        enabled: false,
        version: 1,
      });

      expect(auditCountAfter).toBe(auditCountBefore);
    });

    it('should require a reason', async () => {
      await createFlag(app, adminToken, {
        key: 'disable-reason-test',
        enabled: true,
      });

      await request
        .default(app.getHttpServer())
        .post('/api/v1/flags/disable-reason-test/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('should return 404 when flag does not exist', async () => {
      await request
        .default(app.getHttpServer())
        .post('/api/v1/flags/does-not-exist/disable')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Testing missing flag',
        })
        .expect(404);
    });

    it('should reject request without admin token', async () => {
      await request
        .default(app.getHttpServer())
        .post('/api/v1/flags/protected/disable')
        .send({
          reason: 'Should fail',
        })
        .expect(401);
    });
  });

  describe('POST /api/v1/flags/:key/enable', () => {
    it('should enable a flag and create an audit log', async () => {
      await createFlag(app, adminToken, {
        key: 'enable-test',
        name: 'Enable Test',
        enabled: false,
      });

      const response = await request
        .default(app.getHttpServer())
        .post('/api/v1/flags/enable-test/enable')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(response.body).toMatchObject({
        key: 'enable-test',
        enabled: true,
        version: 2,
      });

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          flagId: response.body.id,
          action: 'ENABLED',
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog!.reason).toBeNull();
      expect(auditLog!.before).toBeDefined();
      expect(auditLog!.after).toBeDefined();
    });

    it('should return 409 when the flag is already enabled', async () => {
      await createFlag(app, adminToken, {
        key: 'already-enabled-test',
        name: 'Already Enabled Test',
        enabled: true,
      });

      const flagBefore = await prisma.flag.findUnique({
        where: {
          key: 'already-enabled-test',
        },
      });

      const auditCountBefore = await prisma.auditLog.count({
        where: {
          flagId: flagBefore!.id,
          action: 'ENABLED',
        },
      });

      await request
        .default(app.getHttpServer())
        .post('/api/v1/flags/already-enabled-test/enable')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);

      const flagAfter = await prisma.flag.findUnique({
        where: {
          key: 'already-enabled-test',
        },
      });

      const auditCountAfter = await prisma.auditLog.count({
        where: {
          flagId: flagBefore!.id,
          action: 'ENABLED',
        },
      });

      expect(flagAfter).toMatchObject({
        enabled: true,
        version: 1,
      });

      expect(auditCountAfter).toBe(auditCountBefore);
    });

    it('should return 404 when flag does not exist', async () => {
      await request
        .default(app.getHttpServer())
        .post('/api/v1/flags/does-not-exist/enable')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should reject request without admin token', async () => {
      await request
        .default(app.getHttpServer())
        .post('/api/v1/flags/protected/enable')
        .expect(401);
    });
  });

  describe('DELETE /api/v1/flags/:key', () => {
    it('should archive a flag and create an audit log', async () => {
      await createFlag(app, adminToken, {
        key: 'archive-test',
        name: 'Archive Test',
        enabled: true,
      });

      const response = await request
        .default(app.getHttpServer())
        .delete('/api/v1/flags/archive-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        key: 'archive-test',
        enabled: true,
        version: 2,
      });

      expect(response.body.archivedAt).not.toBeNull();

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          flagId: response.body.id,
          action: 'ARCHIVED',
        },
      });

      expect(auditLog).not.toBeNull();
      expect(auditLog!.reason).toBeNull();
      expect(auditLog!.before).toBeDefined();
      expect(auditLog!.after).toBeDefined();
    });

    it('should no longer return an archived flag by key', async () => {
      await createFlag(app, adminToken, {
        key: 'archive-get-test',
        name: 'Archive Get Test',
      });

      await request
        .default(app.getHttpServer())
        .delete('/api/v1/flags/archive-get-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request
        .default(app.getHttpServer())
        .get('/api/v1/flags/archive-get-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should not include archived flags in the list', async () => {
      await createFlag(app, adminToken, {
        key: 'archive-list-test',
        name: 'Archive List Test',
      });

      await request
        .default(app.getHttpServer())
        .delete('/api/v1/flags/archive-list-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const response = await request
        .default(app.getHttpServer())
        .get('/api/v1/flags')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        response.body.items.some(
          (flag: { key: string }) => flag.key === 'archive-list-test',
        ),
      ).toBe(false);
    });

    it('should return 404 when flag does not exist', async () => {
      await request
        .default(app.getHttpServer())
        .delete('/api/v1/flags/does-not-exist')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 when flag is already archived', async () => {
      await createFlag(app, adminToken, {
        key: 'already-archived-test',
        name: 'Already Archived Test',
      });

      await request
        .default(app.getHttpServer())
        .delete('/api/v1/flags/already-archived-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request
        .default(app.getHttpServer())
        .delete('/api/v1/flags/already-archived-test')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should reject request without admin token', async () => {
      await request
        .default(app.getHttpServer())
        .delete('/api/v1/flags/protected')
        .expect(401);
    });
  });
});
