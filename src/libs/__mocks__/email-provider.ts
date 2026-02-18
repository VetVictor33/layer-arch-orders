import type { IEmailProvider } from "@/services/email.js";

export class ConsoleEmailProvider implements IEmailProvider {
  async send(to: string, subject: string, body: string) {
    const timestamp = new Date().toISOString();

    console.log(`\n${"=".repeat(60)}`);
    console.log(`📧 EMAIL (${timestamp})`);
    console.log(`${"=".repeat(60)}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`${"=".repeat(60)}`);
    console.log(`${body}`);
    console.log(`${"=".repeat(60)}\n`);

    return {
      success: true,
      messageId: `console-${Date.now()}`,
    };
  }
}
