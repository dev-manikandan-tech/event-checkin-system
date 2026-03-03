import sgMail from "@sendgrid/mail";
import { IMailProvider, PassEmailOptions } from "@/services/IMailProvider";

export class SendGridMailProvider implements IMailProvider {
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    sgMail.setApiKey(apiKey);
    this.fromEmail = fromEmail;
  }

  async sendPassEmail(options: PassEmailOptions): Promise<void> {
    const msg = {
      to: options.to,
      from: this.fromEmail,
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
    };

    await sgMail.send(msg);
  }
}
