import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FirebaseAdminDatabaseProvider } from "@/services/database/FirebaseAdminDatabaseProvider";

const dbProvider = new FirebaseAdminDatabaseProvider(adminDb);

/**
 * POST /api/events — Create a new event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, date, venue } = body;

    if (!name || !date || !venue) {
      return NextResponse.json(
        { error: "name, date, and venue are required" },
        { status: 400 }
      );
    }

    const event = await dbProvider.createEvent({
      name,
      date: new Date(date),
      venue,
      createdAt: new Date(),
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events — List all events (newest first)
 */
export async function GET() {
  try {
    const events = await dbProvider.listEvents();
    return NextResponse.json(events);
  } catch (error) {
    console.error("Error listing events:", error);
    return NextResponse.json(
      { error: "Failed to list events" },
      { status: 500 }
    );
  }
}
