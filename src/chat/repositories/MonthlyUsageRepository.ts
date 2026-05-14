export interface MonthlyUsage {
  userId: string;
  usageMonth: string;
  usedMessages: number;
}

export interface MonthlyUsageRepository {
  get(userId: string, usageMonth: string): Promise<MonthlyUsage>;
  increment(userId: string, usageMonth: string): Promise<MonthlyUsage>;
}
