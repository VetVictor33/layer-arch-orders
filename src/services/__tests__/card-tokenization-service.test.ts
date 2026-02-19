import { CardTokenizationService } from "@/services/payment/card-tokenization-service.js";
import type { IPaymentGateway } from "@/services/payment-processor.js";
import { LOGGER } from "@/libs/logger.js";

describe("CardTokenizationService", () => {
  let service: CardTokenizationService;
  let mockPaymentGateway: jest.Mocked<IPaymentGateway>;

  beforeEach(() => {
    mockPaymentGateway = {
      tokenizeCard: jest.fn(),
      processPayment: jest.fn(),
    } as any;

    service = new CardTokenizationService(mockPaymentGateway);
  });

  it("returns token and logs info on success", async () => {
    const card = {
      number: "4111111111111111",
      holderName: "Alice",
      cvv: "123",
      expirationDate: "12/28",
    };

    const token = "tok_abc123";
    mockPaymentGateway.tokenizeCard.mockResolvedValue({ token });

    const infoSpy = jest
      .spyOn(LOGGER, "info")
      .mockImplementation(() => ({}) as any);

    const result = await service.execute(card);

    expect(result).toEqual({ token });
    expect(mockPaymentGateway.tokenizeCard).toHaveBeenCalledWith(card);
    expect(infoSpy).toHaveBeenCalledWith(
      { cardHolder: card.holderName, number: card.number.slice(-4) },
      "Card token processed successfully",
    );

    infoSpy.mockRestore();
  });

  it("propagates errors from the gateway", async () => {
    const card = {
      number: "4000000000000002",
      holderName: "Bob",
      cvv: "321",
      expirationDate: "01/30",
    };

    const err = new Error("Tokenization failed");
    mockPaymentGateway.tokenizeCard.mockRejectedValue(err);

    await expect(service.execute(card)).rejects.toThrow("Tokenization failed");
  });
});
