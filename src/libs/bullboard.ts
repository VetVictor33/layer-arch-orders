import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import type { FastifyInstance } from "fastify";
import { logger } from "@/libs/logger.js";
import QueueManager from "@/libs/bullmq.js";
import { QueueName } from "@/libs/queues.js";
import { getEnv } from "@/env.js";

/**
 * Bull Board - Queue visualization dashboard
 * Isolated module that handles all Bull Board setup and integration
 */
class BullBoardManager {
  private fastifyAdapter: FastifyAdapter;

  constructor() {
    this.fastifyAdapter = new FastifyAdapter();
    this.fastifyAdapter.setBasePath("/admin/queues");
  }

  /**
   * Create a new instance of BullBoardManager
   */
  static create(): BullBoardManager {
    return new BullBoardManager();
  }

  /**
   * Initialize Bull Board with all queues
   */
  initializeBoard(): void {
    const queueManager = QueueManager.getInstance();

    // Get all queue adapters
    const queueAdapters = [
      new BullMQAdapter(queueManager.getQueue(QueueName.PAYMENT_PROCESSING), {
        readOnlyMode: false,
      }),
      new BullMQAdapter(queueManager.getQueue(QueueName.EMAIL_NOTIFICATIONS), {
        readOnlyMode: false,
      }),
      new BullMQAdapter(
        queueManager.getQueue(QueueName.PAYMENT_PROCESSING_DLQ),
        {
          readOnlyMode: true, // DLQ is read-only (no retry/delete operations)
        },
      ),
    ];

    // Create the board with all queues
    createBullBoard({
      queues: queueAdapters,
      serverAdapter: this.fastifyAdapter,
      options: {
        uiConfig: {
          boardTitle: "Order Processing Queues",
          boardLogo: {
            path: "https://raw.githubusercontent.com/taskforcesh/bullmq/master/packages/ui/src/static/images/logo.svg",
            width: "100px",
            height: "100px",
          },
          miscLinks: [],
          hideRedisDetails: false,
        },
      },
    });

    logger.info("Bull Board initialized successfully");
  }

  /**
   * Register Bull Board routes to Fastify
   */
  registerRoutes(fastify: FastifyInstance): void {
    fastify.register(this.fastifyAdapter.registerPlugin(), {
      prefix: "/admin/queues",
    });

    logger.info(
      `Bull Board routes registered at /admin/queues - Access UI at http://localhost:${getEnv().PORT}/admin/queues`,
    );
  }
}

export const bullBoardManager = BullBoardManager.create();
