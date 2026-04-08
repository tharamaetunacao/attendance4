import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../config/supabase";
import { checkIn, checkOut } from "../../services/supabaseService";
import { useAuthStore } from "../../stores/authStore";

const MANILA_TZ = "Asia/Manila";
const LATE_THRESHOLD_HOUR = 9;

// Manila date key: "YYYY-MM-DD"
const manilaDateKey = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

// Convert a Manila "YYYY-MM-DD" day to UTC ISO range for timestamptz queries
const manilaDayRangeUtcFromKey = (key) => {
  const startUtc = new Date(`${key}T00:00:00.000+08:00`);
  const endUtc = new Date(`${key}T23:59:59.999+08:00`);
  return { startUtcISO: startUtc.toISOString(), endUtcISO: endUtc.toISOString() };
};

// Add days to a "YYYY-MM-DD" key (in a timezone-safe way)
const addDaysKey = (key, days) => {
  // parse as Manila midnight (+08:00) then add days
  const d = new Date(`${key}T00:00:00.000+08:00`);
  d.setDate(d.getDate() + days);
  return manilaDateKey(d);
};

// Manila day-of-week from a Date
const manilaDayOfWeek = (date = new Date()) =>
  Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: MANILA_TZ,
      weekday: "short",
    })
      .format(date)
      .slice(0, 3)
    // not used directly; we'll compute via parts below
  );

// Better: compute Manila weekday index (0=Sun..6=Sat) using formatToParts
const manilaWeekdayIndex = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: MANILA_TZ,
    weekday: "short",
  }).formatToParts(date);

  const w = parts.find((p) => p.type === "weekday")?.value; // e.g. "Mon"
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[w] ?? 0;
};

// Manila hour for a given timestamp
const manilaHour = (dateInput) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: MANILA_TZ,
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date(dateInput));
  return Number(parts.find((p) => p.type === "hour")?.value ?? 0);
};

