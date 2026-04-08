export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validatePhoneNumber = (phone) => {
  const re = /^[0-9\-\+]{10,}$/;
  return re.test(phone.replace(/\s/g, ''));
};

export const validateDateRange = (startDate, endDate) => {
  return new Date(startDate) <= new Date(endDate);
};

export const validateNotEmpty = (value) => {
  return value && value.trim() !== '';
};
