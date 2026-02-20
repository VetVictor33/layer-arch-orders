import { LOGGER } from "@/libs/logger.js";
import QueueManager from "@/libs/bullmq.js";
import type { EmailJobData } from "@/workers/email.worker.js";
import { EmailTemplateGenerator } from "@/global/utils/email-templates.js";
import type { PaymentStatus } from "@/generated/prisma/enums.js";
import type { Repository } from "@/repositories/RepositoryBase.js";
import type { Order } from "@/generated/prisma/client.js";
import Service from "@/services/service.js";

export interface CardData {
  number: string;
  holderName: string;
  cvv: string;
  expirationDate: string;
}

export interface PaymentRequest {
  orderId: string;
  amount: number;
  customerEmail: string;
  customerName: string;
  cardToken: string;
}

export interface PaymentResponse {
  paymentId: string;
  gatewayId: string;
  status: PaymentStatus;
  message: string;
  denialReason?: string;
}

export interface CardTokenizationResponse {
  token: string;
}

/**
 * Payment Gateway Interface - Contract for payment processing implementations
 */
export interface IPaymentGateway {
  processPayment(request: PaymentRequest): Promise<PaymentResponse>;
  tokenizeCard(cardData: CardData): Promise<CardTokenizationResponse>;
}
export interface PaymentProcessorResult {
  success: boolean;
  payment: PaymentResponse;
}

/**
 * Service responsible for processing payments
 * Handles both successful processing and error propagation
 */
export class PaymentProcessorService extends Service {
  constructor(
    private paymentGateway: IPaymentGateway,
    private orderRepository: Repository<Order>,
  ) {
    super();
  }

  /**
   * Process a payment request
   * Throws error if payment fails (triggers retry mechanism)
   */
  async execute(
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
    } else {
      template = EmailTemplateGenerator.generatePaymentDeniedTemplate(
        paymentRequest.customerName,
        order.id,
        paymentRequest.amount,
        `Status:${payment.status} - ${payment.denialReason || "Payment declined"}`,
      );
      logMessage = "Payment denied email queued";
    }

    await queueManager.addJob<EmailJobData>("email-notifications", {
      customerEmail: paymentRequest.customerEmail,
      template,
    });

    LOGGER.info({ orderId: order.id }, logMessage);
  }
}
