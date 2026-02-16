import { AppError } from "@/global/errors/AppError.js";
import { OrderSchema } from "@/global/schemas/orders.js";
import OrderProcessorService from "@/services/order-processor.js";
import type { FastifyInstance } from "fastify";

export const orderRouters = [
  async (server: FastifyInstance) => {
    server.post("/order", async (request, reply) => {
      const parsedBody = OrderSchema.parse(request.body);

      const response = await new OrderProcessorService().execute(parsedBody);

      return reply.code(201).send({
        response: response,
        timestamp: new Date().toISOString(),
      });
    });
  },
  async (server: FastifyInstance) => {
    server.get("/order/:id/status", async (request, reply) => {
      throw new AppError(500, "Not implemented");
    });
  },
];
