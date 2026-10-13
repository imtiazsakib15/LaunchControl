import type { Rule } from '../flags/schemas/rule.schema.js';

export interface EvaluationUser {
  key?: string;
  attributes?: Record<string, unknown>;
}

export interface EvaluationFlag {
  key: string;
  enabled: boolean;
  defaultValue: boolean;
  rolloutPercentage: number;
  rules: Rule[];
  version: number;
  archivedAt: Date | null;
}

export type EvaluationReason =
  'DEFAULT_VALUE' | 'FLAG_OFF' | 'TARGETING_RULE' | 'PERCENTAGE_ROLLOUT';

export interface EvaluationResult {
  value: boolean;
  reason: EvaluationReason;
  flagVersion: number;
}

export type EvaluationTraceStep =
  | {
      step: 'CONFIG_VALIDATION';
      result: 'VALID' | 'INVALID';
    }
  | {
      step: 'FLAG_STATUS';
      result: 'ENABLED' | 'DISABLED';
    }
  | {
      step: 'ARCHIVED_STATUS';
      result: 'ACTIVE' | 'ARCHIVED';
    }
  | {
      step: 'USER_KEY';
      result: 'PRESENT' | 'MISSING';
    }
  | {
      step: 'TARGETING_RULE';
      ruleIndex: number;
      matched: boolean;
    }
  | {
      step: 'PERCENTAGE_ROLLOUT';
      percentage: number;
      bucket: number;
      matched: boolean;
    }
  | {
      step: 'FLAG_LOOKUP';
      result: 'FOUND' | 'NOT_FOUND';
    };

export interface EvaluationDebugResult {
  result: EvaluationResult;
  trace: EvaluationTraceStep[];
}
