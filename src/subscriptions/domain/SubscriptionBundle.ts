import { addBillingCycle } from '../../common/date.js';
import { AppError } from '../../common/errors.js';
import { createId } from '../../common/id.js';

export type SubscriptionTier = 'basic' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'inactive';

export const TIER_CATALOG: Record<
  SubscriptionTier,
  { maxMessages: number | null; monthlyPriceCents: number; yearlyPriceCents: number }
> = {
  basic: { maxMessages: 10, monthlyPriceCents: 900, yearlyPriceCents: 9000 },
  pro: { maxMessages: 100, monthlyPriceCents: 2900, yearlyPriceCents: 29000 },
  enterprise: { maxMessages: null, monthlyPriceCents: 19900, yearlyPriceCents: 199000 },
};

export class SubscriptionBundle {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tier: SubscriptionTier,
    public readonly billingCycle: BillingCycle,
    public status: SubscriptionStatus,
    public autoRenew: boolean,
    public readonly maxMessages: number | null,
    public usedMessages: number,
    public readonly priceCents: number,
    public startDate: Date,
    public endDate: Date,
    public renewalDate: Date,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static create(input: {
    userId: string;
    tier: SubscriptionTier;
    billingCycle: BillingCycle;
    autoRenew: boolean;
    now?: Date;
  }): SubscriptionBundle {
    const now = input.now ?? new Date();
    const catalog = TIER_CATALOG[input.tier];
    const endDate = addBillingCycle(now, input.billingCycle);

    return new SubscriptionBundle(
      createId(),
      input.userId,
      input.tier,
      input.billingCycle,
      'active',
      input.autoRenew,
      catalog.maxMessages,
      0,
      input.billingCycle === 'monthly' ? catalog.monthlyPriceCents : catalog.yearlyPriceCents,
      now,
      endDate,
      endDate,
      now,
      now,
    );
  }

  get remainingMessages(): number {
    if (this.maxMessages === null) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.max(this.maxMessages - this.usedMessages, 0);
  }

  isUsable(now = new Date()): boolean {
    return (this.status === 'active' || this.status === 'cancelled') && this.endDate > now;
  }

  consumeOne(now = new Date()): void {
    if (!this.isUsable(now) || this.remainingMessages <= 0) {
      throw new AppError('QUOTA_EXCEEDED', 'Subscription bundle has no remaining quota', 402, {
        bundleId: this.id,
      });
    }

    if (this.maxMessages !== null) {
      this.usedMessages += 1;
    }
    this.updatedAt = now;
  }

  cancel(now = new Date()): void {
    this.autoRenew = false;
    this.status = 'cancelled';
    this.updatedAt = now;
  }

  renew(now = new Date()): void {
    this.status = 'active';
    this.startDate = now;
    this.endDate = addBillingCycle(now, this.billingCycle);
    this.renewalDate = this.endDate;
    this.usedMessages = 0;
    this.updatedAt = now;
  }

  markInactive(now = new Date()): void {
    this.status = 'inactive';
    this.autoRenew = false;
    this.updatedAt = now;
  }
}
