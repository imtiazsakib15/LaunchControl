import { ConflictException, Injectable } from '@nestjs/common';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateFlagInput } from './dto/create-flag.dto.js';

@Injectable()
export class FlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateFlagInput, requestId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const flag = await tx.flag.create({
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

        await tx.auditLog.create({
          data: {
            flagId: flag.id,
            action: 'CREATED',
            before: Prisma.JsonNull,
            after: flag,
            reason: null,
            requestId,
          },
        });

        return flag;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Flag with key "${input.key}" already exists`,
        );
      }

      throw error;
    }
  }
}
