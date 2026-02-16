import type { Job } from "bullmq";
import QueueManager from "@/libs/bullmq.js";
import { QueueName } from "@/libs/queues.js";
import PaymentGatewayMock from "@/services/payment-gateway-mock.js";
import { OrderRepository } from "@/repositories/OrderRepository.js";
import type {
  PaymentRequest,
  PaymentResponse,
} from "@/services/payment-gateway-mock.js";
import { logger } from "@/libs/logger.js";

interface PaymentJobResult {
  success: boolean;
  payment: PaymentResponse;
}

export const registerPaymentWorker = (): void => {
  const queueManager = QueueManager.getInstance();

  queueManager.registerWorker<PaymentRequest, PaymentJobResult>(
    QueueName.PAYMENT_PROCESSING,
    async (
      job: Job<PaymentRequest, PaymentJobResult>,
    ): Promise<PaymentJobResult> => {
      const paymentService = new PaymentGatewayMock();
      const repo = new OrderRepository();

      const payment = await paymentService.processPayment(job.data);

      const order = await repo.update(job.data.orderId, {
        paymentStatus: payment.status,
        paymentId: payment.paymentId,
        gatewayId: payment.gatewayId,
      });

      logger.info(`Payment for order ${order.id} successfully processed.`);

      return { success: true, payment };
    },
  );
};
