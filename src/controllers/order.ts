import { AppError } from "@/global/errors/AppError.js";
import { OrderSchema } from "@/global/schemas/orders.js";
import OrderProcessorService from "@/services/order-processor.js";
import GetOrderPaymentStatusService from "@/services/get-order-payment-status.js";
import type { FastifyInstance } from "fastify";

export const orderRouters = [
  async (server: FastifyInstance) => {
    server.post("/order", async (request, reply) => {
      const parsedBody = OrderSchema.parse(request.body);

      const response = await new OrderProcessorService().execute(parsedBody);

      return reply.code(response.statusCode ?? 201).send({
        ...response,
        timestamp: new Date().toISOString(),
      });
    });
  },
  async (server: FastifyInstance) => {
    server.get("/order/:id/payment-status", async (request, reply) => {
      const { id } = request.params as { id: string };

      const response = await new GetOrderPaymentStatusService().execute(id);

      return reply.code(200).send({
        ...response,
        timestamp: new Date().toISOString(),
      });
    });
  },
];
