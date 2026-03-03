import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * POST /api/checkin — Check in an attendee by registration ID.
 *
 * The QR code encodes the registration document ID from the "registrations"
 * collection. This route looks up that document, verifies it exists and
 * hasn't already been checked in, then updates its status to "checked_in".
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { attendeeId?: string };

    if (!body.attendeeId) {
      return NextResponse.json(
        { success: false, message: "Missing required field: attendeeId" },
        { status: 400 }
      );
    }

    const registrationId = body.attendeeId;

    // Look up in the "registrations" collection
    const regRef = adminDb.collection("registrations").doc(registrationId);
    const regDoc = await regRef.get();

    if (!regDoc.exists) {
      return NextResponse.json(
        { success: false, message: "Registration not found." },
        { status: 404 }
      );
    }

    const regData = regDoc.data()!;

    // Check if already checked in
    if (regData.status === "checked_in") {
      return NextResponse.json(
        {
          success: false,
          message: "This attendee has already been checked in.",
          attendee: {
            id: regDoc.id,
            name: regData.name ?? "",
            email: regData.email,
            checkedIn: true,
          },
        },
        { status: 409 }
      );
    }

    // Update registration status to checked_in
    await regRef.update({
      status: "checked_in",
      checkedInAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Check-in successful!",
        attendee: {
          id: regDoc.id,
          name: regData.name ?? "",
          email: regData.email,
          checkedIn: true,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { success: false, message: "An internal error occurred." },
      { status: 500 }
    );
  }
}
