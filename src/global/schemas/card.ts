import { z } from "zod";

export const CardSchema = z.object({
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
});

export type CardInput = z.infer<typeof CardSchema>;
