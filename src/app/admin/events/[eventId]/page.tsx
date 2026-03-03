"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface EventData {
  id: string;
  name: string;
  date: string;
  venue: string;
}

interface RegistrationData {
  id: string;
  eventId: string;
  email: string;
  name: string;
  status: string;
  displayId: string;
}

interface UploadResult {
  message: string;
  created: number;
  registrations: { email: string; name: string; displayId: string }[];
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [event, setEvent] = useState<EventData | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const fetchEventData = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data.event);
        setRegistrations(data.registrations);
      }
    } catch (err) {
      console.error("Failed to fetch event:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) fetchEventData();
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError("");
    setUploadResult(null);
    setUploadProgress("Uploading and processing CSV...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/events/${eventId}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
        return;
      }

      setUploadResult(data);
      setUploadProgress("");
      // Refresh registrations
      fetchEventData();
    } catch {
      setUploadError("Network error. Please try again.");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "checked_in":
        return "bg-green-900 text-green-300";
      case "cancelled":
        return "bg-red-900 text-red-300";
      default:
        return "bg-yellow-900 text-yellow-300";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <span className="ml-3 text-gray-400">Loading event...</span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white">
        <p className="mb-4 text-xl">Event not found</p>
        <Link href="/admin/events" className="text-blue-400 hover:text-blue-300">
          &larr; Back to Events
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
          <Link
            href="/admin/events"
            className="mb-2 inline-block text-sm text-blue-400 hover:text-blue-300"
          >
            &larr; Back to Events
          </Link>
          <h1 className="text-xl font-bold sm:text-2xl">{event.name}</h1>
          <div className="mt-2 flex flex-col gap-2 text-sm text-gray-400 sm:flex-row sm:gap-4">
            <span className="flex items-center gap-1">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formatDate(event.date)}
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {event.venue}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        {/* Stats Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-6">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
            <div className="mb-1 text-xs font-medium text-gray-400 sm:text-sm">
              Total Registered
            </div>
            <div className="text-2xl font-bold text-blue-400 sm:text-4xl">
              {registrations.length}
            </div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
            <div className="mb-1 text-xs font-medium text-gray-400 sm:text-sm">
              Checked In
            </div>
            <div className="text-2xl font-bold text-green-400 sm:text-4xl">
              {registrations.filter((r) => r.status === "checked_in").length}
            </div>
          </div>
          <div className="col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-4 sm:col-span-1 sm:p-6">
            <div className="mb-1 text-xs font-medium text-gray-400 sm:text-sm">
              Pending
            </div>
            <div className="text-2xl font-bold text-yellow-400 sm:text-4xl">
              {registrations.filter((r) => r.status === "pending").length}
            </div>
          </div>
        </div>

        {/* CSV Upload Section */}
        <section className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-4 sm:p-6">
          <h2 className="mb-3 text-lg font-bold sm:text-xl">
            Upload Attendees (CSV)
          </h2>
          <p className="mb-4 text-xs text-gray-400 sm:text-sm">
            Upload a CSV file with columns: <strong>Name, Email</strong>. Each
            row will be registered with a unique display ID.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleUpload}
              disabled={uploading}
              className="w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 disabled:opacity-50 sm:w-auto"
            />
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-blue-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                {uploadProgress}
              </div>
            )}
          </div>

          {/* Upload Status Indicator */}
          {uploadError && (
            <div className="mt-4 rounded-lg bg-red-900/50 px-4 py-3 text-sm text-red-300">
              {uploadError}
            </div>
          )}

          {uploadResult && (
            <div className="mt-4 rounded-lg bg-green-900/50 px-4 py-3 text-sm text-green-300">
              {uploadResult.message}
            </div>
          )}
        </section>

        {/* Registrations List */}
        <section>
          <h2 className="mb-4 text-lg font-bold sm:text-xl">
            Registrations ({registrations.length})
          </h2>

          {registrations.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
              No registrations yet. Upload a CSV to register attendees.
            </div>
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="space-y-3 sm:hidden">
                {registrations.map((reg) => (
                  <div
                    key={reg.id}
                    className="rounded-xl border border-gray-800 bg-gray-900 p-4"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium text-white">{reg.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(reg.status)}`}
                      >
                        {reg.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">{reg.email}</div>
                    <div className="mt-1 font-mono text-xs text-blue-400">
                      {reg.displayId}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table layout */}
              <div className="hidden overflow-hidden rounded-xl border border-gray-800 sm:block">
                <table className="w-full">
                  <thead className="bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        Display ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        Email
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 bg-gray-950">
                    {registrations.map((reg) => (
                      <tr
                        key={reg.id}
                        className="transition-colors hover:bg-gray-900"
                      >
                        <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-blue-400">
                          {reg.displayId}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">
                          {reg.name}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">
                          {reg.email}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusColor(reg.status)}`}
                          >
                            {reg.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
