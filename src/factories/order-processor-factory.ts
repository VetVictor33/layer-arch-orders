import OrderProcessorService from "@/services/order-processor.js";
import { OrderRepository } from "@/repositories/OrderRepository.js";
import QueueManager from "@/libs/bullmq.js";
import { IdempotencyKeyManager } from "@/utils/idempotency/IdempotencyManager.js";

/**
 * Factory function to create OrderProcessorService with dependencies
 * No adapters needed - QueueManager and IdempotencyKeyManager implement interfaces directly
 */
export function createOrderProcessorService(
  orderRepository = new OrderRepository(),
  queueService = QueueManager.getInstance(),
  idempotencyManager: IdempotencyKeyManager = IdempotencyKeyManager.getInstance(),
): OrderProcessorService {
  return new OrderProcessorService(
    orderRepository,
    queueService,
    idempotencyManager,
  );
}
