import OrderProcessorService from "@/services/order-processor.js";
import type { OrderInput } from "@/global/schemas/orders.js";

// Mock QueueManager to prevent real queue operations
jest.mock("@/libs/bullmq.js");

// Mock types for testing
interface IOrderRepository {
  create: jest.Mock;
  findById: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  disconnect: jest.Mock;
}

interface IQueueService {
  addJob: jest.Mock;
}

interface IIdempotencyManager {
  retrieve: jest.Mock;
  store: jest.Mock;
}

describe("OrderProcessorService", () => {
  let orderProcessor: OrderProcessorService;
  let mockOrderRepository: jest.Mocked<IOrderRepository>;
  let mockQueueService: jest.Mocked<IQueueService>;
  let mockIdempotencyManager: jest.Mocked<IIdempotencyManager>;

  beforeEach(() => {
    mockOrderRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    mockQueueService = {
      addJob: jest.fn(),
    } as any;

    mockIdempotencyManager = {
      retrieve: jest.fn(),
      store: jest.fn(),
    } as any;

    orderProcessor = new OrderProcessorService(
      mockOrderRepository as any,
      mockQueueService as any,
      mockIdempotencyManager as any,
    );
  });

  describe("execute", () => {
    it("should create order and queue jobs when idempotency check passes", async () => {
      const orderInput: OrderInput = {
        customer: { name: "John Doe", email: "john@example.com" },
        product: { id: "prod-1", price: 99.99 },
        payment: {
          type: "CARD",
          card: {
            number: "4111111111111111",
            holderName: "John Doe",
            cvv: "123",
            expirationDate: "12/25",
          },
        },
      };

      const mockOrder = {
        id: "order-123",
        paymentStatus: "PENDING",
        customerId: "",
        customerEmail: "john@example.com",
        customerName: "John Doe",
        productId: "prod-1",
        price: 99.99,
        paymentType: "CREDIT_CARD",
        paymentId: null,
        gatewayId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockIdempotencyManager.retrieve.mockResolvedValue(null);
      mockOrderRepository.create.mockResolvedValue(mockOrder);

      const response = await orderProcessor.execute(orderInput);

      expect(response.orderId).toBe("order-123");
      expect(response.paymentStatus).toBe("PENDING");
      expect(mockOrderRepository.create).toHaveBeenCalledWith({
        customerEmail: orderInput.customer.email,
        customerName: orderInput.customer.name,
        paymentStatus: "PENDING",
        paymentType: orderInput.payment.type,
        price: orderInput.product.price,
        productId: orderInput.product.id,
      });
      expect(mockQueueService.addJob).toHaveBeenCalledTimes(2);
    });

    it("should return cached response on idempotency hit", async () => {
      const orderInput: OrderInput = {
        customer: { name: "Jane Doe", email: "jane@example.com" },
        product: { id: "prod-2", price: 149.99 },
        payment: {
          type: "CARD",
          card: {
            number: "4111111111111111",
            holderName: "Jane Doe",
            cvv: "456",
            expirationDate: "11/26",
          },
        },
      };

      mockIdempotencyManager.retrieve.mockResolvedValue({
        data: {
          orderId: "order-456",
          orderStatus: "PENDING",
        },
      });

      const response = await orderProcessor.execute(orderInput);

      expect(response.orderId).toBe("order-456");
      expect(response.statusCode).toBe(200);
      expect(response.message).toBe("Request already processed");
      expect(mockOrderRepository.create).not.toHaveBeenCalled();
    });
  });
});
