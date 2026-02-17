import type { timestamp } from "@/utils/date.js";

export class RateLimitExceededError extends Error {
  constructor(
    public resetAt: timestamp,
    public remaining: number,
  ) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
  }
}
