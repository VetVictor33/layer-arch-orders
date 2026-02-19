import type { Job } from "bullmq";
import QueueManager from "@/libs/bullmq.js";
import { QueueName } from "@/libs/queues.js";
import { LOGGER } from "@/libs/logger.js";
import { EmailService } from "@/services/email.js";
import type {
  OrderCreatedTemplate,
  OrderPaidTemplate,
  PaymentDeniedTemplate,
} from "@/utils/email-templates.js";
import { createEmailService } from "@/factories/EmailServiceFactory.js";

/**
 * Email job data types
 */
export interface EmailJobData {
  customerEmail: string;
  template: OrderCreatedTemplate | OrderPaidTemplate | PaymentDeniedTemplate;
}

/**
 * Registers the email notification worker
 * Handles sending emails for order events
 */
class EmailWorkerRegistrar {
  private queueManager: QueueManager;
  private emailService: EmailService;

  constructor() {
    this.queueManager = QueueManager.getInstance();
    this.emailService = createEmailService();
  }

  register(): void {
    this.queueManager.registerWorker<EmailJobData, void>(
      QueueName.EMAIL_NOTIFICATIONS,
      (job) => this.handleEmailJob(job),
    );
  }

  private async handleEmailJob(job: Job<EmailJobData, void>): Promise<void> {
    const { customerEmail, template } = job.data;

    try {
      await this.emailService.execute({
        to: customerEmail,
        subject: template.subject,
        body: template.body,
      });

      LOGGER.info(
        {
          jobId: job.id,
          orderId: template.orderId,
          customerEmail,
        },
        "Email sent successfully",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      LOGGER.error(
        {
          jobId: job.id,
          orderId: template.orderId,
          customerEmail,
          error: errorMessage,
        },
        "Email job failed",
      );

      throw error;
    }
  }
}

/**
 * Orchestrates the registration of all email-related workers
 */
class EmailWorkerOrchestrator {
  private emailWorkerRegistrar: EmailWorkerRegistrar;

  constructor() {
    this.emailWorkerRegistrar = new EmailWorkerRegistrar();
  }

  register(): void {
    this.emailWorkerRegistrar.register();
  }
}

/**
 * Public API - registers all email workers
 */
export const registerEmailWorker = (): void => {
  new EmailWorkerOrchestrator().register();
};
