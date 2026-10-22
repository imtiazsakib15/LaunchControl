import { describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import request from 'supertest';

describe('Request ID middleware (e2e)', () => {
  let app: INestApplication;

  it('should attach a unique request ID to each response', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    const { requestIdMiddleware } =
      await import('../src/common/middleware/request-id.middleware.js');

    app.use(requestIdMiddleware);

    await app.init();

    const first = await request(app.getHttpServer()).get('/health');
    const second = await request(app.getHttpServer()).get('/health');

    expect(first.headers['x-request-id']).toBeDefined();
    expect(second.headers['x-request-id']).toBeDefined();
    expect(first.headers['x-request-id']).not.toBe(
      second.headers['x-request-id'],
    );

    await app.close();
  });
});
