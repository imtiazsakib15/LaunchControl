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

  it('rejects a missing DATABASE_URL', () => {
    const { DATABASE_URL: _databaseUrl, ...env } = validEnv;

    expect(() => validateEnv(env)).toThrow('Environment validation failed:');
  });

  it('rejects an invalid DATABASE_URL', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        DATABASE_URL: 'not-a-valid-url',
      }),
    ).toThrow('Environment validation failed:');
  });

  it('rejects a missing ADMIN_TOKEN', () => {
    const { ADMIN_TOKEN: _adminToken, ...env } = validEnv;

    expect(() => validateEnv(env)).toThrow('Environment validation failed:');
  });

  it('rejects an empty ADMIN_TOKEN', () => {
    expect(() =>
      validateEnv({
        ...validEnv,
        ADMIN_TOKEN: '',
      }),
    ).toThrow('Environment validation failed:');
  });
});
