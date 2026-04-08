import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import Header from "../Common/Header";
import Sidebar from "../Common/Sidebar";
import Settings from "../Common/Settings";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EditNoteIcon from "@mui/icons-material/EditNote";
import HistoryIcon from "@mui/icons-material/History";
import BuildIcon from "@mui/icons-material/Build";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ClockIcon from "@mui/icons-material/AccessTime";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventNoteIcon from "@mui/icons-material/EventNote";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Timer, Timer10 } from "@mui/icons-material";
import { RefreshCcw } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useEmployeeData } from "./useEmployeeData";
import toast from "react-hot-toast";

const AttendanceCalendar = lazy(
  () => import("../Attendance/AttendanceCalendar"),
);
const LeaveRequest = lazy(() => import("../Leave/LeaveRequest"));
const History = lazy(() => import("../Leave/History"));
const AttendanceCorrection = lazy(
  () => import("../Attendance/AttendanceCorrection"),
);
const Announcements = lazy(() => import("../Leave/Announcements"));

const MANILA_TZ = "Asia/Manila";

const TAB_CONFIG = [
  { id: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { id: "calendar", label: "Attendance Calendar", icon: <CalendarTodayIcon /> },
  { id: "announcements", label: "Announcements", icon: <NotificationsIcon /> },
  { id: "history", label: "History", icon: <HistoryIcon /> },
  { id: "leave-request", label: "Request Leave", icon: <EditNoteIcon /> },

  { id: "corrections", label: "Attendance Corrections", icon: <BuildIcon /> },
];

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);

/** ===== Helpers (Manila-safe) ===== */

// "YYYY-MM-DD" in Manila
const manilaDateKey = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

