import { OrderRepository } from "@/repositories/OrderRepository.js";
import Service from "@/services/service.js";
import type { OrderInput } from "@/global/schemas/orders.js";
import PaymentGatewayMock from "@/services/payment-gateway-mock.js";

export default class OrderProcessorService extends Service {
  public async execute(input: OrderInput) {
    const repo = new OrderRepository();

    const creationResponde = await repo.create({
      customerEmail: input.customer.email,
      customerName: input.customer.name,
      paymentStatus: "PENDING",
      paymentType: input.payment.type,
      price: input.product.price,
      productId: input.product.id,
    });

    const paymentService = new PaymentGatewayMock();

    const payment = await paymentService.processPayment({
      orderId: creationResponde.id,
      customerName: input.customer.name,
      customerEmail: input.customer.email,
      amount: input.product.price,
      card: input.payment.card,
    });

    return {
      status: payment.status,
    };
  }
}
