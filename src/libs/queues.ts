/**
 * Queue names for BullMQ job processing
 */
export const QueueName = {
  PAYMENT_PROCESSING: "payment-processing",
  EMAIL_NOTIFICATIONS: "email-notifications",
} as const;

export type QueueNameType = (typeof QueueName)[keyof typeof QueueName];
