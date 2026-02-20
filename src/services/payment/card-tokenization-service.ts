import { LOGGER } from "@/libs/logger.js";
import type { IPaymentGateway } from "@/services/payment/payment-processor.js";
import Service from "@/services/service.js";

export interface CardData {
  number: string;
  holderName: string;
  cvv: string;
  expirationDate: string;
}

export interface CardTokenizationResponse {
  token: string;
}

/**
 * Service responsible for processing payments
 * Handles both successful processing and error propagation
 */
export class CardTokenizationService extends Service {
  constructor(private paymentGateway: IPaymentGateway) {
    super();
  }

  async execute(card: CardData): Promise<CardTokenizationResponse> {
    const { token } = await this.paymentGateway.tokenizeCard(card);

    LOGGER.info(
      { cardHolder: card.holderName, number: card.number.slice(-4) },
      "Card token processed successfully",
    );

    return { token };
  }
}
