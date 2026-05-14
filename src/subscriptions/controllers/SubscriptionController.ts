import type { Router } from 'express';
import { AppError } from '../../common/errors.js';
import { asyncHandler } from '../../common/http/asyncHandler.js';
import {
  asObject,
  optionalBoolean,
  optionalPositiveIntQuery,
  requiredQueryString,
  requiredString,
  requiredUuidParam,
} from '../../common/http/validation.js';
import type { BillingCycle, SubscriptionTier } from '../domain/SubscriptionBundle.js';
import type { SubscriptionBundle } from '../domain/SubscriptionBundle.js';
import type { SubscriptionService } from '../services/SubscriptionService.js';

const TIERS: SubscriptionTier[] = ['basic', 'pro', 'enterprise'];
const BILLING_CYCLES: BillingCycle[] = ['monthly', 'yearly'];

export class SubscriptionController {
  constructor(private readonly subscriptions: SubscriptionService) {}

  register(router: Router): void {
    router.post(
      '/subscriptions',
      asyncHandler(async (req, res) => {
        const input = asObject(req.body);
        const bundle = await this.subscriptions.create({
          userId: requiredString(input, 'userId', { maxLength: 128 }),
          tier: this.parseTier(requiredString(input, 'tier')),
          billingCycle: this.parseBillingCycle(requiredString(input, 'billingCycle')),
          autoRenew: optionalBoolean(input, 'autoRenew', true),
        });
        res.status(201).json({ data: this.toResponse(bundle) });
      }),
    );

    router.get(
      '/subscriptions',
      asyncHandler(async (req, res) => {
        const userId = requiredQueryString(req.query.userId, 'userId', { maxLength: 128 });
        const limit = optionalPositiveIntQuery(req.query.limit, 'limit', 50, 100);
        const bundles = await this.subscriptions.listByUser(userId, limit);
        res.json({ data: bundles.map((bundle) => this.toResponse(bundle)) });
      }),
    );

    router.patch(
      '/subscriptions/:id/cancel',
      asyncHandler(async (req, res) => {
        const bundle = await this.subscriptions.cancel(requiredUuidParam(req.params.id, 'id'));
        res.json({ data: this.toResponse(bundle) });
      }),
    );

    router.post(
      '/subscriptions/renewals/process',
      asyncHandler(async (_req, res) => {
        const result = await this.subscriptions.processRenewals();
        res.json({
          data: {
            renewed: result.renewed.map((bundle) => this.toResponse(bundle)),
            failed: result.failed.map((bundle) => this.toResponse(bundle)),
          },
        });
      }),
    );
  }

  private parseTier(value: string): SubscriptionTier {
    if (!TIERS.includes(value as SubscriptionTier)) {
      throw new AppError('VALIDATION_ERROR', 'tier must be basic, pro, or enterprise', 400);
    }

    return value as SubscriptionTier;
  }

  private parseBillingCycle(value: string): BillingCycle {
    if (!BILLING_CYCLES.includes(value as BillingCycle)) {
      throw new AppError('VALIDATION_ERROR', 'billingCycle must be monthly or yearly', 400);
    }

    return value as BillingCycle;
  }

  private toResponse(bundle: SubscriptionBundle): Record<string, unknown> {
    return {
      id: bundle.id,
      userId: bundle.userId,
      tier: bundle.tier,
      billingCycle: bundle.billingCycle,
      status: bundle.status,
      autoRenew: bundle.autoRenew,
      maxMessages: bundle.maxMessages,
      usedMessages: bundle.usedMessages,
      remainingMessages:
        bundle.remainingMessages === Number.POSITIVE_INFINITY
          ? 'unlimited'
          : bundle.remainingMessages,
      priceCents: bundle.priceCents,
      startDate: bundle.startDate.toISOString(),
      endDate: bundle.endDate.toISOString(),
      renewalDate: bundle.renewalDate.toISOString(),
    };
  }
}
