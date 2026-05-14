import { toUsageMonth } from '../../common/date.js';
import { AppError } from '../../common/errors.js';
import { config } from '../../common/config.js';
import { ChatMessage } from '../domain/ChatMessage.js';
import type { ChatMessageRepository } from '../repositories/ChatMessageRepository.js';
import type { MonthlyUsageRepository } from '../repositories/MonthlyUsageRepository.js';
import type { SubscriptionBundleRepository } from '../../subscriptions/repositories/SubscriptionBundleRepository.js';
import type { MockOpenAiService } from './MockOpenAiService.js';

export class ChatService {
  constructor(
    private readonly messages: ChatMessageRepository,
    private readonly monthlyUsage: MonthlyUsageRepository,
    private readonly subscriptions: SubscriptionBundleRepository,
    private readonly openAi: MockOpenAiService,
  ) {}

  async ask(input: { userId: string; question: string }): Promise<ChatMessage> {
    const now = new Date();
    const month = toUsageMonth(now);
    const usage = await this.monthlyUsage.get(input.userId, month);
    let chargedSource: 'free' | 'bundle' = 'free';

    if (usage.usedMessages < config.freeMessagesPerMonth) {
      await this.monthlyUsage.increment(input.userId, month);
    } else {
      const bundle = await this.selectBundle(input.userId, now);
      bundle.consumeOne(now);
      await this.subscriptions.update(bundle);
      chargedSource = 'bundle';
    }

    const aiResponse = await this.openAi.answer(input.question);
    const message = ChatMessage.create({
      userId: input.userId,
      question: input.question,
      answer: aiResponse.answer,
      tokens: aiResponse.tokens,
      chargedSource,
      createdAt: now,
    });

    await this.messages.save(message);
    return message;
  }

  async listMessages(userId: string, limit: number): Promise<ChatMessage[]> {
    return this.messages.findByUser(userId, limit);
  }

  async getMonthlyUsage(userId: string): Promise<{
    userId: string;
    usageMonth: string;
    freeLimit: number;
    usedMessages: number;
    remainingFreeMessages: number;
  }> {
    const usageMonth = toUsageMonth(new Date());
    const usage = await this.monthlyUsage.get(userId, usageMonth);

    return {
      userId,
      usageMonth,
      freeLimit: config.freeMessagesPerMonth,
      usedMessages: usage.usedMessages,
      remainingFreeMessages: Math.max(config.freeMessagesPerMonth - usage.usedMessages, 0),
    };
  }

  private async selectBundle(userId: string, now: Date) {
    const usableBundles = await this.subscriptions.findUsableByUser(userId, now);
    const selected = usableBundles
      .filter((bundle) => bundle.remainingMessages > 0)
      .sort(compareBundlesByRemainingQuota)[0];

    if (!selected) {
      throw new AppError(
        'QUOTA_EXCEEDED',
        'Monthly free quota exceeded and no bundle is available',
        402,
        {
          freeMessagesPerMonth: config.freeMessagesPerMonth,
        },
      );
    }

    return selected;
  }
}

const compareBundlesByRemainingQuota = (
  left: { remainingMessages: number; renewalDate: Date },
  right: { remainingMessages: number; renewalDate: Date },
): number => {
  if (left.remainingMessages === right.remainingMessages) {
    return right.renewalDate.getTime() - left.renewalDate.getTime();
  }
  if (right.remainingMessages === Number.POSITIVE_INFINITY) {
    return 1;
  }
  if (left.remainingMessages === Number.POSITIVE_INFINITY) {
    return -1;
  }

  return right.remainingMessages - left.remainingMessages;
};
