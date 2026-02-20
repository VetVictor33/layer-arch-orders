import OrderProcessorService from "@/services/order/order-processor.js";
import { OrderRepository } from "@/repositories/OrderRepository.js";
import QueueManager from "@/libs/bullmq.js";
import { IdempotencyKeyManager } from "@/global/utils/idempotency/IdempotencyManager.js";

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
