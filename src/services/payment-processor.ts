import type { Job } from "bullmq";
import type {
  PaymentRequest,
  PaymentResponse,
} from "@/services/payment-gateway-mock.js";
import PaymentGatewayMock from "@/services/payment-gateway-mock.js";
import { OrderRepository } from "@/repositories/OrderRepository.js";
import { LOGGER } from "@/libs/logger.js";

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

    return { success: true, payment };
  }
}
