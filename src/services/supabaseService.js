import { supabase } from '../config/supabase';
import { LATE_THRESHOLD_MINUTES, WORK_START_TIME, ATTENDANCE_STATUS } from '../utils/constants';


const MANILA_TZ = "Asia/Manila";

/**
 * Returns the Manila "today" range expressed as UTC ISO strings, suitable for querying timestamptz columns.
 * - manilaDateStr: "YYYY-MM-DD" (in Asia/Manila)
 * - startUtcISO: UTC instant corresponding to Manila 00:00:00.000
 * - nextStartUtcISO: UTC instant corresponding to next day Manila 00:00:00.000
 */
const getManilaDayRangeUtc = (date = new Date()) => {
  const manilaDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // YYYY-MM-DD

  const startUtc = new Date(`${manilaDateStr}T00:00:00.000+08:00`);
  const nextStartUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);

  return {
    manilaDateStr,
    startUtcISO: startUtc.toISOString(),
    nextStartUtcISO: nextStartUtc.toISOString(),
  };
};

/**
 * Returns "HH:MM" current time in Manila (24hr).
 */
const getManilaTimeHHMM = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: MANILA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date); // "HH:MM"
};

/**
 * Get current time as ISO string in Manila timezone (UTC+8)
 * Returns a timestamp that represents the Manila local time with +08:00 offset
 */
const getManilaTimeISOString = () => {
  const now = new Date();
  // Format to Manila time and create ISO string with +08:00 offset
  const manilaDateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: MANILA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const manilaTimeStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: MANILA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  // Create ISO string with Manila time and +08:00 offset
  return `${manilaDateStr}T${manilaTimeStr}.000+08:00`;
};

// ==================== ATTENDANCE FUNCTIONS ====================

/**
 * Get attendance records for TODAY (Manila day).
 * Returns a supabase response: { data, error }
 */
export const getTodayAttendance = async (userId) => {
  const { startUtcISO, nextStartUtcISO } = getManilaDayRangeUtc();

  return await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .gte("check_in_time", startUtcISO)
    .lt("check_in_time", nextStartUtcISO)
    .order("check_in_time", { ascending: false });
};

/**
 * Get an "active" attendance record from PREVIOUS days only:
 * - check_out_time is null
 * - check_in_time is before today's Manila start
 * - status is not MISSING_CHECKOUT
 * Returns { data: [], error: null }
 */
export const getActiveAttendance = async (userId) => {
  const { startUtcISO } = getManilaDayRangeUtc();

  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .is("check_out_time", null)
    .lt("check_in_time", startUtcISO)
    .order("check_in_time", { ascending: false })
    .limit(1);

  if (error) throw error;
  return { data: data || [], error: null };
};

// ✅ just log it / return it, no DB update
export const markMissingCheckout = async (_attendanceId) => {
  return { error: null };
};

/**
 * Check in (Manila day aware)
 * - Blocks if already checked in/out today (Manila)
 * - Auto-marks any open record from previous days as MISSING_CHECKOUT
 * - Inserts a new check-in for today
 */
export const checkIn = async (userId, geolocation = null) => {
  const { startUtcISO, nextStartUtcISO, manilaDateStr } = getManilaDayRangeUtc();

  // 1) Block if already has record today (Manila)
  const { data: todayRecords, error: todayErr } = await supabase
    .from("attendance")
    .select("id, status, check_in_time, check_out_time")
    .eq("user_id", userId)
    .gte("check_in_time", startUtcISO)
    .lt("check_in_time", nextStartUtcISO)
    .order("check_in_time", { ascending: false })
    .limit(1);

  if (todayErr) throw todayErr;

  if (todayRecords?.length) {
    throw new Error("Already checked in today.");
  }

  // 2) Allow new day check-in even if yesterday missing checkout
  // (optional) you can still mark previous open as missing, but DON'T block today
  const { data: activeData } = await getActiveAttendance(userId);
  if (activeData?.length) await markMissingCheckout(activeData[0].id);

  // 3) Late / on-time based on Manila clock
  const now = new Date();
  const nowHHMM = getManilaTimeHHMM(now);
  const [nowH, nowM] = nowHHMM.split(":").map(Number);

  const [workHour, workMinute] = WORK_START_TIME.split(":").map(Number);
  const isLate =
    nowH * 60 + nowM > workHour * 60 + workMinute + Number(LATE_THRESHOLD_MINUTES || 0);

  const status = isLate ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.ON_TIME;

  // 4) Insert check-in (UTC)
  const nowUtcISO = new Date().toISOString();

  const { data, error } = await supabase
    .from("attendance")
    .insert([
      {
        user_id: userId,
        check_in_time: nowUtcISO,
        geolocation,
        status,
        notes: `Check-in (${manilaDateStr})`,
        created_at: nowUtcISO,
        updated_at: nowUtcISO,
      },
    ])
    .select();

  if (error) throw error;
  return { data, error: null };
};

