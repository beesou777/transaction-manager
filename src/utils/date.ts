import { format, parse, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

/**
 * Format date for display
 */
export const formatDate = (date: string | Date, formatStr: string = 'MMM dd, yyyy'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr);
};

/**
 * Format date for database (ISO string)
 */
export const formatDateForDB = (date: Date): string => {
  return date.toISOString();
};

/**
 * Parse date from string
 */
export const parseDate = (dateString: string): Date => {
  return parse(dateString, 'yyyy-MM-dd', new Date());
};

/**
 * Get start and end of month
 */
export const getMonthRange = (date: Date): { start: Date; end: Date } => {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
};

/**
 * Get start and end of year
 */
export const getYearRange = (date: Date): { start: Date; end: Date } => {
  return {
    start: startOfYear(date),
    end: endOfYear(date),
  };
};

/**
 * Nepali Fiscal Year (Baisakh to Chaitra)
 * Baisakh starts around mid-April (April 14-15)
 */
export const getNepaliFiscalYear = (date: Date = new Date()): { year: string; start: Date; end: Date } => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // If date is before April 14, fiscal year is previous year to current year
  // Otherwise, fiscal year is current year to next year
  let fiscalStartYear: number;
  if (month < 3 || (month === 3 && day < 14)) {
    fiscalStartYear = year - 1;
  } else {
    fiscalStartYear = year;
  }

  const fiscalEndYear = fiscalStartYear + 1;
  const start = new Date(fiscalStartYear, 3, 14); // April 14
  const end = new Date(fiscalEndYear, 3, 13); // April 13 next year

  // Convert to Nepali year (2080 = 2023 + 57)
  const nepaliStartYear = fiscalStartYear + 57;
  const nepaliEndYear = fiscalEndYear + 57;

  return {
    year: `${nepaliStartYear}-${nepaliEndYear}`,
    start,
    end,
  };
};

/**
 * Check if date is within fiscal year
 */
export const isWithinFiscalYear = (date: Date, fiscalYear: { start: Date; end: Date }): boolean => {
  return date >= fiscalYear.start && date <= fiscalYear.end;
};
