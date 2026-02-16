/**
 * Queue names for BullMQ job processing
 */
export const QueueName = {
  PAYMENT_PROCESSING: "payment-processing",
  EMAIL_NOTIFICATIONS: "email-notifications",
  PAYMENT_PROCESSING_DLQ: "payment-processing-dlq",
} as const;

export type QueueNameType = (typeof QueueName)[keyof typeof QueueName];