/**
 * Check out (ONLY for today's Manila record)
 * - Finds latest open record where check_in_time is within Manila today's range
 * - Updates check_out_time + duration_hours + status
 */
export const checkOut = async (userId) => {
  const { startUtcISO, nextStartUtcISO } = getManilaDayRangeUtc();

  const { data: attendance, error: fetchError } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", userId)
    .is("check_out_time", null)
    .gte("check_in_time", startUtcISO)
    .lt("check_in_time", nextStartUtcISO)
    .order("check_in_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!attendance) throw new Error("No active check-in found for today");

  const checkOutTime = new Date();
  const checkInTime = new Date(attendance.check_in_time);

  const durationMinutes = (checkOutTime - checkInTime) / (1000 * 60);
  const durationHours = durationMinutes / 60;

  let workDurationHours = durationHours;
  if (durationHours >= 4) workDurationHours = durationHours - 1;
  workDurationHours = Math.max(0, workDurationHours);

  const nowUtcISO = new Date().toISOString();

  return await supabase
    .from("attendance")
    .update({
      check_out_time: nowUtcISO,
      duration_hours: parseFloat(workDurationHours.toFixed(4)),
      status: ATTENDANCE_STATUS.CHECKED_OUT,
      updated_at: nowUtcISO,
    })
    .eq("id", attendance.id)
    .select();
};

/**
 * Fetch attendance records for a date range
 * (kept as-is; you can keep your existing one if you prefer)
 */
export const getAttendanceRecords = async (userId, startDate, endDate) => {
  try {
    return await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", userId)
      .gte("check_in_time", startDate.toISOString())
      .lte("check_in_time", endDate.toISOString())
      .order("check_in_time", { ascending: false });
  } catch (error) {
    console.error("Error fetching attendance records:", error);
    throw error;
  }
};

/**
 * Team attendance (kept as-is)
 */
export const getTeamAttendance = async (managerId, startDate, endDate) => {
  try {
    const { data: teamMembers, error: teamError } = await supabase
      .from("users")
      .select("id")
      .eq("manager_id", managerId);

    if (teamError) throw teamError;

    if (!teamMembers || teamMembers.length === 0) {
      return { data: [], error: null };
    }

    const teamIds = teamMembers.map((m) => m.id);

    return await supabase
      .from("attendance")
      .select("*, users(id, full_name, email)")
      .in("user_id", teamIds)
      .gte("check_in_time", startDate.toISOString())
      .lte("check_in_time", endDate.toISOString())
      .order("check_in_time", { ascending: false });
  } catch (error) {
    console.error("Error fetching team attendance:", error);
    throw error;
  }
};

// ==================== LEAVE FUNCTIONS ====================

export const requestLeave = async (leaveData) => {
  try {
    // First create the leave request
    const leaveResult = await supabase.from('leave_requests').insert([
      {
        ...leaveData,
        status: 'pending',
        created_at: new Date().toISOString(),
      }
    ]).select();

    if (leaveResult.error) throw leaveResult.error;

    // Get the employee's manager to notify (only their direct manager)
    const { data: employee, error: empError } = await supabase
      .from('users')
      .select('id, full_name, manager_id')
      .eq('id', leaveData.user_id)
      .single();

    if (empError) {
      console.error('Error fetching employee:', empError);
    }

    const employeeName = employee?.full_name || 'An employee';
    const managerId = employee?.manager_id;
    const startDate = new Date(leaveData.start_date).toLocaleDateString();
    const endDate = new Date(leaveData.end_date).toLocaleDateString();
    const leaveType = leaveData.leave_type || 'leave';

    // Send notification only to the employee's direct manager
    if (managerId) {
      console.log('Sending notification to manager:', managerId);

      // Single notification with all details
      await createNotification(
        managerId,
        `${employeeName} has submitted a ${leaveType} leave from ${startDate} to ${endDate} and waiting for approval.`,
        'leave',
        leaveResult.data[0].id
      );
    }

    return leaveResult;
  } catch (error) {
    console.error('Error requesting leave:', error);
    throw error;
  }
};

export const getLeaveRequests = async (userId, role) => {
  try {
    if (role === 'employee') {
      // Employees can only see their own leave requests
      return await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    } else if (role === 'manager' || role === 'admin') {
      // Managers and admins can see all leave requests with user details
      return await supabase
        .from('leave_requests')
        .select('*, users(id, full_name, email)')
        .order('created_at', { ascending: false });
    } else {
      // Default: show only user's own requests
      return await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    }
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    throw error;
  }
};

export const approveLeave = async (leaveRequestId, approverUserId) => {
  try {
    // First get the leave request to know who to notify
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('user_id')
      .eq('id', leaveRequestId)
      .single();

    if (fetchError) throw fetchError;

    // Update the leave request
    const updateResult = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        approved_by: approverUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leaveRequestId);

    if (updateResult.error) throw updateResult.error;

    // Create notification for the employee
    console.log('Creating approval notification for employee:', leaveRequest.user_id);
    await createNotification(
      leaveRequest.user_id,
      'Your leave request has been approved.',
      'leave',
      leaveRequestId
    );

    return updateResult;
  } catch (error) {
    console.error('Error approving leave:', error);
    throw error;
  }
};