export const useEmployeeData = (user, userProfile) => {
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  const [todayAttendance, setTodayAttendance] = useState(null);
  const [weeklyAttendance, setWeeklyAttendance] = useState([]);
  const [monthlyAttendance, setMonthlyAttendance] = useState([]);

  const [announcements, setAnnouncements] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [creatorRoles, setCreatorRoles] = useState({});

  const [stats, setStats] = useState({
    daysPresent: 0,
    lateCount: 0,
    monthlyHours: 0,
    monthlyDaysPresent: 0,
    monthlyLateCount: 0,
    monthlyLeaveCount: 0,
  });
  const getManilaNow = () =>
    new Date(new Date().toLocaleString("en-US", { timeZone: MANILA_TZ }));

  const manilaDateKey = (date = new Date()) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: MANILA_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date); // YYYY-MM-DD

  const manilaDayRangeUtc = (dateKey) => {
    const startUtcISO = new Date(`${dateKey}T00:00:00.000+08:00`).toISOString();
    const endUtcISO = new Date(`${dateKey}T23:59:59.999+08:00`).toISOString();
    return { startUtcISO, endUtcISO };
  };

  const getRanges = useCallback(() => {
    const nowMnl = getManilaNow();

    // today
    const todayKey = manilaDateKey(nowMnl);
    const { startUtcISO: utcTodayStart, endUtcISO: utcTodayEnd } =
      manilaDayRangeUtc(todayKey);

    // monday (Manila)
    const day = nowMnl.getDay(); // 0=Sun
    const mondayMnl = new Date(nowMnl);
    mondayMnl.setDate(nowMnl.getDate() - day + (day === 0 ? -6 : 1));

    const mondayKey = manilaDateKey(mondayMnl);
    const { startUtcISO: utcWeekStart } = manilaDayRangeUtc(mondayKey);
    const utcWeekEnd = utcTodayEnd;

    // month
    const monthStartMnl = new Date(nowMnl.getFullYear(), nowMnl.getMonth(), 1);
    const monthEndMnl = new Date(nowMnl.getFullYear(), nowMnl.getMonth() + 1, 0);

    const monthStartKey = manilaDateKey(monthStartMnl);
    const monthEndKey = manilaDateKey(monthEndMnl);

    const { startUtcISO: utcMonthStart } = manilaDayRangeUtc(monthStartKey);
    const { endUtcISO: utcMonthEnd } = manilaDayRangeUtc(monthEndKey);

    return {
      utcTodayStart,
      utcTodayEnd,
      utcWeekStart,
      utcWeekEnd,
      utcMonthStart,
      utcMonthEnd,
      monthStartKey,
      monthEndKey,
    };
  }, []);


  const fetchAttendanceData = useCallback(async () => {
    if (!user?.id) return null;

    // 1) TODAY
    const { utcTodayStart, utcTodayEnd, utcWeekStart, utcWeekEnd, utcMonthStart, utcMonthEnd, monthStartKey, monthEndKey } = getRanges();

    // ✅ TODAY
    const { data: todayData } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .gte("check_in_time", utcTodayStart)
      .lte("check_in_time", utcTodayEnd)
      .order("check_in_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    setTodayAttendance(todayData || null);

    // ✅ WEEK (do NOT append anything!)
    const { data: weekData, error: weekErr } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .gte("check_in_time", utcWeekStart)
      .lte("check_in_time", utcWeekEnd)
      .order("check_in_time", { ascending: false });

    if (weekErr) console.log("weekErr", weekErr);
    setWeeklyAttendance(weekData || []);

    // ✅ MONTH
    const { data: monthData } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .gte("check_in_time", utcMonthStart)
      .lte("check_in_time", utcMonthEnd)
      .order("check_in_time", { ascending: false });

    setMonthlyAttendance(monthData || []);


    // 2) Old open record (do NOT update DB to missing-checkout; UI-only)
    const { data: openOld, error: openOldErr } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .is("check_out_time", null)
      .lt("check_in_time", utcTodayStart)
      .order("check_in_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    // If you want, you can show a toast somewhere else using openOld, but don't write invalid status.


    // 5) Leave (DATE keys)
    const { data: leaveData, error: leaveErr } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .gte("start_date", monthStartKey)
      .lte("end_date", monthEndKey);

    if (leaveErr) console.log("leave error:", leaveErr);

    return { todayData, weekData, monthData, leaveData, monthStartKey, monthEndKey };
  }, [user?.id, getRanges]);

  const fetchAnnouncementsAndNotifications = useCallback(async () => {
    if (!user?.id) return;

    // Announcements
    let announcementQuery = supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (userProfile?.role === "employee") {
      const managerId = userProfile?.manager_id;
      if (managerId) {
        announcementQuery = announcementQuery.or(
          `target_role.eq.all,and(target_role.eq.team,manager_id.eq.${managerId})`
        );
      } else {
        announcementQuery = announcementQuery.eq("target_role", "all");
      }
    } else if (userProfile?.role === "manager") {
      announcementQuery = announcementQuery.or(
        `target_role.eq.all,target_role.eq.team,manager_id.eq.${user.id}`
      );
    }

    const { data: announcementData, error: annErr } = await announcementQuery;
    if (annErr) console.log("announcement error:", annErr);

    const now = new Date();
    const validAnnouncements = (announcementData || []).filter(
      (a) => !a.expires_at || new Date(a.expires_at) > now
    );
    setAnnouncements(validAnnouncements);

    // creators
    const creatorIds = new Set(validAnnouncements.map((a) => a.created_by).filter(Boolean));

    // Notifications
    const { data: notificationData, error: notifErr } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (notifErr) console.log("notifications error:", notifErr);

    const announcementNotifications =
      notificationData?.filter((n) => n.type === "announcement" && n.reference_id) || [];

    const announcementIds = [...new Set(announcementNotifications.map((n) => n.reference_id))];

    const announcementCreatorMap = {};
    const announcementPriorityMap = {};

    // Fetch creator info only for announcements
    if (announcementIds.length > 0) {
      const { data: meta, error: metaErr } = await supabase
        .from("announcements")
        .select("id, created_by, priority")
        .in("id", announcementIds);

      if (!metaErr) {
        (meta || []).forEach((a) => {
          announcementCreatorMap[a.id] = a.created_by;
          announcementPriorityMap[a.id] = a.priority || "normal";
          if (a.created_by) creatorIds.add(a.created_by);
        });
      } else {
        console.log("announcement meta error:", metaErr);
      }
    }

    const uniqueCreatorIds = [...creatorIds];
    if (uniqueCreatorIds.length > 0) {
      const { data: users, error: usersErr } = await supabase
        .from("users")
        .select("id, full_name, role")
        .in("id", uniqueCreatorIds);

      if (usersErr) console.log("creator roles error:", usersErr);

      const roleMap = {};
      users?.forEach((u) => (roleMap[u.id] = u));
      setCreatorRoles(roleMap);
    } else {
      setCreatorRoles({});
    }

    // Build activities from announcements and notifications only
    const allActivities = [];

    // Add announcements
    validAnnouncements.forEach((ann) => {
      allActivities.push({
        id: `ann-${ann.id}`,
        type: "announcement",
        title: ann.title || "New Announcement",
        content: ann.content,
        created_at: ann.created_at,
        priority: ann.priority || "normal",
        created_by: ann.created_by,
      });
    });

    // Add notifications
    (notificationData || []).forEach((notif) => {
      const type = notif.type || "other";
      let priority = "normal";
      let title = (notif.message?.split(":")?.[0] || "Notification").trim();

      const created_by =
        type === "announcement" ? announcementCreatorMap[notif.reference_id] : null;

      if (type === "leave") {
        priority = "low";
        title = notif.message?.toLowerCase().includes("approved")
          ? "Leave Approved"
          : notif.message?.toLowerCase().includes("rejected")
            ? "Leave Rejected"
            : "Leave Update";
      } else if (type === "correction") {
        priority = "normal";
        title = "Attendance Correction";
      } else if (type === "announcement") {
        priority = announcementPriorityMap[notif.reference_id] || "normal";
        title = title || "New announcement";
      } else {
        priority = "low";
      }

      allActivities.push({
        id: `notif-${notif.id}`,
        type,
        title,
        content: notif.message,
        created_at: notif.created_at,
        priority,
        created_by,
        reference_id: notif.reference_id,
      });
    });

    // Sort by date and take most recent
    setRecentActivities(
      allActivities
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
    );
  }, [user?.id, userProfile]);

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const result = await fetchAttendanceData();
      await fetchAnnouncementsAndNotifications();

      let leaveCount = 0;
      const leaveData = result?.leaveData;

      if (leaveData && leaveData.length > 0) {
        const currentMonthKey = manilaDateKey(new Date()).slice(0, 7); // "YYYY-MM"
        
        leaveData.forEach((leave) => {
          // Parse dates with Manila timezone to ensure correct day counting
          const startDate = new Date(`${leave.start_date}T00:00:00+08:00`);
          const endDate = new Date(`${leave.end_date}T23:59:59+08:00`);

          const cursor = new Date(startDate);

          while (cursor <= endDate) {
            // count only days within current Manila month
            const cursorKey = manilaDateKey(cursor);
            if (cursorKey.slice(0, 7) === currentMonthKey) leaveCount++;
            cursor.setDate(cursor.getDate() + 1);
          }
        });
      }

      setStats((prev) => ({ ...prev, monthlyLeaveCount: leaveCount }));
    } catch (e) {
      console.error("Error fetching dashboard data:", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchAttendanceData, fetchAnnouncementsAndNotifications]);

  const handleCheckIn = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const result = await checkIn(user.id);
      if (result?.error) throw result.error;

      // ✅ optimistic: immediately set todayAttendance so button updates
      const inserted = Array.isArray(result.data) ? result.data[0] : result.data;
      if (inserted) setTodayAttendance(inserted);

      await fetchDashboardData();
      return { success: true };
    } catch (error) {
      await fetchDashboardData();
      return { error: error.message || "Failed to check in" };
    } finally {
      setAttendanceLoading(false);
    }
  }, [user?.id, fetchDashboardData]);

  const handleCheckOut = useCallback(async () => {
    setAttendanceLoading(true);
    try {
      const result = await checkOut(user.id);
      if (result?.error) throw result.error;

      const updated = Array.isArray(result.data) ? result.data[0] : result.data;
      if (updated) setTodayAttendance(updated);

      await fetchDashboardData();
      return { success: true };
    } catch (error) {
      await fetchDashboardData();
      return { error: error.message || "Failed to check out" };
    } finally {
      setAttendanceLoading(false);
    }
  }, [user?.id, fetchDashboardData]);

  // Stats update (compute lateness using Manila hour)
  useEffect(() => {
    const daysPresent = weeklyAttendance.filter(
      (att) => att.check_in_time && att.status !== "absent"
    ).length;

    const lateCount = weeklyAttendance.filter((att) => {
      if (!att.check_in_time) return false;
      return manilaHour(att.check_in_time) > LATE_THRESHOLD_HOUR;
    }).length;

    const monthlyHours = monthlyAttendance.reduce((total, att) => {
      // Use existing duration_hours if available, otherwise calculate from check_in/check_out
      let hours = att.duration_hours;
      if ((hours === null || hours === undefined) && att.check_in_time && att.check_out_time) {
        const checkIn = new Date(att.check_in_time);
        const checkOut = new Date(att.check_out_time);
        hours = (checkOut - checkIn) / (1000 * 60 * 60); // Convert milliseconds to hours
      }
      return total + (hours || 0);
    }, 0);

    const monthlyDaysPresent = monthlyAttendance.filter(
      (att) => att.check_in_time && att.status !== "absent"
    ).length;

    const monthlyLateCount = monthlyAttendance.filter((att) => {
      if (!att.check_in_time) return false;
      return manilaHour(att.check_in_time) > LATE_THRESHOLD_HOUR;
    }).length;

    setStats((prev) => ({
      ...prev,
      daysPresent,
      lateCount,
      monthlyHours,
      monthlyDaysPresent,
      monthlyLateCount,
    }));
  }, [weeklyAttendance, monthlyAttendance]);

  // Initial load
  useEffect(() => {
    if (!user?.id) return;

    if (userProfile) {
      fetchDashboardData();
      return;
    }

    const loadProfile = async () => {
      const { data: profileData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        useAuthStore.getState().setUserProfile(profileData);
      }
      fetchDashboardData();
    };

    loadProfile();
  }, [user?.id, userProfile, fetchDashboardData]);

  return {
    loading,
    attendanceLoading,
    todayAttendance,
    weeklyAttendance,
    monthlyAttendance,
    announcements,
    recentActivities,
    creatorRoles,
    stats,
    fetchDashboardData,
    handleCheckIn,
    handleCheckOut,
  };
};

export default useEmployeeData;
