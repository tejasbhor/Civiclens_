export const validators = {
  // Email validation
  isEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Phone validation
  isPhone: (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  },

  // Password validation
  isPassword: (password: string): boolean => {
    return password.length >= 8;
  },

  // Required field validation
  isRequired: (value: string): boolean => {
    return value.trim().length > 0;
  },

  // Numeric validation
  isNumeric: (value: string): boolean => {
    return !isNaN(Number(value));
  },

  // URL validation
  isUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  // Latitude validation
  isLatitude: (lat: number): boolean => {
    return lat >= -90 && lat <= 90;
  },

  // Longitude validation
  isLongitude: (lng: number): boolean => {
    return lng >= -180 && lng <= 180;
  },

  // Date validation
  isValidDate: (date: string | Date): boolean => {
    const d = new Date(date);
    return d instanceof Date && !isNaN(d.getTime());
  },

  // File size validation (in bytes)
  isValidFileSize: (size: number, maxSize: number): boolean => {
    return size <= maxSize;
  },

  // File type validation
  isValidFileType: (type: string, allowedTypes: string[]): boolean => {
    return allowedTypes.includes(type);
  },
};