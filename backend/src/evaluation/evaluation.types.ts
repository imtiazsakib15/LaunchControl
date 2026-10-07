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
  'DEFAULT' | 'FLAG_OFF' | 'TARGETING_RULE' | 'PERCENTAGE_ROLLOUT';

export interface EvaluationResult {
  value: boolean;
  reason: EvaluationReason;
  flagVersion: number;
}
