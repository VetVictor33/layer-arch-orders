import { EmailService } from "@/services/email.js";
import type { IEmailProvider } from "@/services/email.js";
import { ConsoleEmailProvider } from "@/libs/__mocks__/email-provider.js";

/**
 * Factory function to create EmailService with dependencies
 * Centralizes dependency management - change defaults here when dependencies change
 */
export function createEmailService(
  provider: IEmailProvider = new ConsoleEmailProvider(),
): EmailService {
  return new EmailService(provider);
}
