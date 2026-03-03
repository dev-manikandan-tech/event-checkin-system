"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

type ScanStatus = "idle" | "scanning" | "success" | "warning" | "error";

interface CheckInResponse {
  success: boolean;
  message: string;
  attendee?: {
    id: string;
    name: string;
    email: string;
    checkedIn: boolean;
  };
}

export default function ScanPage() {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState("");
  const [attendeeName, setAttendeeName] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);

  const handleScanSuccess = useCallback(async (decodedText: string) => {
    // Prevent multiple simultaneous scans
    if (processingRef.current) return;
    processingRef.current = true;

    setStatus("scanning");
    setMessage("Processing check-in...");

    try {
      // Stop the scanner while processing
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
        setIsScanning(false);
      }

      const response = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendeeId: decodedText }),
      });

      const data: CheckInResponse = await response.json();

      if (response.ok && data.success) {
        setStatus("success");
        setMessage(data.message);
        setAttendeeName(data.attendee?.name ?? "");
      } else if (response.status === 409 || data.message?.includes("already")) {
        setStatus("warning");
        setMessage(data.message || "Already checked in.");
        setAttendeeName(data.attendee?.name ?? "");
      } else {
        setStatus("error");
        setMessage(data.message || "Check-in failed.");
        setAttendeeName("");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
      setAttendeeName("");
    } finally {
      processingRef.current = false;
    }
  }, []);

  const startScanner = useCallback(async () => {
    setStatus("idle");
    setMessage("");
    setAttendeeName("");

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader");
      }

      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScanSuccess,
        () => {
          // Ignore scan failures (no QR detected yet)
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Scanner start error:", err);
      setStatus("error");
      setMessage(
        "Unable to access camera. Please grant camera permissions and try again."
      );
    }
  }, [handleScanSuccess]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto max-w-lg px-4 py-4">
          <h1 className="text-center text-xl font-bold">Event Check-In</h1>
          <p className="mt-1 text-center text-xs text-gray-400">
            Scan attendee QR code to check in
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-6">
        {/* Scanner Area */}
        <div className="relative mb-6 w-full overflow-hidden rounded-2xl border-2 border-gray-700 bg-black">
          <div id="qr-reader" className="w-full" />
          {!isScanning && status !== "scanning" && (
            <div className="flex h-64 items-center justify-center">
              <p className="text-gray-500">Camera not active</p>
            </div>
          )}
        </div>

        {/* Scan / Reset Button */}
        {!isScanning && status !== "scanning" ? (
          <button
            onClick={startScanner}
            className="mb-6 w-full rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
          >
            {status === "idle" ? "Start Scanning" : "Scan Again"}
          </button>
        ) : status === "scanning" ? (
          <div className="mb-6 flex items-center justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span className="ml-2 text-gray-400">Processing...</span>
          </div>
        ) : null}

        {/* Result Display */}
        {status === "success" && (
          <div className="w-full rounded-xl border border-green-800 bg-green-950 p-6 text-center">
            {/* Green checkmark */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-600">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-1 text-xl font-bold text-green-400">
              Check-In Successful
            </h2>
            {attendeeName && (
              <p className="text-lg text-green-300">{attendeeName}</p>
            )}
            <p className="mt-2 text-sm text-green-400/70">{message}</p>
            <button
              onClick={startScanner}
              className="mt-4 rounded-lg bg-green-700 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
            >
              Scan Next
            </button>
          </div>
        )}

        {status === "warning" && (
          <div className="w-full rounded-xl border border-yellow-800 bg-yellow-950 p-6 text-center">
            {/* Warning icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-600">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M12 3l9.66 16.59A1 1 0 0120.66 21H3.34a1 1 0 01-.86-1.41L12 3z"
                />
              </svg>
            </div>
            <h2 className="mb-1 text-xl font-bold text-yellow-400">
              Already Checked In
            </h2>
            {attendeeName && (
              <p className="text-lg text-yellow-300">{attendeeName}</p>
            )}
            <p className="mt-2 text-sm text-yellow-400/70">{message}</p>
            <button
              onClick={startScanner}
              className="mt-4 rounded-lg bg-yellow-700 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-600"
            >
              Scan Next
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="w-full rounded-xl border border-red-800 bg-red-950 p-6 text-center">
            {/* Error icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-600">
              <svg
                className="h-10 w-10 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mb-1 text-xl font-bold text-red-400">
              Check-In Failed
            </h2>
            <p className="mt-2 text-sm text-red-400/70">{message}</p>
            <button
              onClick={startScanner}
              className="mt-4 rounded-lg bg-red-700 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
            >
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
