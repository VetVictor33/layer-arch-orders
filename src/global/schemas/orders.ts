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
  payment: z.object({
    type: z.enum(["CARD"], {
      message: "Payment type must be CARD",
    }),
    card: z.object({
      number: z
        .string()
        .regex(/^\d{13,19}$/, "Card number must be between 13 and 19 digits"),
      holderName: z
        .string()
        .min(1, "Card holder name is required")
        .max(256, "Card holder name must not exceed 256 characters"),
      cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits"),
      expirationDate: z
        .string()
        .regex(/^\d{2}\/\d{2}$/, "Expiration date must be in MM/YY format"),
    }),
  }),
});

export type OrderInput = z.infer<typeof OrderSchema>;
