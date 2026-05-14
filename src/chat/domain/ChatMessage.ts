import { createId } from '../../common/id.js';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type ChargedSource = 'free' | 'bundle';

export class ChatMessage {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly question: string,
    public readonly answer: string,
    public readonly tokens: TokenUsage,
    public readonly chargedSource: ChargedSource,
    public readonly createdAt: Date,
  ) {}

  static create(input: {
    userId: string;
    question: string;
    answer: string;
    tokens: TokenUsage;
    chargedSource: ChargedSource;
    createdAt?: Date;
  }): ChatMessage {
    return new ChatMessage(
      createId(),
      input.userId,
      input.question,
      input.answer,
      input.tokens,
      input.chargedSource,
      input.createdAt ?? new Date(),
    );
  }
}
