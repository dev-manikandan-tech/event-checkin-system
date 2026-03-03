import { v4 as uuidv4 } from "uuid";
import { serviceProvider } from "@/services/ServiceProvider";
import { generatePassImage } from "@/services/passGenerator";

/** Minimum number of past registrations with no attendance to trigger blacklist */
const NO_SHOW_THRESHOLD = 2;

export interface RegistrationRequest {
  name: string;
  email: string;
  eventId: string;
  eventName: string;
  eventDate: string;
}

export interface RegistrationResult {
  success: boolean;
  message: string;
  ticketId?: string;
  attendeeId?: string;
  passImageBuffer?: Buffer;
}

/**
 * Check whether a user is blacklisted based on their past event history.
 *
 * A user is blacklisted if they have registered for 2 or more past events
 * and have has_attended (checkedIn) === false for ALL of them.
 */
async function isBlacklisted(email: string): Promise<boolean> {
  const pastEvents = await serviceProvider.database.getPastEventHistory(email);

  if (pastEvents.length < NO_SHOW_THRESHOLD) {
    return false;
  }

  const allNoShows = pastEvents.every((event) => !event.checkedIn);
  return allNoShows;
}

/**
 * Register an attendee for an event.
 *
 * Flow:
 * 1. Check blacklist — if the user has 2+ past registrations with no attendance,
 *    deny the registration.
 * 2. Check for duplicate registration — if already registered for this event, reject.
 * 3. Generate a unique ticket_id (UUID).
 * 4. Save the attendee record.
 * 5. Generate the event pass image.
 * 6. Send the pass email via IMailProvider.
 */
export async function registerAttendee(
  request: RegistrationRequest
): Promise<RegistrationResult> {
  // Step 1: Blacklist check
  const blacklisted = await isBlacklisted(request.email);
  if (blacklisted) {
    return {
      success: false,
      message:
        "Registration denied due to previous no-show history.",
    };
  }

  // Step 2: Check for duplicate registration
  const existing = await serviceProvider.database.getAttendeeByEmail(
    request.email,
    request.eventId
  );
  if (existing) {
    return {
      success: false,
      message: "You are already registered for this event.",
    };
  }

  // Step 3: Generate ticket_id
  const ticketId = uuidv4();

  // Step 4: Save attendee record
  const attendee = await serviceProvider.database.saveAttendee({
    name: request.name,
    email: request.email,
    eventId: request.eventId,
    checkedIn: false,
    checkInTime: null,
    registeredAt: new Date(),
  });

  // Step 5: Generate pass image buffer (to be attached to the email)
  const passImageBuffer = await generatePassImage({
    attendeeName: request.name,
    email: request.email,
    ticketId,
  });

  // Step 6: Send pass email via IMailProvider
  const passUrl = `/pass/${ticketId}`;

  await serviceProvider.mail.sendPassEmail({
    to: request.email,
    attendeeName: request.name,
    eventName: request.eventName,
    eventDate: request.eventDate,
    passUrl,
  });

  return {
    success: true,
    message: "Registration successful! Check your email for the event pass.",
    ticketId,
    attendeeId: attendee.id,
    passImageBuffer,
  };
}
