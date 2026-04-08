import React, { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import toast from "react-hot-toast";
import {
  checkIn,
  checkOut,
  getTodayAttendance,
} from "../../services/supabaseService";

const CheckInOut = () => {
  const { user } = useAuthStore();
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkedOutToday, setCheckedOutToday] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchTodayStatus();
    }
  }, [user]);

  // Re-fetch when component gains focus (e.g., user returns from another tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user?.id) {
        fetchTodayStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user]);

  // Re-fetch status periodically to ensure sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (user?.id && !loading) {
        fetchTodayStatus();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user, loading]);

  const fetchTodayStatus = async () => {
    try {
      if (!user?.id) return;

      const { data, error } = await getTodayAttendance(user.id);

      if (error) {
        console.error("Error fetching today attendance:", error);
        return;
      }

      if (data && data.length > 0) {
        // Get the most recent attendance record for today
        const latestRecord = data[0];
        // User is considered checked-in if status is 'checked-in', 'late', or 'on-time'
        const isCheckedIn = ["checked-in", "late", "on-time"].includes(
          latestRecord.status,
        );
        setCheckedIn(isCheckedIn);
        setCheckedOutToday(latestRecord.status === "checked-out");
        setCheckInTime(latestRecord.check_in_time);
        setMissingCheckoutDate(null);
      } else {
        // No attendance record for today - check if there's an active check-in from a previous day
        const { data: activeData } = await getActiveAttendance(user.id);

        if (activeData && activeData.length > 0) {
          const activeRecord = activeData[0];
          const checkInDate = new Date(
            activeRecord.check_in_time,
          ).toLocaleDateString();
          setMissingCheckoutDate(checkInDate);
          setCheckedIn(false);
          setCheckedOutToday(false);
          setCheckInTime(null);
        } else {
          // No active check-in from previous days either
          setCheckedIn(false);
          setCheckedOutToday(false);
          setCheckInTime(null);
          setMissingCheckoutDate(null);
        }
      }
    } catch (error) {
      console.error("Error fetching today status:", error);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      // Check if there's an active check-in from a previous day (missing checkout)
      const { data: activeData } = await getActiveAttendance(user.id);
      if (activeData && activeData.length > 0) {
        // Mark the previous day's attendance as missing checkout
        await markMissingCheckout(activeData[0].id);
        toast(
          (t) => (
            <div className="flex flex-col gap-2">
              <p className="font-bold text-amber-600">
                ⚠️ Missing Checkout Detected
              </p>
              <p className="text-sm">
                You forgot to check out on{" "}
                {new Date(activeData[0].check_in_time).toLocaleDateString()}.
                The previous attendance has been marked as "missing checkout".
              </p>
              <p className="text-sm text-gray-600">
                Please contact HR if this was a mistake.
              </p>
            </div>
          ),
          { duration: 6000 },
        );
      }

      const { data, error } = await checkIn(user.id);

      if (error) {
        throw error;
      }

      // Update local state immediately
      setCheckedIn(true);
      setCheckInTime(new Date().toISOString());
      setMissingCheckoutDate(null);

      toast.success("✓ Checked in successfully!");

      // Fetch fresh status immediately
      await fetchTodayStatus();
    } catch (error) {
      console.error("Check-in error:", error);
      toast.error(error.message);

      // If check-in failed because already checked in/out, fetch the current status
      if (
        error.message.includes("already checked") ||
        error.message.includes("Already checked")
      ) {
        await fetchTodayStatus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      const { data, error } = await checkOut(user.id);

      if (error) {
        throw error;
      }

      // Update local state immediately
      setCheckedIn(false);
      setCheckedOutToday(true);

      toast.success("✓ Checked out successfully!");

      // Fetch fresh status immediately
      await fetchTodayStatus();
    } catch (error) {
      console.error("Check-out error:", error);
      toast.error(error.message);

      // If check-out failed, fetch the current status to sync
      await fetchTodayStatus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card  text-center">
      {/* <h2 className="text-2xl font-bold mb-6 text-gray-800">Clock In/Out</h2> */}
      <div className="mb-8">
        <div className="text-7xl font-bold text-blue-600 font-mono mb-2">
          {currentTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
        <div className="text-xl text-gray-600 font-medium">
          {currentTime.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Missing Checkout Warning */}
      {missingCheckoutDate && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800 font-medium">
            ⚠️ You forgot to check out on {missingCheckoutDate}
          </p>
          <p className="text-amber-700 text-sm mt-1">
            The attendance has been marked as "missing checkout".
            <br />
            Please contact HR if this was a mistake.
          </p>
        </div>
      )}

      {checkInTime && (
        <div className="mb-6 p-4 bg-white rounded-lg">
          <p className="text-gray-700">
            Check-in Time:{" "}
            <span className="font-bold text-green-600">
              {new Date(checkInTime).toLocaleTimeString("en-US", {
                timeZone: "Asia/Manila",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </span>
          </p>
        </div>
      )}
      <button
        onClick={checkedIn ? handleCheckOut : handleCheckIn}
        disabled={loading}
        className={`w-full py-6 rounded-lg font-bold text-white text-xl transition-all disabled:opacity-50 ${
          checkedIn
            ? "bg-red-500 hover:bg-red-600 active:scale-95"
            : "bg-green-500 hover:bg-green-600 active:scale-95"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin h-5 w-5 border-b-2 border-white"></div>
            Processing...
          </span>
        ) : checkedIn ? (
          "CHECK OUT"
        ) : (
          "CHECK IN"
        )}
      </button>

      <div className="mt-8 p-4 bg-white rounded-lg">
        <div className="text-sm text-gray-600 mb-2">Current Status</div>
        <div
          className={`text-lg font-bold ${
            checkedIn
              ? "text-green-600"
              : missingCheckoutDate
                ? "text-amber-600"
                : "text-gray-600"
          }`}
        >
          {checkedIn
            ? "✓ Checked In"
            : missingCheckoutDate
              ? "⚠️ Missing Checkout"
              : "○ Checked Out"}
        </div>
      </div>
    </div>
  );
};

export default CheckInOut;
