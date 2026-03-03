import { Attendee, PastEvent } from "@/types/attendee";

export interface IDatabaseProvider {
  /**
   * Save a new attendee record.
   */
  saveAttendee(attendee: Omit<Attendee, "id">): Promise<Attendee>;

  /**
   * Retrieve an attendee by their email address and event ID.
   */
  getAttendeeByEmail(email: string, eventId: string): Promise<Attendee | null>;

  /**
   * Update the check-in status for an attendee.
   */
  updateCheckIn(attendeeId: string, checkedIn: boolean): Promise<Attendee>;

  /**
   * Get the past event history for an attendee by their email.
   */
  getPastEventHistory(email: string): Promise<PastEvent[]>;
}
