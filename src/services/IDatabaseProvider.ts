import { Attendee, PastEvent } from "@/types/attendee";
import {
  Event,
  Registration,
  GlobalAttendee,
  EventHistoryEntry,
} from "@/types/event";

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

  // ── Event Management ──────────────────────────────────────────────

  /**
   * Create a new event.
   */
  createEvent(event: Omit<Event, "id">): Promise<Event>;

  /**
   * List all events, sorted by date (newest first).
   */
  listEvents(): Promise<Event[]>;

  /**
   * Get a single event by ID.
   */
  getEvent(eventId: string): Promise<Event | null>;

  // ── Registration Management ───────────────────────────────────────

  /**
   * Batch-create registrations and upsert global attendees.
   * Returns the number of registrations created.
   */
  batchCreateRegistrations(
    eventId: string,
    rows: { name: string; email: string; displayId: string }[]
  ): Promise<number>;

  /**
   * List registrations for a given event.
   */
  listRegistrations(eventId: string): Promise<Registration[]>;

  // ── Global Attendees ──────────────────────────────────────────────

  /**
   * Get or create a global attendee record by email.
   */
  upsertGlobalAttendee(
    email: string,
    name: string,
    historyEntry: EventHistoryEntry
  ): Promise<GlobalAttendee>;
}
