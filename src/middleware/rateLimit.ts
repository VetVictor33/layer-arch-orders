import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getRateLimitingManagerInstance } from "@/utils/rate-limiting/RateLimitingManager.js";
import type { RateLimitConfig } from "@/utils/rate-limiting/RateLimitingManager.js";
import { RateLimitExceededError } from "@/global/errors/RateLimitError.js";
import { DateUtils } from "@/utils/date.js";
import { type RoutePath } from "@/config/routes-paths.js";

interface RateLimitOptions {
  config: RateLimitConfig;
  routesToSkip?: Array<RoutePath>;
  identifier?: (request: FastifyRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

const defaultIdentifier = (request: FastifyRequest): string => {
  // Otherwise use X-Forwarded-For if available (for proxies), then fallback to IP
  const forwardedFor = request.headers["x-forwarded-for"];
  if (forwardedFor && typeof forwardedFor === "string") {
    return forwardedFor.split(",")?.[0]?.trim() || request.ip || "unknown";
  }

  return "unknown";
};

const createRateLimitMiddleware = (options: RateLimitOptions) => {
  const {
    config,
    identifier = defaultIdentifier,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    routesToSkip = [],
  } = options;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const shouldSkip = routesToSkip.some((route) => {
      // Extract pathname only (ignore query params, fragments)
      const pathname = new URL(request.url, `http://${request.hostname}`)
        .pathname;

      // Convert route pattern to regex
      // /order/:id/payment-status -> /order/[^/]+/payment-status
      // For base paths like /admin/queues, also match subroutes
      let pattern = `^${route.replace(/:[\w]+/g, "[^/]+")}`;

      // If the route doesn't have dynamic params, allow subroutes
      if (!route.includes(":")) {
        pattern += `(/.*)?`;
      }

      pattern += "$";
      const regex = new RegExp(pattern);

      return regex.test(pathname);
    });

    if (shouldSkip) {
      return;
    }

    const rateLimitManager = await getRateLimitingManagerInstance();
    const userId = identifier(request);

    const rateLimitInfo = await rateLimitManager.checkAndIncrement(
      userId,
      config,
    );

    // Set rate limit headers
    reply.header("X-RateLimit-Limit", config.maxRequests);
    reply.header("X-RateLimit-Remaining", rateLimitInfo.remaining);
    reply.header("X-RateLimit-Reset", rateLimitInfo.resetAt);

    if (rateLimitInfo.isLimited) {
      reply.header("Retry-After", DateUtils.toUtcDate(rateLimitInfo.resetAt));
      throw new RateLimitExceededError(
        rateLimitInfo.resetAt,
        rateLimitInfo.remaining,
      );
    }
  };
};

export const registerRateLimitMiddleware = (
  server: FastifyInstance,
  options: RateLimitOptions,
) => {
  server.addHook("preHandler", createRateLimitMiddleware(options));
};

export const createRouteRateLimitMiddleware = (options: RateLimitOptions) => {
  return createRateLimitMiddleware(options);
};
