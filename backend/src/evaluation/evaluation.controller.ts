import { Body, Controller, Post } from '@nestjs/common';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { evaluateSchema, type EvaluateInput } from './dto/evaluate.dto.js';
import { EvaluationService } from './evaluation.service.js';

@Controller('api/v1/evaluate')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post()
  evaluate(
    @Body(new ZodValidationPipe(evaluateSchema))
    input: EvaluateInput,
  ) {
    return this.evaluationService.evaluate(input);
  }
}
