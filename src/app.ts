import express from 'express';
import type { Express } from 'express';
import { config } from './common/config.js';
import { errorMiddleware } from './common/http/errorMiddleware.js';
import { securityHeaders } from './common/http/securityMiddleware.js';
import { prisma } from './common/persistence/prisma.js';
import { ChatController } from './chat/controllers/ChatController.js';
import { PrismaChatMessageRepository } from './chat/repositories/PrismaChatMessageRepository.js';
import { PrismaMonthlyUsageRepository } from './chat/repositories/PrismaMonthlyUsageRepository.js';
import { ChatService } from './chat/services/ChatService.js';
import { MockOpenAiService } from './chat/services/MockOpenAiService.js';
import { SubscriptionController } from './subscriptions/controllers/SubscriptionController.js';
import { PrismaSubscriptionBundleRepository } from './subscriptions/repositories/PrismaSubscriptionBundleRepository.js';
import { SubscriptionService } from './subscriptions/services/SubscriptionService.js';

export const buildApp = (): Express => {
  const app = express();
  const router = express.Router();

  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(express.json({ limit: '32kb' }));

  const subscriptionRepository = new PrismaSubscriptionBundleRepository(prisma);
  const subscriptionService = new SubscriptionService(subscriptionRepository);
  new SubscriptionController(subscriptionService).register(router);

  const chatService = new ChatService(
    new PrismaChatMessageRepository(prisma),
    new PrismaMonthlyUsageRepository(prisma),
    subscriptionRepository,
    new MockOpenAiService(),
  );
  new ChatController(chatService).register(router);

  app.use(router);
  app.use(errorMiddleware);

  return app;
};

export const startServer = (): void => {
  const app = buildApp();

  app.listen(config.port, () => {
    console.log(`Server listening on http://localhost:${config.port}`);
  });
};