// Time display in Manila (so UI matches your attendance logic)
const formatTime = (dateString) => {
  if (!dateString) return "--:--";
  return new Date(dateString).toLocaleTimeString("en-US", {
    timeZone: MANILA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDate = (dateString) => {
  if (!dateString) return "--";
  return new Date(dateString).toLocaleDateString("en-US", {
    timeZone: MANILA_TZ,
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const calculateHoursWorked = (attendance) => {
  if (!attendance) return "--:--";

  // Use existing duration_hours if available, otherwise calculate from check_in/check_out
  let hours = attendance.duration_hours;
  if (
    (hours === null || hours === undefined) &&
    attendance.check_in_time &&
    attendance.check_out_time
  ) {
    const checkIn = new Date(attendance.check_in_time);
    const checkOut = new Date(attendance.check_out_time);
    hours = (checkOut - checkIn) / (1000 * 60 * 60); // Convert milliseconds to hours
  }

  if (!hours) return "--:--";
  const h = Math.floor(hours);
  const minutes = Math.round((hours - h) * 60);
  return `${h}h ${minutes}m`;
};

const formatHours = (hours) => {
  if (!hours || hours === 0) return "--";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const timeAgo = (dateString) => {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60)
    return `${diffMinutes} min${diffMinutes > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const truncateContent = (text, maxLength = 60) => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

const getGreeting = () => {
  // Greeting in Manila too
  const manilaHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: MANILA_TZ,
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );

  if (manilaHour < 12) return "Good morning";
  if (manilaHour < 17) return "Good afternoon";
  return "Good evening";
};

// ✅ Manila-safe: is this check-in day before "today" in Manila?
const isBeforeTodayManila = (checkInTime) => {
  if (!checkInTime) return false;
  const checkKey = manilaDateKey(new Date(checkInTime));
  const todayKey = manilaDateKey(new Date());
  return checkKey < todayKey;
};

const getTodayStatus = (todayStatus) => {
  if (!todayStatus)
    return {
      status: "absent",
      text: "Absent",
      bg: "bg-gray-100 text-gray-800",
    };

  if (todayStatus.check_out_time)
    return {
      status: "present",
      text: "Present",
      bg: "bg-green-100 text-green-800",
    };

  if (todayStatus.check_in_time)
    return {
      status: "checked-in",
      text: "Checked In",
      bg: "bg-blue-100 text-blue-800",
    };

  return { status: "absent", text: "Absent", bg: "bg-gray-100 text-gray-800" };
};

const getPriorityStyles = (priority) => {
  switch (priority) {
    case "high":
      return {
        border: "border-l-4 border-red-500",
        badge: "bg-red-100 text-red-800",
        dot: "bg-red-500",
      };
    case "low":
      return {
        border: "border-l-4 border-gray-400",
        badge: "bg-gray-100 text-gray-800",
        dot: "bg-gray-400",
      };
    default:
      return {
        border: "border-l-4 border-blue-500",
        badge: "bg-blue-100 text-blue-800",
        dot: "bg-blue-500",
      };
  }
};

const getTypeStyles = (item) => {
  if (item.type === "leave") {
    return item.title?.includes("Approved")
      ? { dot: "bg-green-500", badge: "bg-green-100 text-green-800" }
      : { dot: "bg-red-500", badge: "bg-red-100 text-red-800" };
  }
  if (item.type === "correction")
    return { dot: "bg-purple-500", badge: "bg-purple-100 text-purple-800" };

  const styles = getPriorityStyles(item.priority);
  return { dot: styles.dot, badge: styles.badge };
};

/** ===== Dashboard view ===== */
const Dashboard = ({ onGoToTab, onNavigateFromActivity }) => {
  const { user, userProfile } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  const {
    loading,
    attendanceLoading,
    todayAttendance,
    weeklyAttendance,
    recentActivities,
    stats,
    handleCheckIn,
    handleCheckOut,
  } = useEmployeeData(user, userProfile);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleQuickCheckIn = async () => {
    const result = await handleCheckIn();
    if (result?.error) toast.error(result.error);
    else toast.success("✓ Checked in successfully!");
  };

  const handleQuickCheckOut = async () => {
    const result = await handleCheckOut();
    if (result?.error) toast.error(result.error);
    else toast.success("✓ Checked out successfully!");
  };

  const todayStatus = useMemo(
    () => getTodayStatus(todayAttendance),
    [todayAttendance],
  );

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {getGreeting()},{" "}
            <span className="text-blue-600">
              {userProfile?.full_name?.split(" ")[0] || "Employee"}
            </span>
            !
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back to your dashboard
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2 border border-gray-100">
          <ClockIcon className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Current Time
            </p>
            <p className="text-base font-semibold text-gray-800">
              {currentTime.toLocaleString("en-GB", {
                timeZone: MANILA_TZ,
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Today + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today card */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-5 h-full">
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <CalendarTodayIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Today</h3>
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${todayStatus.bg}`}
                  >
                    {todayStatus.text}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  {todayStatus.status === "absent" && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <AccessTimeIcon className="w-4 h-4 text-orange-600" />
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        You haven't checked in yet. Please mark your attendance
                        to start your day.
                      </p>
                    </div>
                  )}
                  {todayStatus.status === "present" && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          You're officially marked present today!
                        </p>
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          Great job! 🎉
                        </p>
                      </div>
                    </div>
                  )}
                  {todayStatus.status === "checked-in" && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <AccessTimeIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          You're checked in! Your attendance has been recorded.
                        </p>
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          Have a productive day!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                {todayStatus.status === "checked-in" ? (
                  <button
                    onClick={handleQuickCheckOut}
                    disabled={attendanceLoading}
                    className="w-full px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    {attendanceLoading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-b-2 border-white" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <AccessTimeIcon className="w-4 h-4" />
                        Check Out
                      </>
                    )}
                  </button>
                ) : todayStatus.status === "absent" ? (
                  <button
                    onClick={handleQuickCheckIn}
                    disabled={attendanceLoading}
                    className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                  >
                    {attendanceLoading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-b-2 border-white" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <AccessTimeIcon className="w-4 h-4" />
                        Check In
                      </>
                    )}
                  </button>
                ) : (
                  <div className="w-full px-4 py-3 bg-gray-100 text-gray-500 rounded-xl font-medium text-center border border-gray-200">
                    Completed for Today
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <StatBox
              icon={<ClockIcon />}
              iconBg="bg-yellow-100"
              iconColor="text-yellow-600"
              borderColor="border-yellow-500"
              value={formatTime(todayAttendance?.check_in_time)}
              label="Clock In Today"
            />
            <StatBox
              icon={<RefreshCcw />}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              borderColor="border-teal-500"
              value={formatTime(todayAttendance?.check_out_time)}
              label="Clock Out Today"
            />
            <StatBox
              icon={<Timer />}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              borderColor="border-blue-500"
              value={formatHours(stats.monthlyHours)}
              label="Hours This Month"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatBox
              icon={<CalendarMonthIcon />}
              iconBg="bg-green-100"
              iconColor="text-green-600"
              borderColor="border-green-500"
              value={stats.monthlyDaysPresent || 0}
              label="Days Present (This Month)"
            />
            <StatBox
              icon={<Timer10 />}
              iconBg="bg-red-100"
              iconColor="text-red-600"
              borderColor="border-red-500"
              value={stats.monthlyLateCount || 0}
              label="Number of Late (This Month)"
            />
            <StatBox
              icon={<EventNoteIcon />}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
              borderColor="border-purple-500"
              value={stats.monthlyLeaveCount || 0}
              label="Number of Leave (This Month)"
            />
          </div>
        </div>
      </div>

      {/* Weekly + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Attendance */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-blue-600" />
              Weekly Attendance Board
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Clock In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Clock Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Work Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : weeklyAttendance.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No attendance records for this week
                    </td>
                  </tr>
                ) : (
                  weeklyAttendance.map((attendance) => {
                    const label = attendance.check_out_time
                      ? "Present"
                      : isBeforeTodayManila(attendance.check_in_time)
                        ? "Missing Check-Out"
                        : "In Progress";

                    const badgeClass = attendance.check_out_time
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : isBeforeTodayManila(attendance.check_in_time)
                        ? "bg-red-100 text-red-800 border border-red-200"
                        : "bg-yellow-100 text-yellow-800 border border-yellow-200";

                    return (
                      <tr
                        key={attendance.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                          {formatDate(attendance.check_in_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {formatTime(attendance.check_in_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {formatTime(attendance.check_out_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-semibold">
                          {calculateHoursWorked(attendance)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeClass}`}
                          >
                            {label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <NotificationsIcon className="w-5 h-5 text-blue-600" />
              Recent Activities
            </h3>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            ) : recentActivities.length === 0 ? (
              <div className="p-6 text-center text-gray-500 flex flex-col items-center">
                <NotificationsIcon className="w-12 h-12 text-gray-300 mb-2" />
                <p>No recent activities</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentActivities.map((item) => {
                  const styles = getPriorityStyles(item.priority);
                  const typeStyles = getTypeStyles(item);

                  const handleClick = () => {
                    if (item.type === "announcement") {
                      onGoToTab?.("announcements");
                      onNavigateFromActivity?.("announcement");
                      return;
                    }
                    if (item.type === "leave") {
                      onGoToTab?.("history");
                      onNavigateFromActivity?.("leave");
                      return;
                    }
                    if (item.type === "correction") {
                      onGoToTab?.("corrections");
                      onNavigateFromActivity?.("correction");
                      return;
                    }
                    onGoToTab?.("dashboard");
                  };

                  return (
                    <div
                      key={item.id}
                      className={
                        item.type === "announcement" ? styles.border : ""
                      }
                    >
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50 transition"
                        onClick={handleClick}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${typeStyles.dot} mt-2 flex-shrink-0`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {item.title || "Activity"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 truncate">
                              {truncateContent(item.content, 50)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1.5">
                              {timeAgo(item.created_at)}
                            </p>
                          </div>

                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${typeStyles.badge} flex-shrink-0 ml-2 uppercase tracking-wide`}
                          >
                            {item.type === "announcement"
                              ? item.priority === "high"
                                ? "HIGH"
                                : item.priority === "low"
                                  ? "LOW"
                                  : "Normal"
                              : item.type === "leave"
                                ? item.title?.toLowerCase().includes("approved")
                                  ? "APPROVED"
                                  : item.title
                                        ?.toLowerCase()
                                        .includes("rejected")
                                    ? "REJECTED"
                                    : "STATUS"
                                : item.type === "correction"
                                  ? "CORRECTION"
                                  : "OTHER"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// StatBox
const StatBox = ({ icon, iconBg, iconColor, borderColor, value, label }) => (
  <div
    className={`flex items-center gap-3 border rounded-xl px-4 py-3 bg-white shadow-sm hover:shadow-md transition-shadow ${borderColor}`}
  >
    <div
      className={`flex items-center justify-center w-10 h-10 rounded-full ${iconBg}`}
    >
      <span className={iconColor}>{icon}</span>
    </div>
    <div className="text-left">
      <p className="text-lg font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  </div>
);

// Main EmployeeDashboard
const EmployeeDashboard = () => {
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem("employeeDashboardTab") || "dashboard",
  );
  const [showSettings, setShowSettings] = useState(false);

  const handleTabChange = (tabId) => {
    localStorage.setItem("employeeDashboardTab", tabId);
    setActiveTab(tabId);
  };

  const handleNotificationNavigate = (type) => {
    if (type === "leave") handleTabChange("history");
    if (type === "announcement") handleTabChange("announcements");
    if (type === "correction") handleTabChange("corrections");
  };

  const renderComponent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            onGoToTab={handleTabChange}
            onNavigateFromActivity={handleNotificationNavigate}
          />
        );
      case "calendar":
        return <AttendanceCalendar />;
      case "announcements":
        return <Announcements />;
      case "leave-request":
        return <LeaveRequest />;
      case "history":
        return <History />;
      case "corrections":
        return <AttendanceCorrection />;
      default:
        return (
          <Dashboard
            onGoToTab={handleTabChange}
            onNavigateFromActivity={handleNotificationNavigate}
          />
        );
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Header
        title="Employee Dashboard"
        onNavigate={handleNotificationNavigate}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="flex flex-1">
        <aside className="w-24 hidden md:block">
          <Sidebar
            tabs={TAB_CONFIG}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            onOpenSettings={() => setShowSettings(true)}
          />
        </aside>

        <main className="flex-1 p-4 md:p-6 flex justify-center overflow-auto">
          <div className="w-full max-w-7xl">
            <div className="md:hidden mb-6">
              <Sidebar
                tabs={TAB_CONFIG}
                activeTab={activeTab}
                setActiveTab={handleTabChange}
                onOpenSettings={() => setShowSettings(true)}
              />
            </div>

            <Suspense fallback={<LoadingFallback />}>
              {renderComponent()}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Settings Modal - rendered at top level for proper z-index */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default EmployeeDashboard;
