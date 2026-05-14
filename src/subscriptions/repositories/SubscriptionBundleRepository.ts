import type { SubscriptionBundle } from '../domain/SubscriptionBundle.js';

export interface SubscriptionBundleRepository {
  save(bundle: SubscriptionBundle): Promise<void>;
  update(bundle: SubscriptionBundle): Promise<void>;
  findById(id: string): Promise<SubscriptionBundle | null>;
  findByUser(userId: string, limit: number): Promise<SubscriptionBundle[]>;
  findUsableByUser(userId: string, now: Date): Promise<SubscriptionBundle[]>;
  findRenewable(now: Date): Promise<SubscriptionBundle[]>;
}
