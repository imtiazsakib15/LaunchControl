import { describe, expect, it } from 'vitest';

import { EvaluationEngine } from '../src/evaluation/evaluation.engine.js';
import { evaluateCondition } from '../src/evaluation/condition-evaluator.js';
import {
  getRolloutBucket,
  isInRollout,
  murmur3_32,
} from '../src/evaluation/rollout.js';
import type { EvaluationFlag } from '../src/evaluation/evaluation.types.js';

describe('condition evaluator', () => {
  it('should evaluate equals', () => {
    expect(
      evaluateCondition(
        {
          attr: 'country',
          operator: 'equals',
          value: 'BD',
        },
        {
          country: 'BD',
        },
      ),
    ).toBe(true);
  });

  it('should evaluate notEquals', () => {
    expect(
      evaluateCondition(
        {
          attr: 'country',
          operator: 'notEquals',
          value: 'US',
        },
        {
          country: 'BD',
        },
      ),
    ).toBe(true);
  });

  it('should return false for missing attribute', () => {
    expect(
      evaluateCondition(
        {
          attr: 'country',
          operator: 'equals',
          value: 'BD',
        },
        {},
      ),
    ).toBe(false);
  });

  it('should evaluate exists', () => {
    expect(
      evaluateCondition(
        {
          attr: 'country',
          operator: 'exists',
        },
        {
          country: 'BD',
        },
      ),
    ).toBe(true);

    expect(
      evaluateCondition(
        {
          attr: 'country',
          operator: 'exists',
        },
        {},
      ),
    ).toBe(false);
  });

  it('should evaluate contains for strings', () => {
    expect(
      evaluateCondition(
        {
          attr: 'name',
          operator: 'contains',
          value: 'tia',
        },
        {
          name: 'Imtiaz',
        },
      ),
    ).toBe(true);
  });

  it('should evaluate contains for arrays', () => {
    expect(
      evaluateCondition(
        {
          attr: 'roles',
          operator: 'contains',
          value: 'admin',
        },
        {
          roles: ['user', 'admin'],
        },
      ),
    ).toBe(true);
  });

  it('should evaluate startsWith', () => {
    expect(
      evaluateCondition(
        {
          attr: 'name',
          operator: 'startsWith',
          value: 'Im',
        },
        {
          name: 'Imtiaz',
        },
      ),
    ).toBe(true);
  });

  it('should evaluate endsWith', () => {
    expect(
      evaluateCondition(
        {
          attr: 'email',
          operator: 'endsWith',
          value: '.com',
        },
        {
          email: 'user@example.com',
        },
      ),
    ).toBe(true);
  });

  it('should evaluate numeric comparisons', () => {
    expect(
      evaluateCondition(
        {
          attr: 'age',
          operator: 'gt',
          value: 18,
        },
        {
          age: 25,
        },
      ),
    ).toBe(true);

    expect(
      evaluateCondition(
        {
          attr: 'age',
          operator: 'gte',
          value: 25,
        },
        {
          age: 25,
        },
      ),
    ).toBe(true);

    expect(
      evaluateCondition(
        {
          attr: 'age',
          operator: 'lt',
          value: 30,
        },
        {
          age: 25,
        },
      ),
    ).toBe(true);

    expect(
      evaluateCondition(
        {
          attr: 'age',
          operator: 'lte',
          value: 25,
        },
        {
          age: 25,
        },
      ),
    ).toBe(true);
  });

  it('should evaluate in and notIn', () => {
    expect(
      evaluateCondition(
        {
          attr: 'country',
          operator: 'in',
          value: ['BD', 'IN', 'NP'],
        },
        {
          country: 'BD',
        },
      ),
    ).toBe(true);

    expect(
      evaluateCondition(
        {
          attr: 'country',
          operator: 'notIn',
          value: ['US', 'UK'],
        },
        {
          country: 'BD',
        },
      ),
    ).toBe(true);
  });

  it('should evaluate AND', () => {
    expect(
      evaluateCondition(
        {
          op: 'AND',
          children: [
            {
              attr: 'country',
              operator: 'equals',
              value: 'BD',
            },
            {
              attr: 'plan',
              operator: 'equals',
              value: 'premium',
            },
          ],
        },
        {
          country: 'BD',
          plan: 'premium',
        },
      ),
    ).toBe(true);
  });

  it('should evaluate OR', () => {
    expect(
      evaluateCondition(
        {
          op: 'OR',
          children: [
            {
              attr: 'country',
              operator: 'equals',
              value: 'US',
            },
            {
              attr: 'country',
              operator: 'equals',
              value: 'BD',
            },
          ],
        },
        {
          country: 'BD',
        },
      ),
    ).toBe(true);
  });

  it('should evaluate NOT', () => {
    expect(
      evaluateCondition(
        {
          op: 'NOT',
          children: [
            {
              attr: 'country',
              operator: 'equals',
              value: 'US',
            },
          ],
        },
        {
          country: 'BD',
        },
      ),
    ).toBe(true);
  });

  it('should evaluate nested conditions', () => {
    expect(
      evaluateCondition(
        {
          op: 'OR',
          children: [
            {
              op: 'AND',
              children: [
                {
                  attr: 'country',
                  operator: 'equals',
                  value: 'BD',
                },
                {
                  attr: 'plan',
                  operator: 'equals',
                  value: 'premium',
                },
              ],
            },
            {
              attr: 'role',
              operator: 'equals',
              value: 'admin',
            },
          ],
        },
        {
          country: 'BD',
          plan: 'premium',
        },
      ),
    ).toBe(true);
  });

  it('should treat string contains as case-sensitive', () => {
    expect(
      evaluateCondition(
        { attr: 'name', operator: 'contains', value: 'TIA' },
        { name: 'Imtiaz' },
      ),
    ).toBe(false);
  });

  it('should return false when startsWith receives a non-string value', () => {
    expect(
      evaluateCondition(
        { attr: 'name', operator: 'startsWith', value: 'Im' },
        { name: 123 },
      ),
    ).toBe(false);
  });

  it('should return false when numeric comparison types differ', () => {
    expect(
      evaluateCondition(
        { attr: 'age', operator: 'gt', value: 18 },
        { age: '20' },
      ),
    ).toBe(false);
  });

  it('should treat an explicitly undefined attribute as existing', () => {
    expect(
      evaluateCondition(
        { attr: 'plan', operator: 'exists' },
        { plan: undefined },
      ),
    ).toBe(true);
  });
});

