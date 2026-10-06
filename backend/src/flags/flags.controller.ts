import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { AdminAuthGuard } from '../common/guards/admin-auth.guard.js';

import {
  createFlagSchema,
  type CreateFlagInput,
} from './dto/create-flag.dto.js';
import { listFlagsSchema, type ListFlagsInput } from './dto/list-flags.dto.js';
import {
  updateFlagSchema,
  type UpdateFlagInput,
} from './dto/update-flag.dto.js';

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

  @Get()
  async findAll(
    @Query(new ZodValidationPipe(listFlagsSchema))
    query: ListFlagsInput,
  ) {
    return this.flagsService.findAll(query);
  }

  @Get(':key')
  async findOne(@Param('key') key: string) {
    return this.flagsService.findByKey(key);
  }

  @Patch(':key')
  async update(
    @Param('key') key: string,
    @Body(new ZodValidationPipe(updateFlagSchema))
    input: UpdateFlagInput,
  ) {
    const requestId = randomUUID();

    return this.flagsService.update(key, input, requestId);
  }
}
