import { format, formatDistanceToNow } from 'date-fns';

export const formatters = {
  // Date formatters
  formatDate: (date: string | Date, formatString: string = 'MMM dd, yyyy') => {
    return format(new Date(date), formatString);
  },

  formatDateTime: (date: string | Date) => {
    return format(new Date(date), 'MMM dd, yyyy HH:mm');
  },

  formatRelativeTime: (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  },

  // Number formatters
  formatNumber: (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  },

  formatCurrency: (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  },

  formatPercentage: (value: number, decimals: number = 1) => {
    return `${(value * 100).toFixed(decimals)}%`;
  },

  // String formatters
  capitalize: (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  },

  truncate: (str: string, length: number = 50) => {
    return str.length > length ? `${str.slice(0, length)}...` : str;
  },

  // Status formatters
  formatStatus: (status: string) => {
    return status.replace('_', ' ').toLowerCase();
  },

  formatSeverity: (severity: string) => {
    return severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
  },
};