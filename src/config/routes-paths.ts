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

  // Bull Board routes (Queue monitoring dashboard)
  BULLBOARD: {
    BASE: "/admin/queues",
  },
} as const;

// Type for route paths
export type RoutePath =
  (typeof ROUTES)[keyof typeof ROUTES][keyof (typeof ROUTES)[keyof typeof ROUTES]];
