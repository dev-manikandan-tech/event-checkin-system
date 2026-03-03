import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FirebaseAdminDatabaseProvider } from "@/services/database/FirebaseAdminDatabaseProvider";

const dbProvider = new FirebaseAdminDatabaseProvider(adminDb);

/**
 * GET /api/admin/dashboard — Fetch dashboard stats using admin SDK.
 *
 * Query params:
 *   - eventId (optional): filter stats by a specific event
 *
 * Returns:
 *   - totalRegistered / totalCheckedIn for the current filter
 *   - pastEvents: per-event breakdown of registrations and check-ins
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventIdFilter = searchParams.get("eventId") || "";

    // Fetch all events
    const events = await dbProvider.listEvents();

    // Build per-event stats
    const pastEvents = [];

    let totalRegistered = 0;
    let totalCheckedIn = 0;

    for (const event of events) {
      const registrations = await dbProvider.listRegistrations(event.id);
      const registered = registrations.length;
      const checkedIn = registrations.filter(
        (r) => r.status === "checked_in"
      ).length;

      pastEvents.push({
        eventId: event.id,
        eventName: event.name,
        date: event.date.toLocaleDateString(),
        totalRegistered: registered,
        totalCheckedIn: checkedIn,
      });

      // Aggregate totals (filtered or all)
      if (!eventIdFilter || event.id === eventIdFilter) {
        totalRegistered += registered;
        totalCheckedIn += checkedIn;
      }
    }

    return NextResponse.json({
      totalRegistered,
      totalCheckedIn,
      pastEvents,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
