import {
  PaymentProcessorService,
  type IPaymentGateway,
} from "@/services/payment-processor.js";
import { PaymentGatewayMock } from "@/libs/__mocks__/payment-gateway.js";
import { OrderRepository } from "@/repositories/OrderRepository.js";
import type { Repository } from "@/repositories/RepositoryBase.js";
import type { Order } from "@/generated/prisma/client.js";

/**
 * Factory function to create PaymentProcessorService with dependencies
 * Centralizes dependency management - change defaults here when dependencies change
 */
export function createPaymentProcessorService(
  paymentGateway: IPaymentGateway = new PaymentGatewayMock(),
  orderRepository: Repository<Order> = new OrderRepository(),
): PaymentProcessorService {
  return new PaymentProcessorService(paymentGateway, orderRepository);
}
