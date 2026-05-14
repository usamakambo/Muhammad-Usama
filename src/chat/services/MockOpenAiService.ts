import type { TokenUsage } from '../domain/ChatMessage.js';
import { config } from '../../common/config.js';

export interface AiResponse {
  answer: string;
  tokens: TokenUsage;
}

export class MockOpenAiService {
  async answer(question: string): Promise<AiResponse> {
    await delay(config.mockOpenAiDelayMs);
    const answer = `Mocked OpenAI response: ${question}`;
    const promptTokens = estimateTokens(question);
    const completionTokens = estimateTokens(answer);

    return {
      answer,
      tokens: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
    };
  }
}

const delay = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const estimateTokens = (text: string): number => Math.max(1, Math.ceil(text.trim().length / 4));
