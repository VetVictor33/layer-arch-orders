import type { PaymentStatus } from "@/generated/prisma/enums.js";

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
  card: CardData;
}

export interface PaymentResponse {
  paymentId: string;
  gatewayId: string;
  status: PaymentStatus;
  message: string;
}

export default class PaymentGatewayMock {
  private gatewayId = "MOCK_GATEWAY_001";

  /**
   * Simulates a payment processing request
   * Deterministic logic:
   * - Odd price -> PAID
   * - Even price -> DENIED
   * - Zero or negative -> ERROR
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Simulate processing delay
    await this.delay(100);

    const paymentId = this.generatePaymentId();

    // Deterministic logic based on price
    if (request.amount <= 0) {
      return {
        paymentId,
        gatewayId: this.gatewayId,
        status: "DENIED",
        message: `Invalid amount: ${request.amount}. Price must be positive.`,
      };
    }

    const isOdd = request.amount % 2 !== 0;

    if (isOdd) {
      return {
        paymentId,
        gatewayId: this.gatewayId,
        status: "PAID",
        message: `Payment processed successfully for order ${request.orderId}`,
      };
    } else {
      return {
        paymentId,
        gatewayId: this.gatewayId,
        status: "DENIED",
        message: `Payment denied for order ${request.orderId}`,
      };
    }
  }

  /**
   * Generates a mock payment ID (simulates gateway token)
   */
  private generatePaymentId(): string {
    return `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility to simulate network delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
