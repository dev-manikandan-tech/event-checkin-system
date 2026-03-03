import { NextRequest, NextResponse } from "next/server";
import { app } from "@/lib/firebase";
import { FirebaseDatabaseProvider } from "@/services/database/FirebaseDatabaseProvider";

const dbProvider = new FirebaseDatabaseProvider(app);

/**
 * GET /api/events/[eventId] — Get event details + registrations
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const event = await dbProvider.getEvent(params.eventId);

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const registrations = await dbProvider.listRegistrations(params.eventId);

    return NextResponse.json({ event, registrations });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Failed to fetch event" },
      { status: 500 }
    );
  }
}
