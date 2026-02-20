import { PaymentGatewayMock } from "@/libs/__mocks__/payment-gateway.js";
import { CardTokenizationService } from "@/services/payment/card-tokenization-service.js";

export function createCardTokenizationService() {
  return new CardTokenizationService(new PaymentGatewayMock());
}
