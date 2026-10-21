import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { evaluateSchema, type EvaluateInput } from './dto/evaluate.dto.js';
import { EvaluationService } from './evaluation.service.js';
import { AdminAuthGuard } from '../common/guards/admin-auth.guard.js';
import { Throttle } from '@nestjs/throttler';

@Controller('api/v1/evaluate')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post()
  @HttpCode(HttpStatus.OK)
  evaluate(
    @Body(new ZodValidationPipe(evaluateSchema))
    input: EvaluateInput,
  ) {
    return this.evaluationService.evaluate(input);
  }

  @UseGuards(AdminAuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('debug')
  @HttpCode(HttpStatus.OK)
  debug(
    @Body(new ZodValidationPipe(evaluateSchema))
    input: EvaluateInput,
  ) {
    return this.evaluationService.debugEvaluate(input);
  }
}
