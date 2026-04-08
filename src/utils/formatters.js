import { format, parseISO } from 'date-fns';

export const formatTime = (isoString) => {
  if (!isoString) return '-';
  return format(parseISO(isoString), 'hh:mm a');
};

export const formatDate = (isoString) => {
  if (!isoString) return '-';
  return format(parseISO(isoString), 'MMM dd, yyyy');
};

export const formatDateTime = (isoString) => {
  if (!isoString) return '-';
  return format(parseISO(isoString), 'MMM dd, yyyy hh:mm a');
};

export const formatDuration = (hours) => {
  if (hours === null || hours === undefined) return '0h 0m';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

export const calculateHours = (checkInTime, checkOutTime) => {
  if (!checkInTime || !checkOutTime) return 0;
  const inTime = new Date(checkInTime);
  const outTime = new Date(checkOutTime);
  return (outTime - inTime) / (1000 * 60 * 60);
};

export const getStatusColor = (status) => {
  const statusColors = {
    'on-time': 'bg-green-100 text-green-800',
    'late': 'bg-yellow-100 text-yellow-800',
    'absent': 'bg-red-100 text-red-800',
    'on-leave': 'bg-blue-100 text-blue-800',
    'half-day': 'bg-orange-100 text-orange-800',
    'checked-in': 'bg-green-100 text-green-800',
    'checked-out': 'bg-gray-100 text-gray-800',
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

export const getStatusBadgeClass = (status) => {
  return `px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(status)}`;
};
