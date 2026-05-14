import type { PrismaClient } from '@prisma/client';
import type { MonthlyUsage, MonthlyUsageRepository } from './MonthlyUsageRepository.js';

export class PrismaMonthlyUsageRepository implements MonthlyUsageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(userId: string, usageMonth: string): Promise<MonthlyUsage> {
    const usage = await this.prisma.monthlyFreeUsage.upsert({
      where: { userId_usageMonth: { userId, usageMonth } },
      create: { userId, usageMonth, usedMessages: 0 },
      update: {},
    });

    return usage;
  }

  async increment(userId: string, usageMonth: string): Promise<MonthlyUsage> {
    const usage = await this.prisma.monthlyFreeUsage.upsert({
      where: { userId_usageMonth: { userId, usageMonth } },
      create: { userId, usageMonth, usedMessages: 1 },
      update: { usedMessages: { increment: 1 } },
    });

    return usage;
  }
}
