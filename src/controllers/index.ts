import { orderRouters } from "@/controllers/order.js";
import { healthRoutes } from "@/controllers/health.js";

export const allRoutes = [healthRoutes, orderRouters];
