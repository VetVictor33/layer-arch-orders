import QueueManager from "@/libs/bullmq.js";
import { QueueName } from "@/libs/queues.js";
import { LOGGER } from "@/libs/logger.js";

export interface JobFailureContext {
  jobId: string;
  attemptsMade: number;
  maxAttempts: number;
  sourceQueue: string;
  orderId: string;
  error: string;
}

/**
 * Handles moving failed jobs to Dead Letter Queue
 * Isolated responsibility for DLQ management
 */
export class DLQHandler {
  private queueManager: QueueManager;

  constructor() {
    this.queueManager = QueueManager.getInstance();
  }

  /**
   * Move job to DLQ if max retries exceeded
   * Returns true if moved to DLQ, false if retries remain
   */
  async handleJobFailure(context: JobFailureContext): Promise<boolean> {
    const isMaxRetriesExceeded = context.attemptsMade >= context.maxAttempts;

    if (isMaxRetriesExceeded) {
      await this.moveJobToDLQ(context);
      return true;
    }

    return false;
  }

  /**
   * Move a failed job to Dead Letter Queue
   * Only called after max retries exceeded
   */
  private async moveJobToDLQ(context: JobFailureContext): Promise<void> {
    try {
      await this.queueManager.moveJobToDLQ(
        context.sourceQueue as any,
        context.jobId,
        QueueName.PAYMENT_PROCESSING_DLQ,
        context.error,
      );

      LOGGER.warn(
        {
          jobId: context.jobId,
          orderId: context.orderId,
          sourceQueue: context.sourceQueue,
          error: context.error,
        },
        "Job moved to Dead Letter Queue - requires manual intervention",
      );
    } catch (dlqError) {
      LOGGER.error(
        { jobId: context.jobId, orderId: context.orderId, dlqError },
        "Failed to move job to DLQ",
      );
    }
  }
}
