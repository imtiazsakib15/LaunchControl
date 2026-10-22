import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Throttle } from '@nestjs/throttler';

import {
  createFlagSchema,
  type CreateFlagInput,
} from './dto/create-flag.dto.js';
import { listFlagsSchema, type ListFlagsInput } from './dto/list-flags.dto.js';
import {
  updateFlagSchema,
  type UpdateFlagInput,
} from './dto/update-flag.dto.js';
import {
  disableFlagSchema,
  type DisableFlagInput,
} from './dto/disable-flag.dto.js';
import { flagKeySchema } from './dto/flag-key.dto.js';

import { FlagsService } from './flags.service.js';

import { AdminAuthGuard } from '../common/guards/admin-auth.guard.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { RequestWithId } from '../common/types/request-with-id.type.js';

@UseGuards(AdminAuthGuard)
@Throttle({
  default: {
    limit: process.env.NODE_ENV === 'test' ? 10_000 : 30,
    ttl: 60_000,
  },
})
@Controller('api/v1/flags')
export class FlagsController {
  constructor(private readonly flagsService: FlagsService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createFlagSchema))
    input: CreateFlagInput,
    @Req() req: RequestWithId,
  ) {
    const requestId = req.requestId;

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
  async findOne(
    @Param('key', new ZodValidationPipe(flagKeySchema))
    key: string,
  ) {
    return this.flagsService.findByKey(key);
  }

  @Patch(':key')
  async update(
    @Param('key', new ZodValidationPipe(flagKeySchema))
    key: string,
    @Body(new ZodValidationPipe(updateFlagSchema))
    input: UpdateFlagInput,
    @Req() req: RequestWithId,
  ) {
    const requestId = req.requestId;

    return this.flagsService.update(key, input, requestId);
  }

  @Post(':key/disable')
  async disable(
    @Param('key', new ZodValidationPipe(flagKeySchema))
    key: string,
    @Body(new ZodValidationPipe(disableFlagSchema))
    input: DisableFlagInput,
    @Req() req: RequestWithId,
  ) {
    const requestId = req.requestId;

    return this.flagsService.disable(key, input.reason, requestId);
  }

  @Post(':key/enable')
  async enable(
    @Param('key', new ZodValidationPipe(flagKeySchema))
    key: string,
    @Req() req: RequestWithId,
  ) {
    const requestId = req.requestId;

    return this.flagsService.enable(key, requestId);
  }

  @Delete(':key')
  async archive(
    @Param('key', new ZodValidationPipe(flagKeySchema))
    key: string,
    @Req() req: RequestWithId,
  ) {
    const requestId = req.requestId;

    return this.flagsService.archive(key, requestId);
  }
}
