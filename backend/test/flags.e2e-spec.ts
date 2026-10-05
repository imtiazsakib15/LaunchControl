import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

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
});
