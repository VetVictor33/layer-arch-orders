import { EmailService } from "@/services/email.js";
import type { IEmailProvider } from "@/services/email.js";

describe("EmailService", () => {
  let emailService: EmailService;
  let mockEmailProvider: jest.Mocked<IEmailProvider>;

  beforeEach(() => {
    mockEmailProvider = {
      send: jest.fn(),
    };

    emailService = new EmailService(mockEmailProvider);
  });

  describe("execute", () => {
    it("should send email successfully", async () => {
      const emailInput = {
        to: "test@example.com",
        subject: "Test Subject",
        body: "Test email body",
      };

      mockEmailProvider.send.mockResolvedValue({
        success: true,
        messageId: "msg-123",
      });

      const result = await emailService.execute(emailInput);

      expect(result).toEqual({
        success: true,
        messageId: "msg-123",
      });
      expect(mockEmailProvider.send).toHaveBeenCalledWith(
        emailInput.to,
        emailInput.subject,
        emailInput.body,
      );
    });

    it("should handle email send failure", async () => {
      const emailInput = {
        to: "test@example.com",
        subject: "Test Subject",
        body: "Test email body",
      };

      mockEmailProvider.send.mockResolvedValue({
        success: false,
        error: "Email service unavailable",
      });

      const result = (await emailService.execute(emailInput)) as {
        success: boolean;
        error?: string;
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email service unavailable");
    });

    it("should throw error when input is invalid", async () => {
      const invalidInput = {
        to: "test@example.com",
        subject: "",
        body: "Test body",
      };

      await expect(emailService.execute(invalidInput)).rejects.toThrow(
        "EmailService error",
      );
      expect(mockEmailProvider.send).not.toHaveBeenCalled();
    });

    it("should throw error when provider fails", async () => {
      const emailInput = {
        to: "test@example.com",
        subject: "Test Subject",
        body: "Test email body",
      };

      mockEmailProvider.send.mockRejectedValue(
        new Error("SMTP connection failed"),
      );

      await expect(emailService.execute(emailInput)).rejects.toThrow(
        "SMTP connection failed",
      );
    });

    it("should handle missing required parameters", async () => {
      const invalidInput = {
        to: "",
        subject: "Test Subject",
        body: "Test body",
      };

      await expect(emailService.execute(invalidInput)).rejects.toThrow(
        "EmailService error",
      );
    });
  });
});
