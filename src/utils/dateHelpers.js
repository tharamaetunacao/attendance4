/**
 * Get the local date string in YYYY-MM-DD format
 * This ensures consistent date handling across timezones
 */
export const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get attendance storage key for a specific user and date
 */
export const getAttendanceStorageKey = (userId, date = new Date()) => {
  const dateStr = typeof date === 'string' ? date : getLocalDateString(date);
  return `attendance_${userId}_${dateStr}`;
};