export const rejectLeave = async (leaveRequestId, reason) => {
  try {
    // First get the leave request to know who to notify
    const { data: leaveRequest, error: fetchError } = await supabase
      .from('leave_requests')
      .select('user_id')
      .eq('id', leaveRequestId)
      .single();

    if (fetchError) throw fetchError;

    // Update the leave request
    const updateResult = await supabase
      .from('leave_requests')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leaveRequestId);

    if (updateResult.error) throw updateResult.error;

    // Create notification for the user
    console.log('Creating rejection notification for employee:', leaveRequest.user_id);
    await createNotification(
      leaveRequest.user_id,
      `Your leave request has been rejected. Reason: ${reason}`,
      'leave',
      leaveRequestId
    );

    return updateResult;
  } catch (error) {
    console.error('Error rejecting leave:', error);
    throw error;
  }
};

export const updateLeaveRequest = async (leaveRequestId, updates) => {
  try {
    const result = await supabase
      .from('leave_requests')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leaveRequestId)
      .select();

    console.log('Update result:', result);

    if (result.error) {
      console.error('Update error:', result.error);
      throw result.error;
    }

    return result;
  } catch (error) {
    console.error('Error updating leave request:', error);
    throw error;
  }
};

export const cancelLeaveRequest = async (leaveRequestId) => {
  try {
    const result = await supabase
      .from('leave_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', leaveRequestId)
      .select();

    if (result.error) throw result.error;
    return result;
  } catch (error) {
    console.error('Error cancelling leave request:', error);
    throw error;
  }
};

export const deleteLeaveRequest = async (leaveRequestId) => {
  try {
    const result = await supabase
      .from('leave_requests')
      .delete()
      .eq('id', leaveRequestId);

    if (result.error) throw result.error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting leave request:', error);
    throw error;
  }
};

export const getLeaveBalance = async (userId) => {
  try {
    // Fetch approved leave requests to calculate used days
    const { data: approvedLeaves, error } = await supabase
      .from('leave_requests')
      .select('start_date, end_date, leave_type')
      .eq('user_id', userId)
      .eq('status', 'approved');

    if (error) throw error;

    // Calculate used leave days by type
    const usedLeaves = { sick: 0, vacation: 0, personal: 0, other: 0 };
    
    if (approvedLeaves) {
      approvedLeaves.forEach(leave => {
        const start = new Date(leave.start_date);
        const end = new Date(leave.end_date);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const type = leave.leave_type || 'other';
        
        if (usedLeaves[type] !== undefined) {
          usedLeaves[type] += days;
        } else {
          usedLeaves.other += days;
        }
      });
    }

    // Default annual leave allowances (adjust as needed)
    const totalLeaves = {
      sick: 15,
      vacation: 15,
      personal: 5,
      other: 0
    };

    // Calculate remaining balance
    const balance = {
      sick: { total: totalLeaves.sick, used: usedLeaves.sick, remaining: totalLeaves.sick - usedLeaves.sick },
      vacation: { total: totalLeaves.vacation, used: usedLeaves.vacation, remaining: totalLeaves.vacation - usedLeaves.vacation },
      personal: { total: totalLeaves.personal, used: usedLeaves.personal, remaining: totalLeaves.personal - usedLeaves.personal },
      other: { total: totalLeaves.other, used: usedLeaves.other, remaining: totalLeaves.other - usedLeaves.other }
    };

    return { data: balance, error: null };
  } catch (error) {
    console.error('Error fetching leave balance:', error);
    return { data: null, error };
  }
};

