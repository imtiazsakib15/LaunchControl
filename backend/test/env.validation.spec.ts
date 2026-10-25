import { describe, expect, it } from 'vitest';

import { envSchema, validateEnv } from '../src/config/env.validation.js';

const validEnv = {
  DATABASE_URL: 'postgresql://user:password@localhost:5432/launchcontrol',
  ADMIN_TOKEN: 'test-admin-token',
};

describe('Environment validation', () => {
  it('accepts valid environment configuration', () => {
    expect(envSchema.safeParse(validEnv).success).toBe(true);
  });

  it('returns validated configuration', () => {
    expect(validateEnv(validEnv)).toEqual(validEnv);
  });

  it('accepts supported NODE_ENV values', () => {
    for (const NODE_ENV of ['development', 'test']) {
      expect(envSchema.safeParse({ ...validEnv, NODE_ENV }).success).toBe(true);
    }

    expect(
      envSchema.safeParse({
        ...validEnv,
        ADMIN_TOKEN: 'a-long-production-token-value',
        NODE_ENV: 'production',
      }).success,
    ).toBe(true);
  });

  it('rejects an unsupported NODE_ENV', () => {
    expect(() => validateEnv({ ...validEnv, NODE_ENV: 'staging' })).toThrow(
      'Environment validation failed:',
    );
  });

  it('rejects a missing DATABASE_URL', () => {
    const { DATABASE_URL: _databaseUrl, ...env } = validEnv;

    expect(() => validateEnv(env)).toThrow('Environment validation failed:');
  });

  it('rejects an invalid DATABASE_URL', () => {
    expect(() =>
      validateEnv({ ...validEnv, DATABASE_URL: 'not-a-valid-url' }),
    ).toThrow('Environment validation failed:');
  });

  it('rejects a missing ADMIN_TOKEN', () => {
    const { ADMIN_TOKEN: _adminToken, ...env } = validEnv;

    expect(() => validateEnv(env)).toThrow('Environment validation failed:');
  });

  it('rejects an empty ADMIN_TOKEN', () => {
    expect(() => validateEnv({ ...validEnv, ADMIN_TOKEN: '' })).toThrow(
      'Environment validation failed:',
    );
  });

  it('rejects a whitespace-only ADMIN_TOKEN', () => {
    expect(() => validateEnv({ ...validEnv, ADMIN_TOKEN: '   ' })).toThrow(
      'Environment validation failed:',
    );
  });

  it('rejects placeholder ADMIN_TOKEN in production', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        ADMIN_TOKEN: 'change-me',
        NODE_ENV: 'production',
      }),
    ).toThrow('Environment validation failed:');
  });

  it('rejects placeholder tokens case-insensitively in production', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        ADMIN_TOKEN: 'CHANGE-ME',
        NODE_ENV: 'production',
      }),
    ).toThrow('Environment validation failed:');
  });

  it('allows a non-placeholder token in production', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        ADMIN_TOKEN: 'a-long-production-token-value',
        NODE_ENV: 'production',
      }),
    ).not.toThrow();
  });

  it('does not expose database credentials in validation errors', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        DATABASE_URL: 'invalid-database-url',
      }),
    ).toThrow(
      'Environment validation failed: invalid or missing environment configuration.',
    );
  });

  it('does not expose ADMIN_TOKEN in validation errors', () => {
    try {
      validateEnv({
        ...validEnv,
        ADMIN_TOKEN: '   ',
      });
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect((error as Error).message).toBe(
        'Environment validation failed: invalid or missing environment configuration.',
      );
      expect((error as Error).message).not.toContain('test-admin-token');
    }
  });
});
