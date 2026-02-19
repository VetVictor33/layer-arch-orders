import { ROUTES } from "@/config/routes-paths.js";
import { createCardTokenizationService } from "@/factories/card-tokenization-factory.js";
import { CardSchema } from "@/global/schemas/card.js";
import { DateUtils } from "@/utils/date.js";
import type { FastifyInstance } from "fastify";

export const paymentRouters = [
  async (server: FastifyInstance) => {
    server.post(ROUTES.PAYMENT.CARD_TOKENIZATION, async (request, reply) => {
      const parsedBody = CardSchema.parse(request.body);

      const tokenProcessor = createCardTokenizationService();
      const response = await tokenProcessor.execute(parsedBody);

      return reply.code(201).send({
        ...response,
        timestamp: DateUtils.toUtcDate(DateUtils.now()),
      });
    });
  },
];
