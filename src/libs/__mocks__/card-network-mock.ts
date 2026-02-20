import { PaymentStatus } from "@/generated/prisma/enums.js";
import { AppError } from "@/global/errors/AppError.js";
import { LOGGER } from "@/libs/logger.js";
import type { CardData } from "@/services/payment/payment-processor.js";

type CardFinalNumbers = "00" | "01" | "02" | "03" | "04";
type CardInitialNumbers = "40" | "50";
type CardResponseBehaviors = "immediately" | "delayed";

type StatusRulesType = Map<CardFinalNumbers, PaymentStatus>;
type BehaviorRulesMap = Map<CardInitialNumbers, CardResponseBehaviors>;

interface CardNetworkRequest {
  orderId: string;
  card: CardData;
}

interface CardNetworkResponse {
  success: boolean;
  status: PaymentStatus;
  message: string;
}

export class CardNetworkMock {
  private statusRules: Readonly<StatusRulesType>;
  private behaviorRules: Readonly<BehaviorRulesMap>;

  private orderId?: string;

  constructor() {
    const StatusRulesMap: StatusRulesType = new Map();
    StatusRulesMap.set("00", PaymentStatus.ERROR);
    StatusRulesMap.set("01", PaymentStatus.DENIED);
    StatusRulesMap.set("02", PaymentStatus.FAILED);
    StatusRulesMap.set("03", PaymentStatus.CANCELED);
    StatusRulesMap.set("04", PaymentStatus.PAID);
    this.statusRules = StatusRulesMap;

    const BehaviorRulesMap: BehaviorRulesMap = new Map();
    BehaviorRulesMap.set("40", "immediately");
    BehaviorRulesMap.set("50", "delayed");
    this.behaviorRules = BehaviorRulesMap;
  }

  public async pay(request: CardNetworkRequest): Promise<CardNetworkResponse> {
    const { card, orderId } = request;
    this.orderId = orderId;

    const cardEnd = this.getCardEnd(card.number);
    const cardStatus = this.statusRules.get(cardEnd) ?? this.getDefaultStatus();

    const cardStart = this.getCardStart(card.number);
    const behavior =
      this.behaviorRules.get(cardStart) ?? this.getDefaultBehavior();

    LOGGER.info(
      `Order: ${orderId}. Card end in ${cardEnd} will get ${cardStatus} and  and starts with ${cardStart} will be processed ${behavior}`,
    );

    if (behavior === "delayed") {
      const delayInMs = Math.random() * 1000 * 20 + 10;
      LOGGER.info(`Delayed in ${delayInMs / 1000}s`);
      await this.delay(delayInMs);
    }

    this.failRandomly();

    return {
      success: true,
      status: cardStatus,
      message: `Card status ${cardStatus} because card ends with ${cardEnd}. With ${behavior === "delayed" ? "" : "no "}delay.`,
    };
  }

  private getCardEnd(cardNumber: CardData["number"]): CardFinalNumbers {
    return cardNumber.slice(-2) as CardFinalNumbers;
  }

  private getCardStart(cardNumber: CardData["number"]): CardInitialNumbers {
    return cardNumber.slice(0, 2) as CardInitialNumbers;
  }

  private getDefaultStatus(): PaymentStatus {
    return PaymentStatus.ERROR;
  }

  private getDefaultBehavior(): CardResponseBehaviors {
    return "delayed";
  }

  private failRandomly() {
    const shouldFail = Math.random() <= 0.2;

    if (shouldFail) {
      LOGGER.info(`Failing randomly for order ${this.orderId}`);
      throw new AppError(500, "Fail randomly");
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
