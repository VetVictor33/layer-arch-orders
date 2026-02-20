import { z } from "zod";

const CARD_STARTS_WITH = ["40", "50"];
const CARD_ENDS_WITH = ["00", "01", "02", "03", "04"];

export const CardSchema = z.object({
  number: z
    .string()
    .regex(/^\d{13,19}$/, "Card number must be between 13 and 19 digits")
    .refine(
      (data) => {
        const valid =
          CARD_STARTS_WITH.includes(data.slice(0, 2)) &&
          CARD_ENDS_WITH.includes(data.slice(-2));
        return valid;
      },
      `Card must start with ${CARD_STARTS_WITH.join(" or ")} and ends with ${CARD_ENDS_WITH.join(" or ")}`,
    ),
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