describe('rollout', () => {
  it('should return a stable hash', () => {
    const first = murmur3_32('new-checkout:user-123');
    const second = murmur3_32('new-checkout:user-123');

    expect(first).toBe(second);
  });

  it('should return a bucket between 0 and 99', () => {
    const bucket = getRolloutBucket('new-checkout', 'user-123');

    expect(bucket).toBeGreaterThanOrEqual(0);
    expect(bucket).toBeLessThan(100);
  });

  it('should always be off at 0 percent', () => {
    expect(isInRollout('flag', 'user', 0)).toBe(false);
  });

  it('should always be on at 100 percent', () => {
    expect(isInRollout('flag', 'user', 100)).toBe(true);
  });

  it('should deterministically evaluate the same user', () => {
    const first = isInRollout('new-checkout', 'user-123', 50);

    const second = isInRollout('new-checkout', 'user-123', 50);

    expect(first).toBe(second);
  });

  it('should match fixed MurmurHash3 x86 32-bit reference vectors', () => {
    expect(murmur3_32('')).toBe(0x00000000);
    expect(murmur3_32('foo')).toBe(0xf6a5c420);
    expect(murmur3_32('hello')).toBe(0x248bfa47);
  });

  it('should distribute approximately 10% of users at 10% rollout', () => {
    const totalUsers = 10_000;
    let enabledUsers = 0;

    for (let i = 0; i < totalUsers; i += 1) {
      if (isInRollout('distribution-test', `user-${i}`, 10)) {
        enabledUsers += 1;
      }
    }

    const enabledPercentage = (enabledUsers / totalUsers) * 100;

    expect(enabledPercentage).toBeGreaterThanOrEqual(9);
    expect(enabledPercentage).toBeLessThanOrEqual(11);
  });

  it('should never disable an already-enabled user when rollout increases', () => {
    const flagKey = 'monotonicity-test';

    for (let i = 0; i < 10_000; i += 1) {
      const userKey = `user-${i}`;
      let wasEnabled = false;

      for (let percentage = 0; percentage <= 100; percentage += 1) {
        const isEnabled = isInRollout(flagKey, userKey, percentage);

        if (wasEnabled) {
          expect(isEnabled).toBe(true);
        }

        wasEnabled = isEnabled;
      }
    }
  });
});

