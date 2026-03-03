import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { FirebaseApp } from "firebase/app";
import { Attendee, PastEvent } from "@/types/attendee";
import { IDatabaseProvider } from "@/services/IDatabaseProvider";

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
    const checkInTime = checkedIn ? Timestamp.fromDate(new Date()) : null;

    await updateDoc(docRef, {
      checkedIn,
      checkInTime,
    });

    const updatedDoc = await getDoc(docRef);

    if (!updatedDoc.exists()) {
      throw new Error(`Attendee with ID ${attendeeId} not found`);
    }

    const data = updatedDoc.data();

    return {
      id: updatedDoc.id,
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
}
