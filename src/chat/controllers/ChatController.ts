import type { Router } from 'express';
import { asyncHandler } from '../../common/http/asyncHandler.js';
import {
  asObject,
  optionalPositiveIntQuery,
  requiredQueryString,
  requiredString,
} from '../../common/http/validation.js';
import type { ChatMessage } from '../domain/ChatMessage.js';
import type { ChatService } from '../services/ChatService.js';

export class ChatController {
  constructor(private readonly chat: ChatService) {}

  register(router: Router): void {
    router.post(
      '/chat/messages',
      asyncHandler(async (req, res) => {
        const input = asObject(req.body);
        const message = await this.chat.ask({
          userId: requiredString(input, 'userId', { maxLength: 128 }),
          question: requiredString(input, 'question', { maxLength: 4000 }),
        });

        res.status(201).json({ data: this.toResponse(message) });
      }),
    );

    router.get(
      '/chat/messages',
      asyncHandler(async (req, res) => {
        const userId = requiredQueryString(req.query.userId, 'userId', { maxLength: 128 });
        const limit = optionalPositiveIntQuery(req.query.limit, 'limit', 50, 100);
        const messages = await this.chat.listMessages(userId, limit);
        res.json({ data: messages.map((message) => this.toResponse(message)) });
      }),
    );

    router.get(
      '/usage/monthly',
      asyncHandler(async (req, res) => {
        const userId = requiredQueryString(req.query.userId, 'userId', { maxLength: 128 });
        res.json({ data: await this.chat.getMonthlyUsage(userId) });
      }),
    );
  }

  private toResponse(message: ChatMessage): Record<string, unknown> {
    return {
      id: message.id,
      userId: message.userId,
      question: message.question,
      answer: message.answer,
      tokens: message.tokens,
      chargedSource: message.chargedSource,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
