import type { timestamp } from "@/global/utils/date.js";

export class RateLimitExceededError extends Error {
  constructor(
    public resetAt: timestamp,
    public remaining: number,
  ) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
  }
}
