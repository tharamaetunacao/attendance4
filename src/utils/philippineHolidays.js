/**
 * Philippine Holidays for 2026
 * Based on official Philippine government holidays
 */
export const philippineHolidays2026 = [
  { date: '2026-01-01', name: "New Year's Day", type: 'regular' },
  { date: '2026-02-17', name: 'Chinese New Year', type: 'special' },
  { date: '2026-02-25', name: 'EDSA People Power Revolution Anniversary', type: 'special' },
  { date: '2026-04-02', name: 'Maundy Thursday', type: 'regular' },
  { date: '2026-04-03', name: 'Good Friday', type: 'regular' },
  { date: '2026-04-04', name: 'Black Saturday', type: 'special' },
  { date: '2026-04-09', name: 'Araw ng Kagitingan (Day of Valor)', type: 'regular' },
  { date: '2026-05-01', name: 'Labor Day', type: 'regular' },
  { date: '2026-06-12', name: 'Independence Day', type: 'regular' },
  { date: '2026-06-16', name: 'Eid al-Adha (Feast of Sacrifice)', type: 'regular' },
  { date: '2026-08-21', name: 'Ninoy Aquino Day', type: 'special' },
  { date: '2026-08-31', name: 'National Heroes Day', type: 'regular' },
  { date: '2026-11-01', name: 'All Saints Day', type: 'special' },
  { date: '2026-11-02', name: 'All Souls Day', type: 'special' },
  { date: '2026-11-30', name: 'Bonifacio Day', type: 'regular' },
  { date: '2026-12-08', name: 'Feast of the Immaculate Conception', type: 'special' },
  { date: '2026-12-24', name: 'Christmas Eve', type: 'special' },
  { date: '2026-12-25', name: 'Christmas Day', type: 'regular' },
  { date: '2026-12-30', name: 'Rizal Day', type: 'regular' },
  { date: '2026-12-31', name: "New Year's Eve", type: 'special' },
];

/**
 * Get holidays for a specific month and year
 */
export const getHolidaysForMonth = (year, month) => {
  // For now, only 2026 is supported
  if (year !== 2026) return [];
  
  return philippineHolidays2026.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate.getFullYear() === year && holidayDate.getMonth() === month;
  });
};

/**
 * Check if a specific date is a holiday
 */
export const isHoliday = (dateString) => {
  return philippineHolidays2026.some(holiday => holiday.date === dateString);
};

/**
 * Get holiday info for a specific date
 */
export const getHolidayInfo = (dateString) => {
  return philippineHolidays2026.find(holiday => holiday.date === dateString);
};
