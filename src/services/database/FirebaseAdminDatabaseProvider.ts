import { Firestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { Attendee, PastEvent } from "@/types/attendee";
import { IDatabaseProvider } from "@/services/IDatabaseProvider";
import {
  Event,
  Registration,
  GlobalAttendee,
  EventHistoryEntry,
} from "@/types/event";

/**
 * Server-side Firebase Admin SDK implementation of IDatabaseProvider.
 * Uses firebase-admin which bypasses Firestore security rules.
 * This should be used in API routes (server-side only).
 */
export class FirebaseAdminDatabaseProvider implements IDatabaseProvider {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async saveAttendee(attendee: Omit<Attendee, "id">): Promise<Attendee> {
    const docRef = await this.db.collection("attendees").add({
      name: attendee.name,
      email: attendee.email,
      eventId: attendee.eventId,
      checkedIn: attendee.checkedIn,
      checkInTime: attendee.checkInTime
        ? Timestamp.fromDate(attendee.checkInTime)
        : null,
      registeredAt: Timestamp.fromDate(attendee.registeredAt),
    });

    return {
      id: docRef.id,
      ...attendee,
    };
  }

  async getAttendeeByEmail(
    email: string,
    eventId: string
  ): Promise<Attendee | null> {
    const snapshot = await this.db
      .collection("attendees")
      .where("email", "==", email)
      .where("eventId", "==", eventId)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();

    return {
      id: docSnap.id,
      name: data.name,
      email: data.email,
      eventId: data.eventId,
      checkedIn: data.checkedIn,
      checkInTime: data.checkInTime
        ? (data.checkInTime as Timestamp).toDate()
        : null,
      registeredAt: (data.registeredAt as Timestamp).toDate(),
    };
  }

  async updateCheckIn(
    attendeeId: string,
    checkedIn: boolean
  ): Promise<Attendee> {
    const docRef = this.db.collection("attendees").doc(attendeeId);
    const currentDoc = await docRef.get();

    if (!currentDoc.exists) {
      throw new Error(`Attendee with ID ${attendeeId} not found`);
    }

    const currentData = currentDoc.data()!;

    if (currentData.checkedIn === checkedIn && checkedIn) {
      throw new Error("Attendee already checked in");
    }

    const checkInTime = checkedIn ? Timestamp.fromDate(new Date()) : null;

    await docRef.update({
      checkedIn,
      checkInTime,
    });

    return {
      id: currentDoc.id,
      name: currentData.name,
      email: currentData.email,
      eventId: currentData.eventId,
      checkedIn,
      checkInTime: checkInTime ? checkInTime.toDate() : null,
      registeredAt: (currentData.registeredAt as Timestamp).toDate(),
    };
  }

  async getPastEventHistory(email: string): Promise<PastEvent[]> {
    const snapshot = await this.db
      .collection("attendees")
      .where("email", "==", email)
      .get();

    const events: PastEvent[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const eventDoc = await this.db
        .collection("events")
        .doc(data.eventId)
        .get();
      const eventData = eventDoc.exists ? eventDoc.data() : null;

      events.push({
        eventId: data.eventId,
        eventName: eventData?.name ?? "Unknown Event",
        date: eventData?.date
          ? (eventData.date as Timestamp).toDate()
          : (data.registeredAt as Timestamp).toDate(),
        checkedIn: data.checkedIn,
      });
    }

    return events;
  }

  // ── Event Management ──────────────────────────────────────────────

  async createEvent(event: Omit<Event, "id">): Promise<Event> {
    const docRef = await this.db.collection("events").add({
      name: event.name,
      date: Timestamp.fromDate(event.date),
      venue: event.venue,
      created_at: Timestamp.fromDate(event.createdAt),
    });

    return { id: docRef.id, ...event };
  }

  async listEvents(): Promise<Event[]> {
    const snapshot = await this.db
      .collection("events")
      .orderBy("date", "desc")
      .get();

    return snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        name: d.name,
        date: (d.date as Timestamp).toDate(),
        venue: d.venue ?? "",
        createdAt: d.created_at
          ? (d.created_at as Timestamp).toDate()
          : new Date(),
      };
    });
  }

  async getEvent(eventId: string): Promise<Event | null> {
    const docSnap = await this.db.collection("events").doc(eventId).get();
    if (!docSnap.exists) return null;

    const d = docSnap.data()!;
    return {
      id: docSnap.id,
      name: d.name,
      date: (d.date as Timestamp).toDate(),
      venue: d.venue ?? "",
      createdAt: d.created_at
        ? (d.created_at as Timestamp).toDate()
        : new Date(),
    };
  }

  // ── Registration Management ───────────────────────────────────────

  async batchCreateRegistrations(
    eventId: string,
    rows: { name: string; email: string; displayId: string }[]
  ): Promise<number> {
    const CHUNK_SIZE = 250;
    let created = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const batch = this.db.batch();

      // Group rows by email to build a single batch.set() per unique email
      const emailGroups = new Map<
        string,
        {
          name: string;
          entries: { event_id: string; status: string; display_id: string }[];
        }
      >();

      for (const row of chunk) {
        // 1. Create registration document (always unique, auto-ID)
        const regRef = this.db.collection("registrations").doc();
        batch.set(regRef, {
          event_id: eventId,
          email: row.email,
          name: row.name,
          status: "pending",
          display_id: row.displayId,
        });

        // 2. Collect event_history entries grouped by email
        const existing = emailGroups.get(row.email);
        const entry = {
          event_id: eventId,
          status: "pending",
          display_id: row.displayId,
        };

        if (existing) {
          existing.entries.push(entry);
        } else {
          emailGroups.set(row.email, {
            name: row.name,
            entries: [entry],
          });
        }

        created++;
      }

      // 3. Write one batch.set() per unique email with all arrayUnion entries
      for (const [email, group] of emailGroups) {
        const attendeeRef = this.db.collection("global_attendees").doc(email);
        batch.set(
          attendeeRef,
          {
            email,
            name: group.name,
            trust_score: 100,
            event_history: FieldValue.arrayUnion(...group.entries),
          },
          { merge: true }
        );
      }

      await batch.commit();
    }

    return created;
  }

  async listRegistrations(eventId: string): Promise<Registration[]> {
    const snapshot = await this.db
      .collection("registrations")
      .where("event_id", "==", eventId)
      .get();

    return snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        eventId: d.event_id,
        email: d.email,
        name: d.name ?? "",
        status: d.status ?? "pending",
        displayId: d.display_id ?? "",
      };
    });
  }

  // ── Global Attendees ──────────────────────────────────────────────

  async upsertGlobalAttendee(
    email: string,
    name: string,
    historyEntry: EventHistoryEntry
  ): Promise<GlobalAttendee> {
    const attendeeRef = this.db.collection("global_attendees").doc(email);

    await attendeeRef.set(
      {
        email,
        name,
        trust_score: 100,
        event_history: FieldValue.arrayUnion({
          event_id: historyEntry.eventId,
          status: historyEntry.status,
          display_id: historyEntry.displayId,
        }),
      },
      { merge: true }
    );

    const updated = await attendeeRef.get();
    const data = updated.data()!;

    return {
      email: data.email,
      name: data.name,
      trustScore: data.trust_score ?? 100,
      eventHistory: (data.event_history ?? []).map(
        (e: { event_id: string; status: string; display_id: string }) => ({
          eventId: e.event_id,
          status: e.status,
          displayId: e.display_id,
        })
      ),
    };
  }
}
