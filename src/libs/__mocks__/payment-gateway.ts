import { CardNetworkMock } from "@/libs/__mocks__/card-network-mock.js";
import { JWT, type JWTPayload } from "@/libs/jwt.js";
import type {
  CardData,
  CardTokenizationResponse,
  IPaymentGateway,
  PaymentRequest,
  PaymentResponse,
} from "@/services/payment/payment-processor.js";
import { DateUtils } from "@/utils/date.js";

type CardJWTPayload = JWTPayload & {
  card: CardData;
};

interface PaymentExecutePayload extends Omit<PaymentRequest, "cardToken"> {
  card: CardData;
}

export class PaymentGatewayMock implements IPaymentGateway {
  private gatewayId = "MOCK_GATEWAY_001";

  async processPayment({
    cardToken,
    ...remainingRequestData
  }: PaymentRequest): Promise<PaymentResponse> {
    const { payload } = await this.decryptCardToken(cardToken);
    return this.executePayment({
      ...remainingRequestData,
      card: payload.card,
    });
  }

  async tokenizeCard(cardData: CardData): Promise<CardTokenizationResponse> {
    const jwt = await new JWT().encrypt<CardJWTPayload>({
      data: { card: cardData },
      expiresIn: "5min",
    });
    return { token: jwt };
  }

  private async decryptCardToken(
    tokenizedCard: string,
  ): Promise<{ payload: CardJWTPayload }> {
    return await new JWT().decrypt(tokenizedCard);
  }

  private async executePayment(
    payload: PaymentExecutePayload,
  ): Promise<PaymentResponse> {
    const cardNetwork = new CardNetworkMock();

    const { status, message } = await cardNetwork.pay({
      orderId: payload.orderId,
      card: payload.card,
    });
    const paymentId = this.generatePaymentId();

    return {
      paymentId,
      gatewayId: this.gatewayId,
      status,
      message,
    };
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
