import { AppError } from "@/global/errors/AppError.js";
import { OrderSchema } from "@/global/schemas/orders.js";
import { createOrderProcessorService } from "@/factories/order-processor-factory.js";
import GetOrderPaymentStatusService from "@/services/order/get-order-payment-status.js";
import { DateUtils } from "@/utils/date.js";
import { ROUTES } from "@/config/routes-paths.js";
import type { FastifyInstance } from "fastify";

export const orderRouters = [
  async (server: FastifyInstance) => {
    server.post(ROUTES.ORDER.CREATE, async (request, reply) => {
      const parsedBody = OrderSchema.parse(request.body);

      const orderProcessor = createOrderProcessorService();
      const response = await orderProcessor.execute(parsedBody);

      return reply.code(response.statusCode ?? 201).send({
        ...response,
        timestamp: DateUtils.toUtcDate(DateUtils.now()),
      });
    });
  },
  async (server: FastifyInstance) => {
    server.get(ROUTES.ORDER.GET_PAYMENT_STATUS, async (request, reply) => {
      const { id } = request.params as { id: string };

      const response = await new GetOrderPaymentStatusService().execute(id);

      return reply.code(200).send({
        ...response,
        timestamp: DateUtils.toUtcDate(DateUtils.now()),
      });
    });
  },
];
