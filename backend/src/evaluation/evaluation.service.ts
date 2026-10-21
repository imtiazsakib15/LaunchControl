import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { EvaluationFlag } from './evaluation.types.js';
import { EvaluationEngine } from './evaluation.engine.js';
import type { EvaluateInput } from './dto/evaluate.dto.js';

type EvaluationFlagRecord = {
  key: string;
  enabled: boolean;
  defaultValue: boolean;
  rolloutPercentage: number;
  rules: unknown;
  version: number;
  archivedAt: Date | null;
};

@Injectable()
export class EvaluationService {
  private readonly engine = new EvaluationEngine();

  constructor(private readonly prisma: PrismaService) {}

  async evaluate(input: EvaluateInput) {
    const flag = await this.findFlag(input.flagKey);

    if (!flag) {
      return {
        value: false,
        reason: 'DEFAULT_VALUE' as const,
        flagVersion: 0,
      };
    }

    return this.engine.evaluate(this.toEvaluationFlag(flag), input.user);
  }

  async debugEvaluate(input: EvaluateInput) {
    const flag = await this.findFlag(input.flagKey);

    if (!flag) {
      return {
        flagKey: input.flagKey,
        value: false,
        reason: 'DEFAULT_VALUE' as const,
        flagVersion: 0,
        trace: [
          {
            step: 'FLAG_LOOKUP' as const,
            result: 'NOT_FOUND' as const,
          },
        ],
      };
    }

    const evaluation = this.engine.evaluateWithTrace(
      this.toEvaluationFlag(flag),
      input.user,
    );

    return {
      flagKey: flag.key,
      ...evaluation.result,
      trace: [
        {
          step: 'FLAG_LOOKUP' as const,
          result: 'FOUND' as const,
        },
        ...evaluation.trace,
      ],
    };
  }

  private async findFlag(
    flagKey: string,
  ): Promise<EvaluationFlagRecord | null> {
    return this.prisma.flag.findFirst({
      where: {
        key: flagKey,
        archivedAt: null,
      },
      select: {
        key: true,
        enabled: true,
        defaultValue: true,
        rolloutPercentage: true,
        rules: true,
        version: true,
        archivedAt: true,
      },
    });
  }

  private toEvaluationFlag(flag: EvaluationFlagRecord): EvaluationFlag {
    return {
      key: flag.key,
      enabled: flag.enabled,
      defaultValue: flag.defaultValue,
      rolloutPercentage: flag.rolloutPercentage,
      // Persisted JSON remains untrusted. The engine must validate it
      // before attempting to evaluate targeting rules.
      rules: flag.rules as EvaluationFlag['rules'],
      version: flag.version,
      archivedAt: flag.archivedAt,
    };
  }
}
