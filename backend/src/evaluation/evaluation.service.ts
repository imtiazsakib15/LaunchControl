import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { Rule } from '../flags/schemas/rule.schema.js';
import type { EvaluationFlag } from './evaluation.types.js';
import { EvaluationEngine } from './evaluation.engine.js';
import type { EvaluateInput } from './dto/evaluate.dto.js';

@Injectable()
export class EvaluationService {
  private readonly engine = new EvaluationEngine();

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(input: EvaluateInput) {
    const flag = await this.prisma.flag.findUnique({
      where: {
        key: input.flagKey,
      },
    });

    // A missing flag has no stored defaultValue.
    // This fallback is a documented implementation assumption.
    if (!flag) {
      return {
        value: false,
        reason: 'DEFAULT_VALUE' as const,
        flagVersion: 0,
      };
    }

    const evaluationFlag: EvaluationFlag = {
      key: flag.key,
      enabled: flag.enabled,
      defaultValue: flag.defaultValue,
      rolloutPercentage: flag.rolloutPercentage,
      rules: flag.rules as unknown as Rule[],
      version: flag.version,
      archivedAt: flag.archivedAt,
    };

    return this.engine.evaluate(evaluationFlag, input.user);
  }
}