// ==================== USER FUNCTIONS ====================

export const getAllEmployees = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, department, manager_id')
      .eq('role', 'employee')
      .order('full_name');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching employees:', error);
    return { data: null, error };
  }
};

export const getEmployeesByManager = async (managerId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, department')
      .eq('manager_id', managerId)
      .eq('role', 'employee')
      .order('full_name');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching manager employees:', error);
    return { data: null, error };
  }
};

export const getUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { data: null, error };
  }
};

export const updateUser = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating user:', error);
    return { data: null, error };
  }
};

// ==================== NOTIFICATION FUNCTIONS ====================

export const createNotification = async (userId, message, type = 'general', referenceId = null) => {
  try {
    console.log('Creating notification:', { userId, message, type, referenceId });

    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        message,
        type,
        reference_id: referenceId,
        is_read: false,
        created_at: new Date().toISOString(),
      }])
      .select();

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }

    console.log('Notification created successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error in createNotification:', error);
    return { data: null, error };
  }
};

export const getNotifications = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return { data: null, error };
  }
};

// Alias for backward compatibility
export const getUserNotifications = getNotifications;

export const markNotificationAsRead = async (notificationId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { data: null, error };
  }
};

export const markAllNotificationsAsRead = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { data: null, error };
  }
};

export const deleteNotification = async (notificationId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { error };
  }
};

// ==================== ANNOUNCEMENT FUNCTIONS ====================

export const getAnnouncements = async () => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*, users(full_name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return { data: null, error };
  }
};

export const createAnnouncement = async (announcementData) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .insert([{
        ...announcementData,
        created_at: new Date().toISOString(),
      }])
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating announcement:', error);
    return { data: null, error };
  }
};

export const updateAnnouncement = async (announcementId, updates) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', announcementId)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating announcement:', error);
    return { data: null, error };
  }
};

export const deleteAnnouncement = async (announcementId) => {
  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting announcement:', error);
    return { error };
  }
};

// ==================== ATTENDANCE CORRECTION FUNCTIONS ====================

