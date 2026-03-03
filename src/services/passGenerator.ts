import path from "path";
import { createCanvas, loadImage } from "canvas";
import QRCode from "qrcode";

/**
 * Template image dimensions: 1337 x 443
 *
 * Key overlay regions (measured from template):
 * - Name ("D SIVA"):         x: 312, y: 260–309, center ~(404, 284)
 * - "Scan for Venue" label:  x: 986–1125, y: 91–129, center ~(1055, 110)
 * - QR code (white bg):      x: 1029–1185, y: 130–313 (~156x183)
 * - Left stub ticket ID:     x: 0–89, vertical text, center ~(44, 221)
 * - Background color:        rgb(37, 41, 55)
 */

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "src",
  "assets",
  "pass-template.png"
);

// Overlay positions derived from template analysis
const NAME_X = 312;
const NAME_Y = 280;

const SCAN_LABEL_CENTER_X = 1107;
const SCAN_LABEL_Y = 100;

const QR_X = 1029;
const QR_Y = 130;
const QR_WIDTH = 156;
const QR_HEIGHT = 183;

const STUB_CENTER_X = 44;
const STUB_CENTER_Y = 260;

const BG_COLOR = "rgb(37, 41, 55)";

export interface PassGeneratorInput {
  attendeeName: string;
  email: string;
  ticketId: string;
}

/**
 * Generates an attendee pass image as a Buffer.
 *
 * Overlays:
 * 1. Attendee name in the center area where "D SIVA" is located
 * 2. ticket_id vertically on the left-hand ticket stub
 * 3. QR code encoding the ticket_id in the QR area
 * 4. Changes "Scan for Venue" label to "Scan for Ticket, Name, Code"
 */
export async function generatePassImage(
  input: PassGeneratorInput
): Promise<Buffer> {
  const template = await loadImage(TEMPLATE_PATH);
  const width = template.width;
  const height = template.height;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Draw the template as the base layer
  ctx.drawImage(template, 0, 0, width, height);

  // --- Overlay 1: Attendee Name ---
  // Clear the old "D SIVA" text area fully (bounds: 311,257 to 541,319)
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(305, 255, 250, 45);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(input.attendeeName.toUpperCase(), NAME_X, NAME_Y);

  // --- Overlay 2: Ticket ID on left stub (vertical) ---
  // Clear the existing "TNX_280226_212" text on the stub
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 60, 88, 383);

  ctx.save();
  ctx.translate(STUB_CENTER_X, STUB_CENTER_Y);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(input.ticketId, 0, 0);
  ctx.restore();

  // --- Overlay 3: QR Code ---
  // Generate QR code as a data URL, then draw it over the existing QR area
  const qrDataUrl = await QRCode.toDataURL(input.ticketId, {
    width: QR_WIDTH * 2,
    margin: 1,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  const qrImage = await loadImage(qrDataUrl);

  // Clear the existing QR code area with generous padding
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(QR_X - 10, QR_Y - 10, QR_WIDTH + 20, QR_HEIGHT + 20);

  // Draw the new QR code
  ctx.drawImage(qrImage, QR_X, QR_Y, QR_WIDTH, QR_HEIGHT);

  // --- Overlay 4: Change "Scan for Venue" to "Scan for Ticket, Name, Code" ---
  // Clear the old label text
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(970, 85, 200, 50);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 14px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Scan for Ticket,", SCAN_LABEL_CENTER_X, SCAN_LABEL_Y);
  ctx.fillText("Name, Code", SCAN_LABEL_CENTER_X, SCAN_LABEL_Y + 16);

  // Return the image as a PNG buffer
  return canvas.toBuffer("image/png");
}
