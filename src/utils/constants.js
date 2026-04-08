export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

export const LEAVE_TYPES = [
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal Leave' },
  { value: 'casual', label: 'Casual Leave' },
  { value: 'paid', label: 'Paid Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
];

export const LEAVE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const ATTENDANCE_STATUS = {
  ON_TIME: 'on-time',
  LATE: 'late',
  ABSENT: 'absent',
  ON_LEAVE: 'on-leave',
  HALF_DAY: 'half-day',
  CHECKED_IN: 'checked-in',
  CHECKED_OUT: 'checked-out',
  MISSING_CHECKOUT: 'missing-checkout',
};

export const LATE_THRESHOLD_MINUTES = 15;
export const WORK_START_TIME = '09:00';
export const WORK_END_TIME = '17:00';
