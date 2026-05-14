export const toUsageMonth = (date: Date): string => date.toISOString().slice(0, 7);

export const addBillingCycle = (date: Date, billingCycle: 'monthly' | 'yearly'): Date => {
  const next = new Date(date);
  if (billingCycle === 'monthly') {
    next.setUTCMonth(next.getUTCMonth() + 1);
    return next;
  }

  next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next;
};
