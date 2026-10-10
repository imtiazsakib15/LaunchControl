import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module.js';
import { validateEnv } from './config/env.validation.js';
import { FlagsModule } from './flags/flags.module.js';
import { EvaluationModule } from './evaluation/evaluation.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    FlagsModule,
    EvaluationModule,
  ],
})
export class AppModule {}
