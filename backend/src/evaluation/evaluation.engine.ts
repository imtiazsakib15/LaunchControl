import { evaluateCondition } from './condition-evaluator.js';

import { isInRollout } from './rollout.js';

import type {
  EvaluationFlag,
  EvaluationResult,
  EvaluationUser,
} from './evaluation.types.js';

export class EvaluationEngine {
  evaluate(flag: EvaluationFlag, user: EvaluationUser): EvaluationResult {
    const defaultResult: EvaluationResult = {
      value: flag.defaultValue,
      reason: 'DEFAULT_VALUE',
      flagVersion: flag.version,
    };

    if (!this.isValidFlagConfig(flag)) {
      return defaultResult;
    }

    if (flag.archivedAt !== null) {
      return defaultResult;
    }

    if (!user.key) {
      return defaultResult;
    }

    if (!flag.enabled) {
      return {
        value: false,
        reason: 'FLAG_OFF',
        flagVersion: flag.version,
      };
    }

    const attributes = user.attributes ?? {};

    for (const rule of flag.rules) {
      if (evaluateCondition(rule.when, attributes)) {
        return {
          value: rule.serve,
          reason: 'TARGETING_RULE',
          flagVersion: flag.version,
        };
      }
    }

    return {
      value: isInRollout(flag.key, user.key, flag.rolloutPercentage),
      reason: 'PERCENTAGE_ROLLOUT',
      flagVersion: flag.version,
    };
  }

  private isValidFlagConfig(flag: EvaluationFlag): boolean {
    if (!flag.key) return false;

    if (
      !Number.isInteger(flag.rolloutPercentage) ||
      flag.rolloutPercentage < 0 ||
      flag.rolloutPercentage > 100
    ) {
      return false;
    }

    if (!Array.isArray(flag.rules)) {
      return false;
    }

    return flag.rules.every(isValidRule);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const LEAF_OPERATORS = new Set([
  'equals',
  'notEquals',
  'contains',
  'startsWith',
  'endsWith',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'notIn',
  'exists',
]);

function isValidRule(value: unknown): boolean {
  if (!isRecord(value)) return false;

  return typeof value.serve === 'boolean' && isValidCondition(value.when);
}

function isValidCondition(value: unknown): boolean {
  if (!isRecord(value)) return false;

  if (typeof value.attr === 'string') {
    return (
      LEAF_OPERATORS.has(String(value.operator)) &&
      (value.operator === 'exists' ||
        Object.prototype.hasOwnProperty.call(value, 'value'))
    );
  }

  if (value.op !== 'AND' && value.op !== 'OR' && value.op !== 'NOT') {
    return false;
  }

  return (
    Array.isArray(value.children) && value.children.every(isValidCondition)
  );
}
