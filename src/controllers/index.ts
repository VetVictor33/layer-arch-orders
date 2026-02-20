import { orderRouters } from "@/controllers/order.js";
import { healthRoutes } from "@/controllers/health.js";
import { paymentRouters } from "@/controllers/payment.js";

export const allRoutes = [healthRoutes, orderRouters, paymentRouters];
