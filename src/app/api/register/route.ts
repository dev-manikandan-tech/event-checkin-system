import { NextRequest, NextResponse } from "next/server";
import {
  registerAttendee,
  RegistrationRequest,
} from "@/services/registrationService";
import { adminDb } from "@/lib/firebaseAdmin";
import { FirebaseAdminDatabaseProvider } from "@/services/database/FirebaseAdminDatabaseProvider";

const dbProvider = new FirebaseAdminDatabaseProvider(adminDb);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RegistrationRequest>;

    // Validate required fields
    if (!body.name || !body.email || !body.eventId || !body.eventName || !body.eventDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing required fields: name, email, eventId, eventName, eventDate",
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email address." },
        { status: 400 }
      );
    }

    const result = await registerAttendee(
      {
        name: body.name,
        email: body.email,
        eventId: body.eventId,
        eventName: body.eventName,
        eventDate: body.eventDate,
      },
      dbProvider
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 403 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, message: "An internal error occurred." },
      { status: 500 }
    );
  }
}
