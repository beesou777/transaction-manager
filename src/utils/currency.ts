/**
 * Format amount as Nepali Rupees (NPR)
 */
export const formatCurrency = (amount: number, showSymbol: boolean = true): string => {
  const formatted = new Intl.NumberFormat('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  const symbol = showSymbol ? 'Rs. ' : '';
  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol}${formatted}`;
};

/**
 * Parse currency string to number
 */
export const parseCurrency = (value: string): number => {
  if (!value || value.trim() === '') return 0;
  const cleaned = value.replace(/[Rs.,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Calculate VAT (13%)
 */
export const calculateVAT = (amount: number): number => {
  return amount * 0.13;
};

/**
 * Get amount with VAT
 */
export const getAmountWithVAT = (amount: number): number => {
  return amount + calculateVAT(amount);
};
