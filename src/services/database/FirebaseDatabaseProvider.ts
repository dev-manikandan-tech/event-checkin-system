import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  arrayUnion,
} from "firebase/firestore";
import { FirebaseApp } from "firebase/app";
import { Attendee, PastEvent } from "@/types/attendee";
import { IDatabaseProvider } from "@/services/IDatabaseProvider";
import {
  Event,
  Registration,
  GlobalAttendee,
  EventHistoryEntry,
} from "@/types/event";

export class FirebaseDatabaseProvider implements IDatabaseProvider {
  private db;

  constructor(app: FirebaseApp) {
    this.db = getFirestore(app);
  }

  async saveAttendee(attendee: Omit<Attendee, "id">): Promise<Attendee> {
    const docRef = await addDoc(collection(this.db, "attendees"), {
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
    const q = query(
      collection(this.db, "attendees"),
      where("email", "==", email),
      where("eventId", "==", eventId)
    );

    const snapshot = await getDocs(q);

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
    const docRef = doc(this.db, "attendees", attendeeId);

    // Read current state first to detect "already checked in"
    const currentDoc = await getDoc(docRef);

    if (!currentDoc.exists()) {
      throw new Error(`Attendee with ID ${attendeeId} not found`);
    }

    const currentData = currentDoc.data();

    // If already in the desired check-in state, throw a descriptive error
    if (currentData.checkedIn === checkedIn && checkedIn) {
      throw new Error("Attendee already checked in");
    }

    const checkInTime = checkedIn ? Timestamp.fromDate(new Date()) : null;

    await updateDoc(docRef, {
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
    const q = query(
      collection(this.db, "attendees"),
      where("email", "==", email)
    );

    const snapshot = await getDocs(q);

    const events: PastEvent[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const eventDoc = await getDoc(doc(this.db, "events", data.eventId));
      const eventData = eventDoc.exists() ? eventDoc.data() : null;

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
    const docRef = await addDoc(collection(this.db, "events"), {
      name: event.name,
      date: Timestamp.fromDate(event.date),
      venue: event.venue,
      created_at: Timestamp.fromDate(event.createdAt),
    });

    return { id: docRef.id, ...event };
  }

  async listEvents(): Promise<Event[]> {
    const q = query(
      collection(this.db, "events"),
      orderBy("date", "desc")
    );
    const snapshot = await getDocs(q);

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
    const docSnap = await getDoc(doc(this.db, "events", eventId));
    if (!docSnap.exists()) return null;

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
  }

  // ── Registration Management ───────────────────────────────────────

  async batchCreateRegistrations(
    eventId: string,
    rows: { name: string; email: string; displayId: string }[]
  ): Promise<number> {
    // Firestore batch writes are limited to 500 operations.
    // Each row = 1 registration doc + 1 global attendee upsert = 2 ops.
    // We chunk into batches of 250 rows (500 ops) to stay within the limit.
    const CHUNK_SIZE = 250;
    let created = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(this.db);

      for (const row of chunk) {
        // 1. Create registration document
        const regRef = doc(collection(this.db, "registrations"));
        batch.set(regRef, {
          event_id: eventId,
          email: row.email,
          name: row.name,
          status: "pending",
          display_id: row.displayId,
        });

        // 2. Upsert global attendee
        const attendeeRef = doc(this.db, "global_attendees", row.email);
        batch.set(
          attendeeRef,
          {
            email: row.email,
            name: row.name,
            trust_score: 100,
            event_history: arrayUnion({
              event_id: eventId,
              status: "pending",
              display_id: row.displayId,
            }),
          },
          { merge: true }
        );

        created++;
      }

      await batch.commit();
    }

    return created;
  }

  async listRegistrations(eventId: string): Promise<Registration[]> {
    const q = query(
      collection(this.db, "registrations"),
      where("event_id", "==", eventId)
    );
    const snapshot = await getDocs(q);

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
    const attendeeRef = doc(this.db, "global_attendees", email);

    await setDoc(
      attendeeRef,
      {
        email,
        name,
        trust_score: 100,
        event_history: arrayUnion({
          event_id: historyEntry.eventId,
          status: historyEntry.status,
          display_id: historyEntry.displayId,
        }),
      },
      { merge: true }
    );

    const updated = await getDoc(attendeeRef);
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
