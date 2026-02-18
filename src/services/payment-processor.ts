import type { Job } from "bullmq";
import type {
  PaymentRequest,
  PaymentResponse,
} from "@/services/payment-gateway-mock.js";
import PaymentGatewayMock from "@/services/payment-gateway-mock.js";
import { OrderRepository } from "@/repositories/OrderRepository.js";
import { LOGGER } from "@/libs/logger.js";
import QueueManager from "@/libs/bullmq.js";
import type { EmailJobData } from "@/workers/email.worker.js";
import { EmailTemplateGenerator } from "@/utils/email-templates.js";

export interface PaymentProcessorResult {
  success: boolean;
  payment: PaymentResponse;
}

/**
 * Service responsible for processing payments
 * Handles both successful processing and error propagation
 */
export class PaymentProcessorService {
  private paymentGateway: PaymentGatewayMock;
  private orderRepository: OrderRepository;

  constructor() {
    this.paymentGateway = new PaymentGatewayMock();
    this.orderRepository = new OrderRepository();
  }

  /**
   * Process a payment request
   * Throws error if payment fails (triggers retry mechanism)
   */
  async processPayment(
    paymentRequest: PaymentRequest,
  ): Promise<PaymentProcessorResult> {
    const payment = await this.paymentGateway.processPayment(paymentRequest);

    const order = await this.orderRepository.update(paymentRequest.orderId, {
      paymentStatus: payment.status,
      paymentId: payment.paymentId,
      gatewayId: payment.gatewayId,
    });

    LOGGER.info(
      { orderId: order.id, paymentId: payment.paymentId },
      "Payment processed successfully",
    );

    await this.queueNotificationEmail(order, paymentRequest, payment);

    return { success: true, payment };
  }

  private async queueNotificationEmail(
    order: { id: string },
    paymentRequest: PaymentRequest,
    payment: PaymentResponse,
  ): Promise<void> {
    const queueManager = QueueManager.getInstance();

    let template:
      | ReturnType<typeof EmailTemplateGenerator.generateOrderPaidTemplate>
      | ReturnType<typeof EmailTemplateGenerator.generatePaymentDeniedTemplate>;
    let logMessage: string;

    if (payment.status === "PAID") {
      template = EmailTemplateGenerator.generateOrderPaidTemplate(
        paymentRequest.customerName,
        order.id,
        payment.paymentId,
        paymentRequest.amount,
      );
      logMessage = "Order paid email queued";
    } else if (payment.status === "DENIED") {
      template = EmailTemplateGenerator.generatePaymentDeniedTemplate(
        paymentRequest.customerName,
        order.id,
        paymentRequest.amount,
        payment.denialReason || "Payment declined",
      );
      logMessage = "Payment denied email queued";
    } else {
      LOGGER.warn(
        `No email for order ${order.id} on status ${payment.status}.`,
      );
      return; // No email for other statuses
    }

    await queueManager.addJob<EmailJobData>("email-notifications", {
      customerEmail: paymentRequest.customerEmail,
      template,
    });

    LOGGER.info({ orderId: order.id }, logMessage);
  }
}
