import type { SubscriptionBundle as PrismaSubscriptionBundle } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { SubscriptionBundle } from '../domain/SubscriptionBundle.js';
import type {
  BillingCycle,
  SubscriptionStatus,
  SubscriptionTier,
} from '../domain/SubscriptionBundle.js';
import type { SubscriptionBundleRepository } from './SubscriptionBundleRepository.js';

export class PrismaSubscriptionBundleRepository implements SubscriptionBundleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(bundle: SubscriptionBundle): Promise<void> {
    await this.prisma.subscriptionBundle.create({
      data: this.toData(bundle),
    });
  }

  async update(bundle: SubscriptionBundle): Promise<void> {
    await this.prisma.subscriptionBundle.update({
      where: { id: bundle.id },
      data: this.toData(bundle),
    });
  }

  async findById(id: string): Promise<SubscriptionBundle | null> {
    const row = await this.prisma.subscriptionBundle.findUnique({ where: { id } });
    return row ? this.toEntity(row) : null;
  }

  async findByUser(userId: string, limit: number): Promise<SubscriptionBundle[]> {
    const rows = await this.prisma.subscriptionBundle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((row) => this.toEntity(row));
  }

  async findUsableByUser(userId: string, now: Date): Promise<SubscriptionBundle[]> {
    const rows = await this.prisma.subscriptionBundle.findMany({
      where: {
        userId,
        status: { in: ['active', 'cancelled'] },
        endDate: { gt: now },
      },
    });

    return rows.map((row) => this.toEntity(row)).filter((bundle) => bundle.remainingMessages > 0);
  }

  async findRenewable(now: Date): Promise<SubscriptionBundle[]> {
    const rows = await this.prisma.subscriptionBundle.findMany({
      where: {
        status: 'active',
        autoRenew: true,
        renewalDate: { lte: now },
      },
    });

    return rows.map((row) => this.toEntity(row));
  }

  private toData(bundle: SubscriptionBundle) {
    return {
      id: bundle.id,
      userId: bundle.userId,
      tier: bundle.tier,
      billingCycle: bundle.billingCycle,
      status: bundle.status,
      autoRenew: bundle.autoRenew,
      maxMessages: bundle.maxMessages,
      usedMessages: bundle.usedMessages,
      priceCents: bundle.priceCents,
      startDate: bundle.startDate,
      endDate: bundle.endDate,
      renewalDate: bundle.renewalDate,
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
    };
  }

  private toEntity(row: PrismaSubscriptionBundle): SubscriptionBundle {
    return new SubscriptionBundle(
      row.id,
      row.userId,
      row.tier as SubscriptionTier,
      row.billingCycle as BillingCycle,
      row.status as SubscriptionStatus,
      row.autoRenew,
      row.maxMessages,
      row.usedMessages,
      row.priceCents,
      row.startDate,
      row.endDate,
      row.renewalDate,
      row.createdAt,
      row.updatedAt,
    );
  }
}
