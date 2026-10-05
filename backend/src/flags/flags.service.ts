import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import type { CreateFlagInput } from './dto/create-flag.dto.js';

@Injectable()
export class FlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateFlagInput) {
    return this.prisma.flag.create({
      data: {
        key: input.key,
        name: input.name,
        description: input.description,
        enabled: input.enabled,
        defaultValue: input.defaultValue,
        rolloutPercentage: input.rolloutPercentage,
        rules: input.rules,
      },
    });
  }
}
