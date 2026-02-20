import type { Order } from "@/generated/prisma/client.js";
import type { Repository } from "@/repositories/RepositoryBase.js";
import { PaymentProcessorService } from "@/services/payment/payment-processor.js";
import type {
  IPaymentGateway,
  PaymentRequest,
} from "@/services/payment/payment-processor.js";

// Mock QueueManager getInstance to prevent real queue operations
jest.mock("@/libs/bullmq.js");

import QueueManager from "@/libs/bullmq.js";

describe("PaymentProcessorService", () => {
  let paymentProcessor: PaymentProcessorService;
  let mockPaymentGateway: jest.Mocked<IPaymentGateway>;
  let mockOrderRepository: jest.Mocked<Repository<Order>>;
  const cardToken =
    "eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..WdyhvBpisspzKELw6OwSJg.l-H_fzvqRfe_eCLg7Phco6TakXFw2YfifHpzUILjYKHBBMY959UAYjw5q-nSTlYqGtPJyJBaQthWTziu-8jEettjzo1TfthZN3IuG93M2wQR9_l_t_18eRUaOV-8pFGw35jf0tWdhaBQburn45j5EDPw1r7m5vFtz31ISi1bJVs.bynQ5TAxcWoWQaIsgfkIbQ";

  beforeEach(() => {
    // Setup QueueManager mock
    (QueueManager.getInstance as jest.Mock) = jest.fn(() => ({
      addJob: jest.fn().mockResolvedValue({}),
    }));

    mockPaymentGateway = {
      processPayment: jest.fn(),
      tokenizeCard: jest.fn().mockResolvedValue(cardToken),
    };

    mockOrderRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    paymentProcessor = new PaymentProcessorService(
      mockPaymentGateway,
      mockOrderRepository,
    );
  });

  describe("processPayment", () => {
    it("should process payment successfully and return PAID status", async () => {
      const paymentRequest: PaymentRequest = {
        orderId: "order-123",
        amount: 99.99,
        customerEmail: "john@example.com",
        customerName: "John Doe",
        cardToken,
      };

      const mockPaymentResponse = {
        paymentId: "pay-123",
        gatewayId: "gw-001",
        status: "PAID" as const,
        message: "Payment successful",
      };

      const mockOrder = {
        id: "order-123",
        paymentStatus: "PAID",
        customerId: "",
        customerEmail: "john@example.com",
        customerName: "John Doe",
        productId: "prod-1",
        price: 99.99,
        paymentType: "CREDIT_CARD",
        paymentId: "pay-123",
        gatewayId: "gw-001",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPaymentGateway.processPayment.mockResolvedValue(mockPaymentResponse);
      mockOrderRepository.update = jest.fn().mockResolvedValue(mockOrder);

      const result = await paymentProcessor.execute(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.payment.status).toBe("PAID");
      expect(mockPaymentGateway.processPayment).toHaveBeenCalledWith(
        paymentRequest,
      );
    });

    it("should process payment and return DENIED status", async () => {
      const paymentRequest: PaymentRequest = {
        orderId: "order-456",
        amount: 100,
        customerEmail: "jane@example.com",
        customerName: "Jane Doe",
        cardToken,
      };

      const mockPaymentResponse = {
        paymentId: "pay-456",
        gatewayId: "gw-001",
        status: "DENIED" as const,
        message: "Payment declined",
        denialReason: "Insufficient funds",
      };

      const mockOrder = {
        id: "order-456",
        paymentStatus: "DENIED",
        customerId: "",
        customerEmail: "jane@example.com",
        customerName: "Jane Doe",
        productId: "prod-2",
        price: 100,
        paymentType: "CREDIT_CARD",
        paymentId: "pay-456",
        gatewayId: "gw-001",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPaymentGateway.processPayment.mockResolvedValue(mockPaymentResponse);
      mockOrderRepository.update = jest.fn().mockResolvedValue(mockOrder);

      const result = await paymentProcessor.execute(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.payment.status).toBe("DENIED");
      expect(result.payment.denialReason).toBe("Insufficient funds");
    });

    it("should throw error when payment gateway fails", async () => {
      const paymentRequest: PaymentRequest = {
        orderId: "order-789",
        amount: 50,
        customerEmail: "error@example.com",
        customerName: "Error User",
        cardToken,
      };

      const error = new Error("Gateway connection failed");
      mockPaymentGateway.processPayment.mockRejectedValue(error);

      await expect(paymentProcessor.execute(paymentRequest)).rejects.toThrow(
        "Gateway connection failed",
      );
    });
  });
});
