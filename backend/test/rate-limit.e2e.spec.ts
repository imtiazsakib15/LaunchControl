import { Controller, Get, INestApplication, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';

@Controller('rate-limit-test')
class RateLimitTestController {
  @Get()
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  getLimitedResource() {
    return { ok: true };
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
  ],
  controllers: [RateLimitTestController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
class RateLimitTestModule {}

describe('Rate limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RateLimitTestModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('allows requests within the limit and returns 429 after it is exceeded', async () => {
    await request(app.getHttpServer()).get('/rate-limit-test').expect(200);

    await request(app.getHttpServer()).get('/rate-limit-test').expect(200);

    await request(app.getHttpServer()).get('/rate-limit-test').expect(429);
  });
});