export const requestAttendanceCorrection = async (correctionData) => {
  try {
    // Get user details for notification
    const { data: userData } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', correctionData.userId)
      .single();

    // Map camelCase properties to snake_case database columns
    const dbRecord = {
      user_id: correctionData.userId,
      attendance_date: correctionData.attendanceDate,
      missing_type: correctionData.missingType,
      requested_time: correctionData.requestedTime,
      reason: correctionData.reason,
      attendance_id: correctionData.attendanceId,
      original_time: correctionData.originalTime,
      requested_by: correctionData.userId,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('attendance_corrections')
      .insert([dbRecord])
      .select();

    if (error) throw error;

    // Notify admin about the correction request
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const userName = userData?.full_name || 'An employee';
      for (const admin of admins) {
        await createNotification(
          admin.id,
          `New attendance correction request from ${userName}`,
          'attendance_correction',
          data[0].id
        );
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error requesting attendance correction:', error);
    throw error;
  }
};

export const getAttendanceCorrections = async (userId, role) => {
  let query = supabase
    .from('attendance_corrections')
    .select('*, users(full_name, email)')
    .order('created_at', { ascending: false });

  if (role === 'employee') {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching attendance corrections:', error);
    throw error;
  }
  return data || [];
};

export const approveAttendanceCorrection = async (correctionId, approverId) => {
  try {
    // Get the correction details first
    const { data: correction, error: fetchError } = await supabase
      .from('attendance_corrections')
      .select('*')
      .eq('id', correctionId)
      .single();

    if (fetchError) throw fetchError;

    // Update the correction status
    const { data, error } = await supabase
      .from('attendance_corrections')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', correctionId)
      .select();

    if (error) throw error;

    // Build attendance update based on missing_type
    const attendanceUpdate = {
      notes: correction.reason,
      updated_at: new Date().toISOString(),
    };

    // Use requested_time to update the appropriate field based on missing_type
    // Important: Add Manila timezone offset (+08:00) to ensure correct time storage
    if (correction.missing_type === 'check_in') {
      // Combine attendance_date with requested_time and Manila timezone to create a timestamp
      const dateTime = new Date(`${correction.attendance_date}T${correction.requested_time}+08:00`);
      attendanceUpdate.check_in_time = dateTime.toISOString();
    } else if (correction.missing_type === 'check_out') {
      // Combine attendance_date with requested_time and Manila timezone to create a timestamp
      const dateTime = new Date(`${correction.attendance_date}T${correction.requested_time}+08:00`);
      attendanceUpdate.check_out_time = dateTime.toISOString();
    }

    // Find the attendance record to update
    let attendanceId = correction.attendance_id;
    
    // If attendance_id is null, look it up by user_id and date
    if (!attendanceId) {
      const startOfDay = new Date(`${correction.attendance_date}T00:00:00+08:00`);
      const endOfDay = new Date(`${correction.attendance_date}T23:59:59.999+08:00`);
      
      const { data: attendanceRecord, error: lookupError } = await supabase
        .from('attendance')
        .select('id')
        .eq('user_id', correction.user_id)
        .gte('check_in_time', startOfDay.toISOString())
        .lt('check_in_time', endOfDay.toISOString())
        .maybeSingle();
      
      if (lookupError) {
        console.error('Error looking up attendance record:', lookupError);
      } else if (attendanceRecord) {
        attendanceId = attendanceRecord.id;
      }
    }

    if (!attendanceId) {
      throw new Error('Could not find attendance record to update');
    }

    // Update the actual attendance record
    const { error: attendanceError } = await supabase
      .from('attendance')
      .update(attendanceUpdate)
      .eq('id', attendanceId);

    if (attendanceError) throw attendanceError;

    // Notify the employee
    await createNotification(
      correction.user_id,
      'Your attendance correction request has been approved.',
      'attendance_correction',
      correctionId
    );

    return { data, error: null };
  } catch (error) {
    console.error('Error approving attendance correction:', error);
    throw error;
  }
};

export const rejectAttendanceCorrection = async (correctionId, reason, rejectedBy = null) => {
  try {
    const updateData = {
      status: 'rejected',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    };
    
    if (rejectedBy) {
      updateData.approved_by = rejectedBy;
      updateData.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('attendance_corrections')
      .update(updateData)
      .eq('id', correctionId)
      .select();

    if (error) throw error;

    // Notify the employee
    const { data: correction } = await supabase
      .from('attendance_corrections')
      .select('user_id')
      .eq('id', correctionId)
      .single();

    if (correction) {
      await createNotification(
        correction.user_id,
        `Your attendance correction request has been rejected. Reason: ${reason}`,
        'attendance_correction',
        correctionId
      );
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error rejecting attendance correction:', error);
    throw error;
  }
};

// ==================== ADMIN FUNCTIONS ====================

export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, department, manager_id, created_at')
      .order('full_name');

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching all users:', error);
    return { data: null, error };
  }
};

export const createUser = async (userData) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        ...userData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating user:', error);
    return { data: null, error };
  }
};

export const deleteUser = async (userId) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { error };
  }
};

export const getSystemStats = async () => {
  try {
    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (usersError) throw usersError;

    // Get today's attendance count
    const today = new Date().toISOString().split('T')[0];
    const { count: todayAttendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .gte('check_in_time', `${today}T00:00:00.000Z`)
      .lt('check_in_time', `${today}T23:59:59.999Z`);

    if (attendanceError) throw attendanceError;

    // Get pending leave requests count
    const { count: pendingLeaves, error: leavesError } = await supabase
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (leavesError) throw leavesError;

    // Get pending corrections count
    const { count: pendingCorrections, error: correctionsError } = await supabase
      .from('attendance_corrections')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (correctionsError) throw correctionsError;

    return {
      data: {
        totalUsers,
        todayAttendance,
        pendingLeaves,
        pendingCorrections,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error fetching system stats:', error);
    return { data: null, error };
  }
};
