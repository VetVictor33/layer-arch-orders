import Service from "@/services/service.js";
import type { OrderInput } from "@/global/schemas/orders.js";
import { LOGGER } from "@/libs/logger.js";
import { orderCreationIdempotencyKeyGenerator } from "@/global/utils/idempotency/idempotency-generator.js";
import type { Order, PaymentStatus } from "@/generated/prisma/client.js";
import { AppError } from "@/global/errors/AppError.js";
import type { EmailJobData } from "@/workers/email.worker.js";
import { EmailTemplateGenerator } from "@/global/utils/email-templates.js";
import type { IRepository } from "@/repositories/RepositoryBase.js";
import type QueueManager from "@/libs/bullmq.js";
import type { IdempotencyKeyManager } from "@/global/utils/idempotency/IdempotencyManager.js";
import type { PaymentRequest } from "@/services/payment/payment-processor.js";

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

  constructor(
    private orderRepository: IRepository<Order>,
    private queueService: QueueManager,
    private idempotencyManager: IdempotencyKeyManager,
  ) {
    super();
  }

  public async execute(input: OrderInput): Promise<ProcessorResponse> {
    this.input = input;
    const idemResponse = await this.handleIdempotency();

    if (idemResponse) {
      return idemResponse;
    }

    const order = await this.orderRepository.create({
      customerEmail: input.customer.email,
      customerName: input.customer.name,
      paymentStatus: "PENDING",
      paymentType: "CARD",
      price: input.product.price,
      productId: input.product.id,
    });

    await this.storeResponseForIdempotency(order);

    // Queue payment processing
    await this.queueService.addJob<PaymentRequest>("payment-processing", {
      orderId: order.id,
      customerName: input.customer.name,
      customerEmail: input.customer.email,
      amount: input.product.price,
      cardToken: input.cardToken,
    });

    LOGGER.info(`Payment for order ${order.id} queued.`);

    // Queue order created email notification
    const emailTemplate = EmailTemplateGenerator.generateOrderCreatedTemplate(
      input.customer.name,
      order.id,
      input.product.id,
      input.product.price,
    );

    await this.queueService.addJob<EmailJobData>("email-notifications", {
      customerEmail: input.customer.email,
      template: emailTemplate,
    });

    LOGGER.info(`Order created email for order ${order.id} queued.`);

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

    const storedRequest =
      await this.idempotencyManager.retrieve<IdempotencyStoreData>(idemKey);

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

  private async storeResponseForIdempotency(order: Order) {
    if (!this.idemKey) {
      LOGGER.fatal("Unexpected lack of idemKey on OrderProcessorService");
      throw new AppError(500, "Internal server error");
    }
    await this.idempotencyManager.store<IdempotencyStoreData>(this.idemKey, {
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
