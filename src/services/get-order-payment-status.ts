import Service from "@/services/service.js";
import { OrderRepository } from "@/repositories/OrderRepository.js";
import { AppError } from "@/global/errors/AppError.js";

export default class GetOrderPaymentStatusService extends Service {
  public async execute(orderId: string) {
    const repo = new OrderRepository();
    const order = await repo.findById(orderId);

    if (!order) {
      throw new AppError(404, "Order not found");
    }

    return {
      orderId: order.id,
      paymentStatus: order.paymentStatus,
      paymentId: order.paymentId,
      gatewayId: order.gatewayId,
    };
  }
}
