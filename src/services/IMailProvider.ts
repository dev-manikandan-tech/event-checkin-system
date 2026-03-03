export interface PassEmailOptions {
  to: string;
  attendeeName: string;
  eventName: string;
  eventDate: string;
  passUrl: string;
}

export interface IMailProvider {
  /**
   * Send an event pass email to an attendee.
   */
  sendPassEmail(options: PassEmailOptions): Promise<void>;
}
