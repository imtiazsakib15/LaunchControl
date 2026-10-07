import type {
  EvaluationFlag,
  EvaluationResult,
  EvaluationUser,
} from './evaluation.types.js';

export class EvaluationEngine {
  evaluate(flag: EvaluationFlag, user: EvaluationUser): EvaluationResult {
    // 1. invalid/missing user key
    // 2. archived
    // 3. disabled
    // 4. targeting rules
    // 5. percentage rollout
    // 6. default
    throw new Error('Not implemented');
  }
}
