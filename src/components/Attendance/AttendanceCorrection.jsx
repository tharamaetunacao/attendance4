import React, { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { requestAttendanceCorrection } from "../../services/supabaseService";
import { supabase } from "../../config/supabase";
import toast from "react-hot-toast";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DescriptionIcon from "@mui/icons-material/Description";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

const AttendanceCorrection = () => {
  const { user } = useAuthStore();
  const [attendanceDate, setAttendanceDate] = useState("");
  const [missingType, setMissingType] = useState("check_out");
  const [requestedTime, setRequestedTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!attendanceDate || !requestedTime || !reason.trim()) {
      toast.error("Please fill all fields");
      return;
    }

    let attendanceId = null;
    let originalTime = null;
    try {
      // Use Manila timezone (UTC+8) for date range queries
      // Create date range using the selected date as Manila time
      const manilaDateStr = attendanceDate; // YYYY-MM-DD format from date input
      const startOfDay = new Date(`${manilaDateStr}T00:00:00+08:00`);
      const endOfDay = new Date(`${manilaDateStr}T23:59:59.999+08:00`);

      const { data: existingAttendance, error } = await supabase
        .from("attendance")
        .select("id, check_in_time, check_out_time")
        .eq("user_id", user.id)
        .gte("check_in_time", startOfDay.toISOString())
        .lt("check_in_time", endOfDay.toISOString())
        .maybeSingle();
      if (error) throw error;
      if (existingAttendance) {
        attendanceId = existingAttendance.id;
        // Store the original time (extract time portion from timestamp)
        const rawTime =
          missingType === "check_in"
            ? existingAttendance.check_in_time
            : existingAttendance.check_out_time;
        if (rawTime) {
          const timeDate = new Date(rawTime);
          originalTime = timeDate.toTimeString().split(" ")[0]; // "HH:MM:SS"
        }
      }
    } catch (error) {
      console.error("Error finding attendance:", error);
      // Continue with submission even if attendance record lookup fails
    }

    // Check if there's already a pending correction for this date
    try {
      // Normalize the date to ensure we're comparing dates correctly
      // by extracting just the YYYY-MM-DD portion
      const normalizedDate = new Date(attendanceDate + "T00:00:00")
        .toISOString()
        .split("T")[0];

      const { data: existingCorrection, error: corrError } = await supabase
        .from("attendance_corrections")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("attendance_date", normalizedDate)
        .or("status.eq.pending,status.eq.approved")
        .maybeSingle();

      if (corrError) throw corrError;
      if (existingCorrection) {
        const statusMsg =
          existingCorrection.status === "approved"
            ? "already has an approved correction"
            : "has a pending correction request";
        toast.error(`A correction request for this date ${statusMsg}.`);
        return;
      }
    } catch (error) {
      console.error("Error checking existing corrections:", error);
      // continue with submission even if check fails
    }

    setLoading(true);
    try {
      const correctionData = {
        userId: user.id,
        attendanceDate,
        missingType,
        requestedTime,
        reason,
        attendanceId,
        originalTime,
      };
      await requestAttendanceCorrection(correctionData);
      toast.success("Correction request submitted successfully");
      setIsSubmitted(true);
      // reset form after delay
      setTimeout(() => {
        setAttendanceDate("");
        setRequestedTime("");
        setReason("");
        setIsSubmitted(false);
      }, 3000);
    } catch (error) {
      toast.error("Failed to submit: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <CheckCircleIcon className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Request Submitted!
            </h2>
            <p className="text-gray-600">
              Your attendance correction request has been sent for approval.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              You will be notified once it's reviewed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Top accent */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-600 via-indigo-600 to-sky-500" />

        {/* Header */}
        <div className="px-6 sm:px-8 py-6 border-b border-slate-200 bg-slate-50/60">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-600/10 text-blue-700 flex items-center justify-center border border-blue-600/10">
              <CalendarTodayIcon className="w-5 h-5" />
            </div>

            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
                Request Attendance Correction
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Submit a request to correct missing check-in or check-out times.
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center rounded-full bg-white px-2 py-1 border border-slate-200">
                Required fields *
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Date */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CalendarTodayIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-sm text-slate-900 shadow-sm
                           placeholder:text-slate-400
                           focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500
                           hover:border-slate-300 transition"
                  required
                />
              </div>
            </div>

            {/* Correction Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Correction Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={missingType}
                  onChange={(e) => setMissingType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 shadow-sm
                           focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500
                           hover:border-slate-300 transition cursor-pointer appearance-none"
                >
                  <option value="check_in">Missing Check-in</option>
                  <option value="check_out">Missing Check-out</option>
                </select>
                <ArrowDropDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5" />
              </div>
              <p className="text-xs text-slate-500">
                Choose which time is missing for this date.
              </p>
            </div>

            {/* Requested Time */}
            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Requested Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <AccessTimeIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="time"
                  value={requestedTime}
                  onChange={(e) => setRequestedTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pl-10 text-sm text-slate-900 shadow-sm
                           focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500
                           hover:border-slate-300 transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-200" />

          {/* Reason */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Reason <span className="text-red-500">*</span>
            </label>

            <div className="relative">
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Briefly explain what happened (e.g., forgot to clock in, system issue, client visit, etc.)"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm resize-none
                         placeholder:text-slate-400
                         focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500
                         hover:border-slate-300 transition"
                required
              />
              <DescriptionIcon className="absolute right-3 top-3 text-slate-300 w-4 h-4" />
            </div>

            {/* Optional: character helper (no logic change, just display) */}
            <p className="text-xs text-slate-500">
              Keep it clear and specific to help your manager approve faster.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500/70" />
              Your request will be routed to your manager for approval.
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white
              transition active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-blue-500/20
              ${
                loading
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm hover:shadow-md"
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <SendIcon className="w-5 h-5" />
                  Submit Request
                </>
              )}
            </button>
          </div>

          {/* Info Note */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center border border-blue-600/10 flex-shrink-0">
                <span className="text-sm font-semibold">i</span>
              </div>
              <div className="text-sm text-slate-700">
                <p className="font-medium text-slate-900">Quick reminder</p>
                <p className="mt-1 text-slate-600">
                  You can only submit one request per date. Your manager will
                  review and approve the correction.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceCorrection;
