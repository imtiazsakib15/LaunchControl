import { evaluateCondition } from './condition-evaluator.js';

import { getRolloutBucket, isInRollout } from './rollout.js';

import type {
  EvaluationDebugResult,
  EvaluationFlag,
  EvaluationResult,
  EvaluationTraceStep,
  EvaluationUser,
} from './evaluation.types.js';

export class EvaluationEngine {
  evaluate(flag: EvaluationFlag, user: EvaluationUser): EvaluationResult {
    return this.runEvaluation(flag, user, false).result;
  }

  evaluateWithTrace(
    flag: EvaluationFlag,
    user: EvaluationUser,
  ): EvaluationDebugResult {
    const evaluation = this.runEvaluation(flag, user, true);

    return {
      result: evaluation.result,
      trace: evaluation.trace,
    };
  }

  private runEvaluation(
    flag: EvaluationFlag,
    user: EvaluationUser,
    includeTrace: boolean,
  ): EvaluationDebugResult {
    const trace: EvaluationTraceStep[] | null = includeTrace ? [] : null;

    const addTrace = (step: EvaluationTraceStep): void => {
      trace?.push(step);
    };

    const defaultResult: EvaluationResult = {
      value: flag.defaultValue,
      reason: 'DEFAULT_VALUE',
      flagVersion: flag.version,
    };

    if (!this.isValidFlagConfig(flag)) {
      addTrace({
        step: 'CONFIG_VALIDATION',
        result: 'INVALID',
      });

      return { result: defaultResult, trace: trace ?? [] };
    }

    addTrace({
      step: 'CONFIG_VALIDATION',
      result: 'VALID',
    });

    if (flag.archivedAt != null) {
      addTrace({
        step: 'ARCHIVED_STATUS',
        result: 'ARCHIVED',
      });

      return { result: defaultResult, trace: trace ?? [] };
    }

    addTrace({
      step: 'ARCHIVED_STATUS',
      result: 'ACTIVE',
    });

    if (!user.key) {
      addTrace({
        step: 'USER_KEY',
        result: 'MISSING',
      });

      return { result: defaultResult, trace: trace ?? [] };
    }

    addTrace({
      step: 'USER_KEY',
      result: 'PRESENT',
    });

    if (!flag.enabled) {
      addTrace({
        step: 'FLAG_STATUS',
        result: 'DISABLED',
      });

      return {
        result: {
          value: false,
          reason: 'FLAG_OFF',
          flagVersion: flag.version,
        },
        trace: trace ?? [],
      };
    }

    addTrace({
      step: 'FLAG_STATUS',
      result: 'ENABLED',
    });

    const attributes = user.attributes ?? {};

    try {
      for (const [ruleIndex, rule] of flag.rules.entries()) {
        const matched = evaluateCondition(rule.when, attributes);

        addTrace({
          step: 'TARGETING_RULE',
          ruleIndex,
          matched,
        });

        if (matched) {
          return {
            result: {
              value: rule.serve,
              reason: 'TARGETING_RULE',
              flagVersion: flag.version,
            },
            trace: trace ?? [],
          };
        }
      }
    } catch {
      // Invalid persisted rule configuration must not crash evaluation.
      addTrace({
        step: 'CONFIG_VALIDATION',
        result: 'INVALID',
      });

      return {
        result: defaultResult,
        trace: trace ?? [],
      };
    }

    const bucket = getRolloutBucket(flag.key, user.key);
    const matched = isInRollout(flag.key, user.key, flag.rolloutPercentage);

    addTrace({
      step: 'PERCENTAGE_ROLLOUT',
      percentage: flag.rolloutPercentage,
      bucket,
      matched,
    });

    return {
      result: {
        value: matched,
        reason: 'PERCENTAGE_ROLLOUT',
        flagVersion: flag.version,
      },
      trace: trace ?? [],
    };
  }

  private isValidFlagConfig(flag: EvaluationFlag): boolean {
    if (!isRecord(flag)) return false;

    if (typeof flag.key !== 'string' || flag.key.length === 0) {
      return false;
    }

    if (typeof flag.defaultValue !== 'boolean') return false;
    if (typeof flag.enabled !== 'boolean') return false;

    if (!Number.isInteger(flag.version) || flag.version < 1) {
      return false;
    }

    if (
      !Number.isInteger(flag.rolloutPercentage) ||
      flag.rolloutPercentage < 0 ||
      flag.rolloutPercentage > 100
    ) {
      return false;
    }

    if (flag.archivedAt !== null && !(flag.archivedAt instanceof Date)) {
      return false;
    }

    if (!Array.isArray(flag.rules)) return false;

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
    if (!LEAF_OPERATORS.has(String(value.operator))) {
      return false;
    }

    if (
      value.operator !== 'exists' &&
      !Object.prototype.hasOwnProperty.call(value, 'value')
    ) {
      return false;
    }

    return true;
  }

  if (value.op !== 'AND' && value.op !== 'OR' && value.op !== 'NOT') {
    return false;
  }

  return (
    Array.isArray(value.children) && value.children.every(isValidCondition)
  );
}
