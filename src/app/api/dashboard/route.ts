import { NextRequest, NextResponse } from "next/server";
import { serviceProvider } from "@/services/ServiceProvider";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Missing query parameter: email" },
        { status: 400 }
      );
    }

    const pastEvents = await serviceProvider.database.getPastEventHistory(email);

    return NextResponse.json({ success: true, pastEvents }, { status: 200 });
  } catch (error) {
    console.error("Dashboard data error:", error);
    return NextResponse.json(
      { success: false, message: "An internal error occurred." },
      { status: 500 }
    );
  }
}
