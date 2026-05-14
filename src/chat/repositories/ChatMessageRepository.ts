import type { ChatMessage } from '../domain/ChatMessage.js';

export interface ChatMessageRepository {
  save(message: ChatMessage): Promise<void>;
  findByUser(userId: string, limit: number): Promise<ChatMessage[]>;
}
