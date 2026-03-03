export interface Event {
  id: string;
  name: string;
  date: Date;
  venue: string;
  createdAt: Date;
}

export interface Registration {
  id: string;
  eventId: string;
  email: string;
  name: string;
  status: "pending" | "checked_in" | "cancelled";
  displayId: string;
}

export interface GlobalAttendee {
  email: string;
  name: string;
  trustScore: number;
  eventHistory: EventHistoryEntry[];
}

export interface EventHistoryEntry {
  eventId: string;
  status: string;
  displayId: string;
}