describe('EvaluationEngine', () => {
  const engine = new EvaluationEngine();

  const createFlag = (
    overrides: Partial<EvaluationFlag> = {},
  ): EvaluationFlag => ({
    key: 'new-checkout',
    enabled: true,
    defaultValue: false,
    rolloutPercentage: 0,
    rules: [],
    version: 1,
    archivedAt: null,
    ...overrides,
  });

  it('should return default for missing user key', () => {
    const result = engine.evaluate(
      createFlag({
        defaultValue: true,
      }),
      {},
    );

    expect(result).toEqual({
      value: true,
      reason: 'DEFAULT_VALUE',
      flagVersion: 1,
    });
  });

  it('should return default for archived flag', () => {
    const result = engine.evaluate(
      createFlag({
        defaultValue: true,
        archivedAt: new Date(),
      }),
      {
        key: 'user-123',
      },
    );

    expect(result).toEqual({
      value: true,
      reason: 'DEFAULT_VALUE',
      flagVersion: 1,
    });
  });

  it('should return false when flag is disabled', () => {
    const result = engine.evaluate(
      createFlag({
        enabled: false,
        defaultValue: true,
      }),
      {
        key: 'user-123',
      },
    );

    expect(result).toEqual({
      value: false,
      reason: 'FLAG_OFF',
      flagVersion: 1,
    });
  });

  it('should use the first matching rule', () => {
    const result = engine.evaluate(
      createFlag({
        rules: [
          {
            serve: true,
            when: {
              attr: 'country',
              operator: 'equals',
              value: 'BD',
            },
          },
          {
            serve: false,
            when: {
              attr: 'plan',
              operator: 'equals',
              value: 'premium',
            },
          },
        ],
      }),
      {
        key: 'user-123',
        attributes: {
          country: 'BD',
          plan: 'premium',
        },
      },
    );

    expect(result).toEqual({
      value: true,
      reason: 'TARGETING_RULE',
      flagVersion: 1,
    });
  });

  it('should allow a matching rule to override rollout', () => {
    const result = engine.evaluate(
      createFlag({
        rolloutPercentage: 0,
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
      }),
      {
        key: 'user-123',
        attributes: {
          country: 'BD',
        },
      },
    );

    expect(result).toEqual({
      value: true,
      reason: 'TARGETING_RULE',
      flagVersion: 1,
    });
  });

  it('should use percentage rollout when no rule matches', () => {
    const result = engine.evaluate(
      createFlag({
        rolloutPercentage: 100,
      }),
      {
        key: 'user-123',
      },
    );

    expect(result).toEqual({
      value: true,
      reason: 'PERCENTAGE_ROLLOUT',
      flagVersion: 1,
    });
  });

  it('should use rollout before default when no rule matches', () => {
    const result = engine.evaluate(
      createFlag({
        defaultValue: true,
        rolloutPercentage: 0,
      }),
      {
        key: 'user-123',
      },
    );

    expect(result).toEqual({
      value: false,
      reason: 'PERCENTAGE_ROLLOUT',
      flagVersion: 1,
    });
  });

  it('should fallback to default for invalid configuration', () => {
    const result = engine.evaluate(
      createFlag({
        defaultValue: true,
        rolloutPercentage: 101,
      }),
      {
        key: 'user-123',
      },
    );

    expect(result).toEqual({
      value: true,
      reason: 'DEFAULT_VALUE',
      flagVersion: 1,
    });
  });

  it('should return FLAG_OFF before evaluating targeting rules', () => {
    const result = engine.evaluate(
      createFlag({
        enabled: false,
        defaultValue: true,
        rolloutPercentage: 100,
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
      }),
      {
        key: 'user-123',
        attributes: {
          country: 'BD',
        },
      },
    );

    expect(result).toEqual({
      value: false,
      reason: 'FLAG_OFF',
      flagVersion: 1,
    });
  });

  it('should return default when the rollout percentage is invalid', () => {
    const result = engine.evaluate(
      createFlag({
        defaultValue: true,
        rolloutPercentage: -1,
      }),
      {
        key: 'user-123',
      },
    );

    expect(result).toEqual({
      value: true,
      reason: 'DEFAULT_VALUE',
      flagVersion: 1,
    });
  });
});
