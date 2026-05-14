import { AppError } from '../../common/errors.js';
import { config } from '../../common/config.js';
import { SubscriptionBundle } from '../domain/SubscriptionBundle.js';
import type { BillingCycle, SubscriptionTier } from '../domain/SubscriptionBundle.js';
import type { SubscriptionBundleRepository } from '../repositories/SubscriptionBundleRepository.js';

export class SubscriptionService {
  constructor(private readonly subscriptions: SubscriptionBundleRepository) {}

  async create(input: {
    userId: string;
    tier: SubscriptionTier;
    billingCycle: BillingCycle;
    autoRenew: boolean;
  }): Promise<SubscriptionBundle> {
    const bundle = SubscriptionBundle.create(input);
    await this.subscriptions.save(bundle);
    return bundle;
  }

  async listByUser(userId: string, limit: number): Promise<SubscriptionBundle[]> {
    return this.subscriptions.findByUser(userId, limit);
  }

  async cancel(bundleId: string): Promise<SubscriptionBundle> {
    const bundle = await this.subscriptions.findById(bundleId);
    if (!bundle) {
      throw new AppError('NOT_FOUND', 'Subscription bundle not found', 404, { bundleId });
    }

    bundle.cancel();
    await this.subscriptions.update(bundle);
    return bundle;
  }

  async processRenewals(): Promise<{
    renewed: SubscriptionBundle[];
    failed: SubscriptionBundle[];
  }> {
    const now = new Date();
    const renewable = await this.subscriptions.findRenewable(now);
    const renewed: SubscriptionBundle[] = [];
    const failed: SubscriptionBundle[] = [];

    for (const bundle of renewable) {
      if (this.paymentFails()) {
        bundle.markInactive(now);
        failed.push(bundle);
      } else {
        bundle.renew(now);
        renewed.push(bundle);
      }
      await this.subscriptions.update(bundle);
    }

    return { renewed, failed };
  }

  private paymentFails(): boolean {
    return Math.random() < config.paymentFailureRate;
  }
}
