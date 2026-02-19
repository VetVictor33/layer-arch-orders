import type { Job } from "bullmq";
import QueueManager from "@/libs/bullmq.js";
import { QueueName } from "@/libs/queues.js";
import { LOGGER } from "@/libs/logger.js";
import {
  PaymentProcessorService,
  type PaymentProcessorResult,
  type PaymentRequest,
} from "@/services/payment-processor.js";
import { DLQHandler, type JobFailureContext } from "@/workers/dlq-handler.js";
import { createPaymentProcessorService } from "@/factories/PaymentProcessorFactory.js";

/**
 * Registers the main payment processing worker
 * Handles payment processing with retry and DLQ logic
 */
class PaymentWorkerRegistrar {
  private queueManager: QueueManager;
  private paymentProcessor: PaymentProcessorService;
  private dlqHandler: DLQHandler;

  constructor() {
    this.queueManager = QueueManager.getInstance();
    this.paymentProcessor = createPaymentProcessorService();
    this.dlqHandler = new DLQHandler();
  }

  register(): void {
    this.queueManager.registerWorker<PaymentRequest, PaymentProcessorResult>(
      QueueName.PAYMENT_PROCESSING,
      (job) => this.handlePaymentJob(job),
    );
  }

  private async handlePaymentJob(
    job: Job<PaymentRequest, PaymentProcessorResult>,
  ): Promise<PaymentProcessorResult> {
    try {
      return await this.paymentProcessor.execute(job.data);
    } catch (error) {
      await this.handlePaymentError(job, error);
      throw error;
    }
  }

  private async handlePaymentError(
    job: Job<PaymentRequest, PaymentProcessorResult>,
    error: unknown,
  ): Promise<void> {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    const context: JobFailureContext = {
      jobId: job.id as string,
      attemptsMade: job.attemptsMade + 1, // Current attempt count,
      maxAttempts: this.queueManager.getDefaultMaxAttempts(),
      sourceQueue: QueueName.PAYMENT_PROCESSING,
      orderId: job.data.orderId,
      error: errorMessage,
    };

    const movedToDLQ = await this.dlqHandler.handleJobFailure(context);

    if (movedToDLQ) {
      LOGGER.error(
        {
          orderId: job.data.orderId,
          jobId: job.id,
          attempts: job.attemptsMade,
          error: errorMessage,
        },
        "Payment processing failed permanently - moved to DLQ",
      );
    }
  }
}

/**
 * Registers the Dead Letter Queue monitoring worker
 * Monitors and logs jobs that require manual intervention
 */
class DLQWorkerRegistrar {
  private queueManager: QueueManager;

  constructor() {
    this.queueManager = QueueManager.getInstance();
  }

  register(): void {
    this.queueManager.registerWorker<PaymentRequest, void>(
      QueueName.PAYMENT_PROCESSING_DLQ,
      (job) => this.handleDLQJob(job),
    );
  }

  private async handleDLQJob(job: Job<PaymentRequest, void>): Promise<void> {
    LOGGER.warn(
      {
        orderId: job.data.orderId,
        jobId: job.id,
        amount: job.data.amount,
        email: job.data.customerEmail,
      },
      "Dead Letter Queue: Payment job requires manual intervention",
    );
  }
}

/**
 * Orchestrates the registration of all payment-related workers
 */
class PaymentWorkerOrchestrator {
  private paymentWorkerRegistrar: PaymentWorkerRegistrar;
  private dlqWorkerRegistrar: DLQWorkerRegistrar;

  constructor() {
    this.paymentWorkerRegistrar = new PaymentWorkerRegistrar();
    this.dlqWorkerRegistrar = new DLQWorkerRegistrar();
  }

  register(): void {
    this.paymentWorkerRegistrar.register();
    this.dlqWorkerRegistrar.register();
  }
}

/**
 * Public API - registers all payment workers
 */
export const registerPaymentWorker = (): void => {
  new PaymentWorkerOrchestrator().register();
};
