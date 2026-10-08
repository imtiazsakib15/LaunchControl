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
    if (!flag.key) {
      return false;
    }

    if (!Number.isInteger(flag.rolloutPercentage)) {
      return false;
    }

    if (flag.rolloutPercentage < 0 || flag.rolloutPercentage > 100) {
      return false;
    }

    if (!Array.isArray(flag.rules)) {
      return false;
    }

    return true;
  }
}
