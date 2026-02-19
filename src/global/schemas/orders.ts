import { z } from "zod";

export const OrderSchema = z.object({
  product: z.object({
    id: z
      .string()
      .min(1, "Product ID is required")
      .max(256, "Product ID must not exceed 256 characters"),
    price: z
      .number("Product price must be a valid number")
      .positive("Product price must be a positive number"),
  }),
  customer: z.object({
    name: z
      .string()
      .min(1, "Customer name is required")
      .max(256, "Customer name must not exceed 256 characters"),
    email: z
      .email("Invalid email format")
      .max(256, "Email must not exceed 256 characters"),
  }),
  cardToken: z.string().min(1).max(1024),
});

export type OrderInput = z.infer<typeof OrderSchema>;
