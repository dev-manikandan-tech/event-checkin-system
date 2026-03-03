import FormData from "form-data";
import Mailgun from "mailgun.js";
import { IMailProvider, PassEmailOptions } from "@/services/IMailProvider";

export class MailgunMailProvider implements IMailProvider {
  private mg;
  private domain: string;
  private fromEmail: string;

  constructor(apiKey: string, domain: string, fromEmail: string) {
    const mailgun = new Mailgun(FormData);
    this.mg = mailgun.client({
      username: "api",
      key: apiKey,
    });
    this.domain = domain;
    this.fromEmail = fromEmail;
  }

  async sendPassEmail(options: PassEmailOptions): Promise<void> {
    await this.mg.messages.create(this.domain, {
      from: this.fromEmail,
      to: [options.to],
      subject: `Your Event Pass for ${options.eventName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Event Pass Confirmation</h1>
          <p>Hello ${options.attendeeName},</p>
          <p>Your pass for <strong>${options.eventName}</strong> on <strong>${options.eventDate}</strong> is confirmed.</p>
          <p>
            <a href="${options.passUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 6px;">
              View Your Pass
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">
            Please present this pass at the event entrance for check-in.
          </p>
        </div>
      `,
    });
  }
}
