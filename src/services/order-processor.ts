import { OrderRepository } from "@/repositories/OrderRepository.js";
import Service from "@/services/service.js";
import type { OrderInput } from "@/global/schemas/orders.js";
import { type PaymentRequest } from "@/services/payment-gateway-mock.js";
import QueueManager from "@/libs/bullmq.js";
import { LOGGER } from "@/libs/logger.js";
import { orderCreationIdempotencyKeyGenerator } from "@/utils/idempotency/idempotency-generator.js";
import { getIdempotencyKeyManagerInstance } from "@/utils/idempotency/IdempotencyManager.js";
import type { Order, PaymentStatus } from "@/generated/prisma/client.js";
import { AppError } from "@/global/errors/AppError.js";

type IdempotencyStoreData = {
  orderId: string;
  orderStatus: PaymentStatus;
};

interface ProcessorResponse {
  orderId: string;
  paymentStatus: string;
  message?: string | undefined;
  statusCode?: number | undefined;
}

export default class OrderProcessorService extends Service {
  private input?: OrderInput;
  private idemKey?: string;

  public async execute(input: OrderInput): Promise<ProcessorResponse> {
    this.input = input;
    const idemResponse = await this.handleIdempotency();

    if (idemResponse) {
      return idemResponse;
    }

    const repo = new OrderRepository();

    const order = await repo.create({
      customerEmail: input.customer.email,
      customerName: input.customer.name,
      paymentStatus: "PENDING",
      paymentType: input.payment.type,
      price: input.product.price,
      productId: input.product.id,
    });

    await this.storeResponseFormIdempotency(order);

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

    LOGGER.info(`Payment for order ${order.id} queued.`);

    return this.buildResponde({ order });
  }

  private async handleIdempotency() {
    if (!this.input) {
      LOGGER.fatal("Unexpected lack of input on OrderProcessorService");
      throw new AppError(500, "Internal error");
    }

    const idemKey = orderCreationIdempotencyKeyGenerator({
      customerEmail: this.input.customer.email,
      customerName: this.input.customer.name,
      productId: this.input.product.id,
      productPrice: this.input.product.price,
    });

    const idemManager = await getIdempotencyKeyManagerInstance();

    const storedRequest =
      await idemManager.retrieve<IdempotencyStoreData>(idemKey);

    if (storedRequest) {
      LOGGER.info(`Idempotency hit for order ${storedRequest.data.orderId}`);
      return this.buildResponde({
        order: {
          id: storedRequest.data.orderId,
          paymentStatus: storedRequest.data.orderStatus,
        } as Order,
        message: "Request already processed",
        statusCode: 200,
      });
    }

    this.idemKey = idemKey;
  }

  private async storeResponseFormIdempotency(order: Order) {
    if (!this.idemKey) {
      LOGGER.fatal("Unexpected lack of idemKey on OrderProcessorService");
      throw new AppError(500, "Internal server error");
    }
    const idemManager = await getIdempotencyKeyManagerInstance();
    await idemManager.store<IdempotencyStoreData>(this.idemKey, {
      orderId: order.id,
      orderStatus: order.paymentStatus,
    });
  }

  private buildResponde({
    order,
    message,
    statusCode,
  }: {
    order: Order;
    message?: string;
    statusCode?: number;
  }): ProcessorResponse {
    return {
      orderId: order.id,
      paymentStatus: order.paymentStatus,
      message,
      statusCode,
    };
  }
}
