import { JWT, type JWTPayload } from "@/libs/jwt.js";
import { LOGGER } from "@/libs/logger.js";
import type {
  CardData,
  CardTokenizationResponse,
  IPaymentGateway,
  PaymentRequest,
  PaymentResponse,
} from "@/services/payment-processor.js";
import { DateUtils } from "@/utils/date.js";

type CardJWTPayload = JWTPayload & {
  payload: CardData;
};

interface PaymentExecutePayload extends Omit<PaymentRequest, "cardToken"> {
  card: CardData;
}

/**
 * Mock Payment Gateway Implementation
 * Simulates payment processing for development/testing
 * Deterministic logic:
 * - Odd price -> PAID
 * - Even price -> DENIED
 * - Zero or negative -> DENIED
 * - Chance to randomly throw error for retry testing
 */
export class PaymentGatewayMock implements IPaymentGateway {
  private gatewayId = "MOCK_GATEWAY_001";

  async processPayment({
    cardToken,
    ...remainingRequestData
  }: PaymentRequest): Promise<PaymentResponse> {
    const { payload } = await this.decryptCardToken(cardToken);
    return this.executePayment({
      ...remainingRequestData,
      card: payload,
    });
  }

  async tokenizeCard(cardData: CardData): Promise<CardTokenizationResponse> {
    const jwt = await new JWT().encrypt<CardJWTPayload>({
      data: { payload: cardData },
      expiresIn: "5min",
    });
    return { token: jwt };
  }

  async decryptCardToken(tokenizedCard: string): Promise<CardJWTPayload> {
    return await new JWT().decrypt(tokenizedCard);
  }

  private async executePayment(
    request: PaymentExecutePayload,
  ): Promise<PaymentResponse> {
    //TODO - Move payment status logic to a Card class that will decide the payment status based on a range o cards

    // Simulate processing delay (random between 1-30 seconds)
    const randomDelay = Math.random() * 30000;
    // 30% of change of no delay
    const noDelay = Math.random() > 0.3;
    // Chance to randomly throw error for testing queue retries
    const shouldFail = Math.random() < 0.2;

    if (noDelay) {
      LOGGER.info(
        `Job for order ${request.orderId} will ${shouldFail ? "" : "not"} fail immediately`,
      );
    } else {
      LOGGER.info(
        `Job for order ${request.orderId} will ${shouldFail ? "" : "not"} fail after ${randomDelay / 1000}s`,
      );
    }

    await this.delay(noDelay ? 0 : randomDelay);

    if (shouldFail) {
      throw new Error(
        `Simulated payment gateway error for order ${request.orderId}. Queue will retry if there are attempts remaining.`,
      );
    }

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
        denialReason: "Card declined",
      };
    }
  }

  /**
   * Generates a mock payment ID (simulates gateway token)
   */
  private generatePaymentId(): string {
    return `PAY_${DateUtils.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility to simulate network delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
