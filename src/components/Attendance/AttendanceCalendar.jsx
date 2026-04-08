import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";
import { supabase } from "../../config/supabase";
import {
  getLocalDateString,
  getAttendanceStorageKey,
} from "../../utils/dateHelpers";
import { getHolidaysForMonth } from "../../utils/philippineHolidays";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CelebrationIcon from "@mui/icons-material/Celebration";
import CancelIcon from "@mui/icons-material/Cancel";
import AssessmentIcon from "@mui/icons-material/Assessment";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventBusyIcon from "@mui/icons-material/EventBusy";
import TimerIcon from "@mui/icons-material/Timer";
import AlarmIcon from "@mui/icons-material/Alarm";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import WorkIcon from "@mui/icons-material/Work";
import HalfMonthIcon from "@mui/icons-material/Remove";
import WeekendIcon from "@mui/icons-material/Weekend";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import toast from "react-hot-toast";
import {
  getAttendanceRecords,
  requestAttendanceCorrection,
} from "../../services/supabaseService";

const MANILA_TZ = "Asia/Manila";

const AttendanceCalendar = () => {
  const { user } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState({});
  const [correctionsData, setCorrectionsData] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [selectedDayForCorrection, setSelectedDayForCorrection] =
    useState(null);
  const [correctionReason, setCorrectionReason] =
    useState("Forgot to time out");
  const [correctOutTime, setCorrectOutTime] = useState("");

  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0,
  ).getDate();
  const firstDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  ).getDay();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      if (user?.id) {
        await loadAttendanceData();
      }
      await loadHolidays();
      setIsLoading(false);
    };
    loadData();
  }, [user, currentMonth]);

  const loadHolidays = async () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Get static Philippine holidays
    const staticHolidays = getHolidaysForMonth(year, month);

    // Get holidays from database
    try {
      const { data: dbHolidays, error } = await supabase
        .from("holidays")
        .select("*")
        .gte("date", `${year}-01-01`)
        .lte("date", `${year}-12-31`);

      if (!error && dbHolidays) {
        // Merge database holidays with static holidays
        const dbHolidaysForMonth = dbHolidays
          .filter((h) => {
            const holidayDate = new Date(h.date);
            return holidayDate.getMonth() === month;
          })
          .map((h) => ({
            date: h.date,
            name: h.name,
            type: h.is_recurring ? "special" : "regular",
            isCustom: true, // Flag to identify custom holidays
          }));

        // Combine and remove duplicates (custom holidays take precedence)
        const combinedHolidays = [...staticHolidays];
        dbHolidaysForMonth.forEach((dbHoliday) => {
          const existingIndex = combinedHolidays.findIndex(
            (h) => h.date === dbHoliday.date,
          );
          if (existingIndex >= 0) {
            combinedHolidays[existingIndex] = dbHoliday;
          } else {
            combinedHolidays.push(dbHoliday);
          }
        });

        setHolidays(combinedHolidays);
      } else {
        setHolidays(staticHolidays);
      }
    } catch (err) {
      console.error("Error fetching holidays from database:", err);
      setHolidays(staticHolidays);
    }
  };

  const loadAttendanceData = async () => {
    try {
      if (!user?.id) return;

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      // Get start and end dates for the current month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const { data, error } = await getAttendanceRecords(
        user.id,
        startDate,
        endDate,
      );

      if (error) {
        console.error("Error fetching attendance records:", error);
        return;
      }

      // Organize data by day
      const attendanceByDay = {};
      if (data) {
        data.forEach((record) => {
          const recordDate = new Date(record.check_in_time);
          const day = recordDate.getDate();
          attendanceByDay[day] = {
            checkInTime: record.check_in_time,
            checkOutTime: record.check_out_time,
            checkedIn: record.status === "checked-in",
            duration_hours: record.duration_hours,
            id: record.id,
          };
        });
      }

      setAttendanceData(attendanceByDay);

      // Load corrections data
      const { data: corrections, error: correctionsError } = await supabase
        .from("attendance_corrections")
        .select(
          "*, users!attendance_corrections_approved_by_fkey(id, full_name)",
        )
        .eq("user_id", user.id)
        .eq("status", "approved");

      if (correctionsError) {
        console.error("Error loading corrections data:", correctionsError);
      } else {
        setCorrectionsData(corrections || []);
      }
    } catch (error) {
      console.error("Error loading attendance data:", error);
    }
  };

  const getDayStatus = (day) => {
    if (!day) return null;

    const dayDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const dateStr = getLocalDateString(dayDate);

    // Check if this day is a holiday from state (includes database holidays)
    const holidayInfo = holidays.find((h) => h.date === dateStr);

    // Check if this day is a holiday
    if (holidayInfo) {
      return "holiday";
    }

    const attendance = attendanceData[day];
    const today = new Date();

    // Check if this is a weekend
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

    // Check if this is a past day (before today)
    const isPastDay =
      dayDate < today && dayDate.toDateString() !== today.toDateString();

    if (!attendance) {
      // If it's a past day with no attendance record, mark as absent
      return isPastDay ? "absent" : "no-data";
    }

    if (attendance.checkedIn && !attendance.checkOutTime) {
      return "checked-in";
    } else if (attendance.checkOutTime) {
      return "completed";
    }

    return isPastDay ? "absent" : "no-data";
  };

  const getDayClassName = (day) => {
    if (!day) return "bg-gray-50 h-16 sm:h-20";

    const status = getDayStatus(day);
    const today = new Date();
    const isToday =
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear();

    // Get holiday info for styling
    const dayDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const dateStr = getLocalDateString(dayDate);
    const holidayInfo = holidays.find((h) => h.date === dateStr);

    let baseClass =
      "h-16 sm:h-20 flex flex-col items-center justify-center rounded-lg font-semibold cursor-pointer transition-all p-1 sm:p-2 text-sm sm:text-base";

    if (isToday) {
      baseClass += " ring-2 ring-blue-500";
    }

    switch (status) {
      case "completed":
        return `${baseClass} bg-green-100 text-green-900 hover:bg-green-200`;
      case "checked-in":
        return `${baseClass} bg-yellow-100 text-yellow-900 hover:bg-yellow-200`;
      case "holiday":
        // Company/custom holidays are green, static Philippine holidays are purple
        if (holidayInfo?.isCustom) {
          return `${baseClass} bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border-2 border-emerald-400`;
        }
        return `${baseClass} bg-purple-100 text-purple-900 hover:bg-purple-200`;
      case "absent":
        return `${baseClass} bg-red-100 text-red-900 hover:bg-red-200`;
      default:
        return `${baseClass} bg-gray-100 text-gray-600 hover:bg-gray-200`;
    }
  };

  const getDayContent = (day) => {
    if (!day) return null;

    const dayDate = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );
    const dateStr = getLocalDateString(dayDate);
    const holidayInfo = holidays.find((h) => h.date === dateStr);
    const attendance = attendanceData[day];
    const status = getDayStatus(day);
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

    // Find approved correction for this day
    const approvedCorrection = correctionsData.find((correction) => {
      const correctionDate = new Date(correction.attendance_date);
      return correctionDate.toDateString() === dayDate.toDateString();
    });

    let content = (
      <div className="flex flex-col items-center text-center">
        <span className="text-base sm:text-lg font-bold">{day}</span>
      </div>
    );

    // Show holiday info
    if (holidayInfo) {
      content = (
        <div className="flex flex-col items-center text-center">
          <span className="text-base sm:text-lg font-bold">{day}</span>
          <CelebrationIcon sx={{ fontSize: 12, mt: 0.5 }} />
          <span className="text-[0.5rem] sm:text-[0.55rem] mt-0.5 leading-tight px-1">
            {holidayInfo.name.length > 10
              ? holidayInfo.name.substring(0, 8) + "..."
              : holidayInfo.name}
          </span>
        </div>
      );
    }
    // Show weekend
    else if (isWeekend) {
      content = (
        <div className="flex flex-col items-center text-center">
          <span className="text-base sm:text-lg font-bold">{day}</span>
          <WeekendIcon sx={{ fontSize: 12, mt: 0.5, color: "gray" }} />
        </div>
      );
    }
    // Show attendance info
    else if (
      attendance &&
      (attendance.checkInTime || attendance.checkOutTime)
    ) {
      // Check if this is an incomplete record (check-in but no check-out)
      let correctedCheckInTime = attendance.checkInTime;
      let correctedCheckOutTime = attendance.checkOutTime;
      if (approvedCorrection) {
        // Use Manila timezone offset for corrected times
        const dateStr = dayDate.toLocaleDateString("en-CA", {
          timeZone: MANILA_TZ,
        });
        if (approvedCorrection.missing_type === "check_in") {
          correctedCheckInTime = new Date(
            `${dateStr}T${approvedCorrection.requested_time}+08:00`,
          );
        }
        if (approvedCorrection.missing_type === "check_out") {
          correctedCheckOutTime = new Date(
            `${dateStr}T${approvedCorrection.requested_time}+08:00`,
          );
        }
      }
      const checkInFormatted = formatTime(correctedCheckInTime);
      const checkOutFormatted = formatTime(correctedCheckOutTime);
      const hoursWorked = attendance.duration_hours
        ? {
            hours: Math.floor(attendance.duration_hours),
            minutes: Math.round(
              (attendance.duration_hours -
                Math.floor(attendance.duration_hours)) *
                60,
            ),
          }
        : null;
      const isIncomplete = correctedCheckInTime && !correctedCheckOutTime;

      content = (
        <div className="flex flex-col items-center text-center">
          <span className="text-base sm:text-lg font-bold">{day}</span>
          <div className="text-[0.5rem] sm:text-[0.6rem] mt-0.5 leading-tight">
            {checkInFormatted && <div>in-{checkInFormatted}</div>}
            {checkOutFormatted ? (
              <div>out-{checkOutFormatted}</div>
            ) : (
              <div className="text-red-500">out-❌</div>
            )}
            {hoursWorked && (
              <div className="text-[0.45rem] sm:text-[0.55rem] mt-0.5 font-medium">
                {hoursWorked.hours}h {hoursWorked.minutes}m
              </div>
            )}
            {isIncomplete && (
              <div className="text-[0.4rem] sm:text-[0.5rem] mt-1 text-orange-600 font-medium leading-tight">
                INCOMPLETE
              </div>
            )}
            {approvedCorrection && (
              <div className="text-[0.4rem] sm:text-[0.5rem] mt-1 text-green-600 font-medium leading-tight">
                APPROVED
              </div>
            )}
          </div>
          {status === "completed" && (
            <CheckCircleIcon sx={{ fontSize: 10, mt: 0.5 }} />
          )}
          {status === "checked-in" && (
            <AccessTimeIcon sx={{ fontSize: 10, mt: 0.5 }} />
          )}
        </div>
      );
    }
    // Show status icons for absent
    else if (status === "absent") {
      content = (
        <div className="flex flex-col items-center text-center">
          <span className="text-base sm:text-lg font-bold">{day}</span>
          <CancelIcon sx={{ fontSize: 12, mt: 0.5 }} />
        </div>
      );
    }

    return content;
  };

  const calculateStats = () => {
    let present = 0;
    let checkedIn = 0;
    let absent = 0;
    let totalHours = 0;
    let lateCount = 0;
    const LATE_THRESHOLD_HOUR = 8;
    const LATE_THRESHOLD_MINUTE = 15;

    const today = new Date();
    const currentDay = today.getDate();
    const isCurrentMonth =
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear();

    // Only count days up to today if it's the current month
    const daysToCount = isCurrentMonth ? currentDay : daysInMonth;

    for (let day = 1; day <= daysToCount; day++) {
      const status = getDayStatus(day);
      const attendance = attendanceData[day];

      if (status === "completed") {
        present++;
        // Add hours worked
        if (attendance?.duration_hours) {
          totalHours += attendance.duration_hours;
        }
        // Check if late
        if (attendance?.checkInTime) {
          const checkInDate = new Date(attendance.checkInTime);
          const checkInHour = checkInDate.getHours();
          const checkInMinute = checkInDate.getMinutes();
          if (
            checkInHour > LATE_THRESHOLD_HOUR ||
            (checkInHour === LATE_THRESHOLD_HOUR &&
              checkInMinute > LATE_THRESHOLD_MINUTE)
          ) {
            lateCount++;
          }
        }
      } else if (status === "checked-in") {
        checkedIn++;
        // Check if late for currently checked in
        if (attendance?.checkInTime) {
          const checkInDate = new Date(attendance.checkInTime);
          const checkInHour = checkInDate.getHours();
          const checkInMinute = checkInDate.getMinutes();
          if (
            checkInHour > LATE_THRESHOLD_HOUR ||
            (checkInHour === LATE_THRESHOLD_HOUR &&
              checkInMinute > LATE_THRESHOLD_MINUTE)
          ) {
            lateCount++;
          }
        }
      } else {
        // Only count as absent if it's a past day
        const date = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          day,
        );
        if (date < today && date.toDateString() !== today.toDateString()) {
          absent++;
        }
      }
    }

    const totalHoursDisplay = {
      hours: Math.floor(totalHours),
      minutes: Math.round((totalHours - Math.floor(totalHours)) * 60),
    };

    return {
      present,
      checkedIn,
      absent,
      totalHours: totalHoursDisplay,
      late: lateCount,
    };
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const formatTime = (dateTime) => {
    if (!dateTime) return "";
    // Use Manila timezone for consistent display
    return new Date(dateTime)
      .toLocaleTimeString("en-US", {
        timeZone: MANILA_TZ,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase();
  };

  const handleCloseCorrectionModal = () => {
    setCorrectionModalOpen(false);
    setSelectedDayForCorrection(null);
    setCorrectionReason("Forgot to time out");
    setCorrectOutTime("");
  };

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const stats = calculateStats();

  const isCurrentMonth =
    currentMonth.getMonth() === new Date().getMonth() &&
    currentMonth.getFullYear() === new Date().getFullYear();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-red-600 px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <CalendarMonthIcon className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Attendance Calendar
                </h2>
                <p className="text-blue-100 text-sm">
                  Track your monthly attendance
                </p>
              </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isCurrentMonth
                    ? "bg-white/20 text-white hover:bg-white/30"
                    : "bg-white text-indigo-600 hover:bg-gray-100"
                }`}
                title="Go to today"
              >
                <TodayIcon fontSize="small" />
              </button>
              <div className="flex items-center bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-1.5 text-white hover:bg-white/20 rounded-md transition-all duration-200"
                >
                  <ChevronLeftIcon fontSize="small" />
                </button>
                <div className="px-4 py-1">
                  <span className="text-white font-semibold text-base min-w-[140px] text-center inline-block">
                    {monthName}
                  </span>
                </div>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-1.5 text-white hover:bg-white/20 rounded-md transition-all duration-200"
                >
                  <ChevronRightIcon fontSize="small" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 sm:h-96">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 text-sm">Loading calendar...</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Calendar Grid - Left Side */}
              <div className="flex-1">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-2 mb-3">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center font-semibold text-gray-500 py-2 text-sm uppercase tracking-wider"
                      >
                        {day}
                      </div>
                    ),
                  )}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day, idx) => {
                    if (!day) {
                      return (
                        <div
                          key={idx}
                          className="h-20 bg-gray-50 rounded-lg"
                        ></div>
                      );
                    }

                    const dayDate = new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth(),
                      day,
                    );
                    const dateStr = getLocalDateString(dayDate);
                    const holidayInfo = holidays.find(
                      (h) => h.date === dateStr,
                    );
                    const attendance = attendanceData[day];
                    const isWeekend =
                      dayDate.getDay() === 0 || dayDate.getDay() === 6;

                    let tooltipText = "";
                    if (holidayInfo) {
                      if (holidayInfo.isCustom) {
                        tooltipText = `${holidayInfo.name} (Company Holiday)`;
                      } else {
                        tooltipText = `${holidayInfo.name} (${holidayInfo.type === "regular" ? "Regular Holiday" : "Special Holiday"})`;
                      }
                    }
                    if (attendance) {
                      if (tooltipText) tooltipText += "\n";
                      tooltipText += `Check-in: ${new Date(attendance.checkInTime).toLocaleTimeString("en-US", { timeZone: MANILA_TZ, hour: "2-digit", minute: "2-digit", hour12: true })}`;
                      if (attendance.checkOutTime) {
                        tooltipText += `\nCheck-out: ${new Date(attendance.checkOutTime).toLocaleTimeString("en-US", { timeZone: MANILA_TZ, hour: "2-digit", minute: "2-digit", hour12: true })}`;
                      }
                    }
                    if (isWeekend && !holidayInfo) {
                      tooltipText = "Weekend";
                    }

                    return (
                      <div
                        key={idx}
                        className={getDayClassName(day)}
                        title={tooltipText}
                      >
                        {getDayContent(day)}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Sidebar - Legend & Stats */}
              <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
                {/* Legend */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <AssessmentIcon className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Legend
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-100 border border-green-300 rounded flex items-center justify-center">
                        <CheckCircleIcon className="text-green-600 text-xs" />
                      </div>
                      <span className="text-xs text-gray-600">Completed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-yellow-100 border border-yellow-300 rounded flex items-center justify-center">
                        <AccessTimeIcon className="text-yellow-600 text-xs" />
                      </div>
                      <span className="text-xs text-gray-600">Checked In</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-emerald-100 border-2 border-emerald-400 rounded flex items-center justify-center">
                        <WbSunnyIcon className="text-emerald-600 text-xs" />
                      </div>
                      <span className="text-xs text-gray-600">
                        Company Holiday
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-purple-100 border border-purple-300 rounded flex items-center justify-center">
                        <WbSunnyIcon className="text-purple-600 text-xs" />
                      </div>
                      <span className="text-xs text-gray-600">
                        Public Holiday
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-200 border border-gray-400 rounded flex items-center justify-center">
                        <WeekendIcon className="text-gray-500 text-xs" />
                      </div>
                      <span className="text-xs text-gray-600">Weekend</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-red-100 border border-red-300 rounded flex items-center justify-center">
                        <CancelIcon className="text-red-600 text-xs" />
                      </div>
                      <span className="text-xs text-gray-600">Absent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
                        <WorkIcon className="text-gray-500 text-xs" />
                      </div>
                      <span className="text-xs text-gray-600">No Record</span>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
                    Monthly Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Present */}
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
                          <EventAvailableIcon className="text-white text-base" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-emerald-700">
                            {stats.present}
                          </p>
                          <p className="text-xs text-emerald-600 font-medium">
                            Present
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Absent */}
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-sm">
                          <EventBusyIcon className="text-white text-base" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-700">
                            {stats.absent}
                          </p>
                          <p className="text-xs text-red-600 font-medium">
                            Absent
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Hours */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm">
                          <TimerIcon className="text-white text-base" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-blue-700">
                            {stats.totalHours.hours}h {stats.totalHours.minutes}
                            m
                          </p>
                          <p className="text-xs text-blue-600 font-medium">
                            Hours
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Late */}
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                          <AlarmIcon className="text-white text-base" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-orange-700">
                            {stats.late}
                          </p>
                          <p className="text-xs text-orange-600 font-medium">
                            Late
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceCalendar;
