"use client";

import { useEffect, useState, useCallback } from "react";

interface PastEventStats {
  eventId: string;
  eventName: string;
  date: string;
  totalRegistered: number;
  totalCheckedIn: number;
}

interface DashboardData {
  totalRegistered: number;
  totalCheckedIn: number;
  pastEvents: PastEventStats[];
}

export default function AdminDashboard() {
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [totalCheckedIn, setTotalCheckedIn] = useState(0);
  const [pastEvents, setPastEvents] = useState<PastEventStats[]>([]);
  const [currentEventId, setCurrentEventId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboardData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (currentEventId) {
        params.set("eventId", currentEventId);
      }
      const res = await fetch(`/api/admin/dashboard?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      const data: DashboardData = await res.json();
      setTotalRegistered(data.totalRegistered);
      setTotalCheckedIn(data.totalCheckedIn);
      setPastEvents(data.pastEvents);
      setError("");
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [currentEventId]);

  // Initial fetch and polling every 10 seconds
  useEffect(() => {
    setLoading(true);
    fetchDashboardData();

    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const checkedInPercent =
    totalRegistered > 0
      ? Math.round((totalCheckedIn / totalRegistered) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">
            Real-time event check-in monitoring
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Event Filter */}
        <div className="mb-8">
          <label
            htmlFor="eventId"
            className="mb-2 block text-sm font-medium text-gray-400"
          >
            Filter by Event ID (leave empty for all events)
          </label>
          <input
            id="eventId"
            type="text"
            value={currentEventId}
            onChange={(e) => setCurrentEventId(e.target.value)}
            placeholder="Enter event ID..."
            className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-900/50 p-4 text-red-300">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span className="ml-3 text-gray-400">
              Loading dashboard data...
            </span>
          </div>
        ) : (
          <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {/* Total Registered */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-2 text-sm font-medium text-gray-400">
                Total Registered
              </div>
              <div className="text-4xl font-bold text-blue-400">
                {totalRegistered}
              </div>
            </div>

            {/* Total Checked In */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-2 text-sm font-medium text-gray-400">
                Total Checked In
              </div>
              <div className="text-4xl font-bold text-green-400">
                {totalCheckedIn}
              </div>
            </div>

            {/* Check-in Rate */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-2 text-sm font-medium text-gray-400">
                Check-in Rate
              </div>
              <div className="text-4xl font-bold text-yellow-400">
                {checkedInPercent}%
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${checkedInPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Past Events Section */}
        <section>
          <h2 className="mb-4 text-xl font-bold">Past Events</h2>
          {pastEvents.length === 0 ? (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
              No event data available yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-800">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                      Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
                      Registered
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
                      Checked In
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
                      Attendance %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-gray-950">
                  {pastEvents.map((event) => {
                    const attendPct =
                      event.totalRegistered > 0
                        ? Math.round(
                            (event.totalCheckedIn / event.totalRegistered) * 100
                          )
                        : 0;
                    return (
                      <tr
                        key={event.eventId}
                        className="transition-colors hover:bg-gray-900"
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-white">
                          {event.eventName}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-400">
                          {event.date}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-blue-400">
                          {event.totalRegistered}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm text-green-400">
                          {event.totalCheckedIn}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              attendPct >= 70
                                ? "bg-green-900 text-green-300"
                                : attendPct >= 40
                                  ? "bg-yellow-900 text-yellow-300"
                                  : "bg-red-900 text-red-300"
                            }`}
                          >
                            {attendPct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
