import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { Timestamp } from "firebase-admin/firestore";

/**
 * POST /api/checkin — Check in an attendee by scanned QR code ID.
 *
 * Supports two registration flows:
 * 1. CSV bulk upload → IDs from the "registrations" collection (status field)
 * 2. Self-registration via /api/register → IDs from the "attendees" collection (checkedIn boolean)
 *
 * The route first tries "registrations", then falls back to "attendees".
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

    const scannedId = body.attendeeId;

    // --- Try "registrations" collection first (CSV upload flow) ---
    const regRef = adminDb.collection("registrations").doc(scannedId);
    const regDoc = await regRef.get();

    if (regDoc.exists) {
      const regData = regDoc.data()!;

      if (regData.status === "checked_in") {
        return NextResponse.json(
          {
            success: false,
            message: "This attendee has already been checked in.",
            attendee: {
              id: regDoc.id,
              name: regData.name ?? "",
              email: regData.email,
              displayId: regData.display_id ?? "",
              checkedIn: true,
            },
          },
          { status: 409 }
        );
      }

      await regRef.update({
        status: "checked_in",
        checkedInAt: Timestamp.fromDate(new Date()),
      });

      return NextResponse.json(
        {
          success: true,
          message: "Check-in successful!",
          attendee: {
            id: regDoc.id,
            name: regData.name ?? "",
            email: regData.email,
            displayId: regData.display_id ?? "",
            checkedIn: true,
          },
        },
        { status: 200 }
      );
    }

    // --- Fallback: try "attendees" collection (self-registration flow) ---
    const attRef = adminDb.collection("attendees").doc(scannedId);
    const attDoc = await attRef.get();

    if (attDoc.exists) {
      const attData = attDoc.data()!;

      if (attData.checkedIn) {
        return NextResponse.json(
          {
            success: false,
            message: "This attendee has already been checked in.",
            attendee: {
              id: attDoc.id,
              name: attData.name ?? "",
              email: attData.email,
              checkedIn: true,
            },
          },
          { status: 409 }
        );
      }

      const checkInTime = Timestamp.fromDate(new Date());
      await attRef.update({
        checkedIn: true,
        checkInTime,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Check-in successful!",
          attendee: {
            id: attDoc.id,
            name: attData.name ?? "",
            email: attData.email,
            checkedIn: true,
          },
        },
        { status: 200 }
      );
    }

    // --- Not found in either collection ---
    return NextResponse.json(
      { success: false, message: "Registration not found." },
      { status: 404 }
    );
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { success: false, message: "An internal error occurred." },
      { status: 500 }
    );
  }
}
