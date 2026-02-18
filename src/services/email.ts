import Service from "@/services/service.js";
import { LOGGER } from "@/libs/logger.js";
import { AppError } from "@/global/errors/AppError.js";

/**
 * Email Provider Interface - Contract for any email service implementation
 */
export interface IEmailProvider {
  send(
    to: string,
    subject: string,
    body: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

type EmailServiceExecuteParams = {
  to: string;
  subject: string;
  body: string;
};

export class EmailService extends Service {
  constructor(private provider: IEmailProvider) {
    super();
  }

  /**
   * Service base class execute method
   */
  public async execute(input: EmailServiceExecuteParams): Promise<unknown> {
    if (!input || typeof input !== "object") {
      throw new AppError(500, "Invalid input");
    }

    const { to, subject, body } = input as {
      to: string;
      subject: string;
      body: string;
    };

    if (!to || !subject || !body) {
      this.throwAndLogEmailError("Insufficient params");
    }

    return this.sendEmail(to, subject, body);
  }

  private async sendEmail(to: string, subject: string, body: string) {
    try {
      LOGGER.debug({ message: "Sending email", to, subject });

      const result = await this.provider.send(to, subject, body);

      if (result.success) {
        LOGGER.info({
          message: "Email sent successfully",
          to,
          messageId: result.messageId,
        });
      } else {
        LOGGER.warn({
          message: "Email failed to send",
          to,
          error: result.error,
        });
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      LOGGER.error({ message: "Error sending email", to, error: message });
      throw error;
    }
  }

  private throwAndLogEmailError(loggerMessage: string) {
    LOGGER.error(loggerMessage);
    throw new AppError(500, "EmailService error");
  }
}
