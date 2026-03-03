import { NextRequest, NextResponse } from "next/server";
import { serviceProvider } from "@/services/ServiceProvider";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { attendeeId?: string };

    if (!body.attendeeId) {
      return NextResponse.json(
        { success: false, message: "Missing required field: attendeeId" },
        { status: 400 }
      );
    }

    try {
      const attendee = await serviceProvider.database.updateCheckIn(
        body.attendeeId,
        true
      );

      return NextResponse.json(
        {
          success: true,
          message: "Check-in successful!",
          attendee: {
            id: attendee.id,
            name: attendee.name,
            email: attendee.email,
            checkedIn: attendee.checkedIn,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("already checked in")) {
        return NextResponse.json(
          {
            success: false,
            message: "This attendee has already been checked in.",
          },
          { status: 409 }
        );
      }

      if (errorMessage.includes("not found")) {
        return NextResponse.json(
          { success: false, message: "Attendee not found." },
          { status: 404 }
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json(
      { success: false, message: "An internal error occurred." },
      { status: 500 }
    );
  }
}
