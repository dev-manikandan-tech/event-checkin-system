import { NextRequest, NextResponse } from "next/server";
import { app } from "@/lib/firebase";
import { FirebaseDatabaseProvider } from "@/services/database/FirebaseDatabaseProvider";

const dbProvider = new FirebaseDatabaseProvider(app);

/**
 * Generate display_id in the format: TNX_${EventDate_DDMMYY}_${Index_Padded}
 */
function generateDisplayId(
  eventDate: Date,
  index: number
): string {
  const dd = String(eventDate.getDate()).padStart(2, "0");
  const mm = String(eventDate.getMonth() + 1).padStart(2, "0");
  const yy = String(eventDate.getFullYear()).slice(-2);
  const paddedIndex = String(index).padStart(4, "0");
  return `TNX_${dd}${mm}${yy}_${paddedIndex}`;
}

/**
 * Parse CSV text into rows of { name, email }
 */
function parseCSV(text: string): { name: string; email: string }[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  // Check if first line is a header
  const firstLine = lines[0].toLowerCase();
  const startIndex =
    firstLine.includes("name") && firstLine.includes("email") ? 1 : 0;

  const rows: { name: string; email: string }[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim());
    if (parts.length >= 2) {
      const name = parts[0];
      const email = parts[1];
      if (name && email && email.includes("@")) {
        rows.push({ name, email: email.toLowerCase() });
      }
    }
  }

  return rows;
}

/**
 * POST /api/events/[eventId]/upload — Upload CSV and batch-create registrations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    // Get event to retrieve event date for display_id generation
    const event = await dbProvider.getEvent(params.eventId);
    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Get existing registrations to determine starting index
    const existingRegs = await dbProvider.listRegistrations(params.eventId);
    let nextIndex = existingRegs.length + 1;

    // Parse the uploaded CSV
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No valid rows found in CSV" },
        { status: 400 }
      );
    }

    // Generate display_ids for each row
    const registrationRows = rows.map((row) => ({
      name: row.name,
      email: row.email,
      displayId: generateDisplayId(event.date, nextIndex++),
    }));

    // Batch write to Firestore
    const created = await dbProvider.batchCreateRegistrations(
      params.eventId,
      registrationRows
    );

    return NextResponse.json({
      message: `Successfully registered ${created} attendees`,
      created,
      registrations: registrationRows.map((r) => ({
        email: r.email,
        name: r.name,
        displayId: r.displayId,
      })),
    });
  } catch (error) {
    console.error("Error processing CSV upload:", error);
    return NextResponse.json(
      { error: "Failed to process CSV upload" },
      { status: 500 }
    );
  }
}
