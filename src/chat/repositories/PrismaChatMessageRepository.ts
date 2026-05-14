import type { ChatMessage as PrismaChatMessage } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { ChatMessage } from '../domain/ChatMessage.js';
import type { ChargedSource } from '../domain/ChatMessage.js';
import type { ChatMessageRepository } from './ChatMessageRepository.js';

export class PrismaChatMessageRepository implements ChatMessageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(message: ChatMessage): Promise<void> {
    await this.prisma.chatMessage.create({
      data: {
        id: message.id,
        userId: message.userId,
        question: message.question,
        answer: message.answer,
        promptTokens: message.tokens.promptTokens,
        completionTokens: message.tokens.completionTokens,
        totalTokens: message.tokens.totalTokens,
        chargedSource: message.chargedSource,
        createdAt: message.createdAt,
      },
    });
  }

  async findByUser(userId: string, limit: number): Promise<ChatMessage[]> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((row) => this.toEntity(row));
  }

  private toEntity(row: PrismaChatMessage): ChatMessage {
    return new ChatMessage(
      row.id,
      row.userId,
      row.question,
      row.answer,
      {
        promptTokens: row.promptTokens,
        completionTokens: row.completionTokens,
        totalTokens: row.totalTokens,
      },
      row.chargedSource as ChargedSource,
      row.createdAt,
    );
  }
}
