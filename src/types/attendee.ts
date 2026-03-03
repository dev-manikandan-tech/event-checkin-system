export interface Attendee {
  id: string;
  name: string;
  email: string;
  eventId: string;
  checkedIn: boolean;
  checkInTime: Date | null;
  registeredAt: Date;
}

export interface PastEvent {
  eventId: string;
  eventName: string;
  date: Date;
  checkedIn: boolean;
}
