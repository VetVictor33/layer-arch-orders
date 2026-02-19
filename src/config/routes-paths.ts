/**
 * Centralized route paths constants
 * Use these constants instead of hardcoded strings throughout the application
 */

export const ROUTES = {
  // Health check
  HEALTH: {
    ROOT: "/",
  },

  // Order routes
  ORDER: {
    CREATE: "/order",
    GET_PAYMENT_STATUS: "/order/:id/payment-status",
  },

  PAYMENT: {
    CARD_TOKENIZATION: "/payment/card-token",
  },

  // Bull Board routes (Queue monitoring dashboard)
  BULLBOARD: {
    BASE: "/admin/queues",
  },
} as const;

// Dynamically extract all route path values (strings) from the ROUTES object
// This works recursively, so new routes are automatically included without type changes
type ExtractPaths<T> =
  T extends Record<string, infer U>
    ? U extends string
      ? U
      : U extends Record<string, any>
        ? ExtractPaths<U>
        : never
    : never;

export type RoutePath = ExtractPaths<typeof ROUTES>;
