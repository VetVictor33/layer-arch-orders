import { OrderRepository } from "@/repositories/OrderRepository.js";
import Service from "@/services/service.js";
import type { OrderInput } from "@/global/schemas/orders.js";
import PaymentGatewayMock, {
  type PaymentRequest,
} from "@/services/payment-gateway-mock.js";
import QueueManager from "@/libs/bullmq.js";
import { logger } from "@/libs/logger.js";

export default class OrderProcessorService extends Service {
  public async execute(input: OrderInput) {
    const repo = new OrderRepository();

    const order = await repo.create({
      customerEmail: input.customer.email,
      customerName: input.customer.name,
      paymentStatus: "PENDING",
      paymentType: input.payment.type,
      price: input.product.price,
      productId: input.product.id,
    });

    const queueManager = QueueManager.getInstance();

    // TO-DO: critical -> this saves sensitive data to our DB (card data).
    // Implement card tokenization to avoid it
    await queueManager.addJob<PaymentRequest>("payment-processing", {
      orderId: order.id,
      customerName: input.customer.name,
      customerEmail: input.customer.email,
      amount: input.product.price,
      card: input.payment.card,
    });

    logger.info(`Payment for order ${order.id} queued.`);

    return { orderId: order.id, status: order.paymentStatus };
  }
}
