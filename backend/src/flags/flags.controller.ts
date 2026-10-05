import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { AdminAuthGuard } from '../common/guards/admin-auth.guard.js';

import {
  createFlagSchema,
  type CreateFlagInput,
} from './dto/create-flag.dto.js';
import { FlagsService } from './flags.service.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';

@UseGuards(AdminAuthGuard)
@Controller('api/v1/flags')
export class FlagsController {
  constructor(private readonly flagsService: FlagsService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createFlagSchema))
    input: CreateFlagInput,
  ) {
    const requestId = randomUUID();

    return this.flagsService.create(input, requestId);
  }
}
