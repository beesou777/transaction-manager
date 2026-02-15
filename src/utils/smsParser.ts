import { TransactionType } from '@/types';

export interface ParsedTransaction {
  amount: number;
  type: TransactionType; // 'income' or 'expense'
  date: string; // ISO date string
  description: string;
  remarks: string;
  bankName: string;
  accountNumber?: string;
  referenceNumber?: string;
  rawMessage: string;
}

/**
 * Clean bank name - remove phone numbers, codes, and make it readable
 * This function is called frequently, so we avoid console.log in production
 */
export function cleanBankName(senderName: string): string {
  // Remove phone numbers and codes
  let cleaned = senderName
    .replace(/\d{4,}/g, '') // Remove sequences of 4+ digits
    .replace(/[_-]/g, ' ') // Replace underscores and dashes with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
  
  // Common bank name mappings - order matters (more specific first)
  const bankMappings: { [key: string]: string } = {
    'LAXMI SUNRISE': 'Laxmi Bank', // Handle "Laxmi Sunrise" as Laxmi Bank
    'SUNRISE LAXMI': 'Laxmi Bank', // Handle "Sunrise Laxmi" as Laxmi Bank
    'LAXMI': 'Laxmi Bank',
    'SUNRISE': 'Sunrise Bank', // Only if LAXMI is not present
    'NIC ASIA': 'NIC Asia Bank', // More specific first
    'NICA': 'NIC Asia Bank',
    'NIBL': 'Nepal Investment Bank',
    'NABIL': 'Nabil Bank',
    'NRB': 'Nepal Rastra Bank',
    'SCB': 'Standard Chartered Bank',
    'HBL': 'Himalayan Bank',
    'KBL': 'Kumari Bank',
    'NMB': 'NMB Bank',
    'PRABHU': 'Prabhu Bank',
    'MEGA': 'Mega Bank',
    'CIVIL': 'Civil Bank',
    'MACHHAPUCHCHHRE': 'Machhapuchchhre Bank',
    'JANATA': 'Janata Bank',
  };

  // Check for bank name in cleaned string (check more specific patterns first)
  const upperCleaned = cleaned.toUpperCase();
  for (const [key, value] of Object.entries(bankMappings)) {
    if (upperCleaned.includes(key)) {
      // Special handling: if both LAXMI and SUNRISE are present, prefer LAXMI
      if (key === 'SUNRISE' && upperCleaned.includes('LAXMI')) {
        continue; // Skip SUNRISE if LAXMI is also present
      }
      return value;
    }
  }

  // If no mapping found, capitalize words
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || senderName;
}

/**
 * Check if SMS message is a transaction message (not verification codes, offers, etc.)
 */
export function isTransactionMessage(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Skip verification codes
  if (/\b(otp|verification code|verify|code is|pin is|your code|verification)\b/i.test(message)) {
    return false;
  }
  
  // Skip promotional/offer messages
  if (/\b(offer|discount|promo|special|win|prize|congratulations|avail now|limited time)\b/i.test(message)) {
    return false;
  }
  
  // Skip balance inquiry without transaction
  if (/\b(balance inquiry|current balance|available balance|account balance|balance is|as of date)\b/i.test(message) && 
      !/\b(credited|debited|deposited|withdrawn|transfer|received|paid|payment)\b/i.test(message)) {
    return false;
  }
  
  // Skip account registration/feedback messages
  if (/\b(registered accounts|thank you for your feedback|trying to make|incorrect|blocked|password)\b/i.test(message) && 
      !/\b(credited|debited|deposited|withdrawn|transfer|received|paid|payment)\b/i.test(message)) {
    return false;
  }
  
  // Must contain transaction keywords
  const hasTransactionKeywords = /\b(credited|debited|deposited|withdrawn|transfer|payment|received|paid|successful|successfully|completed)\b/i.test(message);
  
  // Must contain amount pattern (NPR, Rs, amount, etc.)
  const hasAmount = /\b(npr|rs\.?|amount|balance|nrs)\s*[\d,]+\.?\d*\b/i.test(message);
  
  return hasTransactionKeywords && hasAmount;
}

/**
 * Extract amount from message - flexible pattern matching
 */
function extractAmount(message: string): number | null {
  // Try various amount patterns - prioritize payment/transaction amounts
  const patterns = [
    /payment of\s+NPR\s*([\d,]+\.?\d*)/i, // "payment of NPR 1,000.00"
    /NPR\s*([\d,]+\.?\d*)/i, // "NPR 1,000.00"
    /Rs\.?\s*([\d,]+\.?\d*)/i, // "Rs. 1,000.00"
    /NRS\s*([\d,]+\.?\d*)/i, // "NRS 1,000.00"
    /amount[:\s]+([\d,]+\.?\d*)/i, // "amount: 1,000.00"
    /([\d,]+\.?\d*)\s*(?:NPR|Rs\.?|NRS)/i, // "1,000.00 NPR"
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      // Skip very small amounts that might be charges/fees
      if (amount > 0.01) {
        return amount;
      }
    }
  }
  return null;
}

/**
 * Extract date from message - flexible pattern matching
 * Handles DD/MM/YYYY format (common in Nepal) and MM/DD/YYYY format
 */
function extractDate(message: string): Date {
  // Try various date patterns - prioritize DD/MM/YYYY (Nepal format)
  const patterns = [
    // DD/MM/YYYY HH:mm:ss (Nepal format - e.g., "12/09/2025 19:16:07")
    {
      regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/,
      isDDMM: true,
      hasTime: true,
    },
    // DD/MM/YY (Nepal format with 2-digit year - e.g., "12/02/26")
    {
      regex: /(\d{1,2})\/(\d{1,2})\/(\d{2})(?!\d)/,
      isDDMM: true,
      hasTime: false,
    },
    // DD/MM/YYYY (Nepal format)
    {
      regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})(?!\s*\d{1,2}:\d{2})/,
      isDDMM: true,
      hasTime: false,
    },
    // MM/DD/YYYY HH:mm:ss (US format)
    {
      regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/,
      isDDMM: false,
      hasTime: true,
    },
    // MM/DD/YYYY (US format)
    {
      regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      isDDMM: false,
      hasTime: false,
    },
    // YYYY-MM-DD
    {
      regex: /(\d{4})-(\d{2})-(\d{2})/,
      isDDMM: false,
      hasTime: false,
    },
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern.regex);
    if (match) {
      let day: number, month: number, year: number;
      
      if (pattern.isDDMM) {
        // DD/MM/YYYY format
        day = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        year = parseInt(match[3]);
      } else if (match[1].length === 4) {
        // YYYY-MM-DD format
        year = parseInt(match[1]);
        month = parseInt(match[2]) - 1;
        day = parseInt(match[3]);
      } else {
        // MM/DD/YYYY format
        month = parseInt(match[1]) - 1;
        day = parseInt(match[2]);
        year = parseInt(match[3]);
      }
      
      if (year < 100) year = 2000 + year;
      
      // Validate date
      if (day < 1 || day > 31 || month < 0 || month > 11 || year < 2000 || year > 2100) {
        continue; // Invalid date, try next pattern
      }
      
      if (pattern.hasTime && match[4] && match[5] && match[6]) {
        // Has time
        const hour = parseInt(match[4]);
        const minute = parseInt(match[5]);
        const second = parseInt(match[6]);
        const date = new Date(year, month, day, hour, minute, second);
        // Validate the date object
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
          return date;
        }
      } else {
        const date = new Date(year, month, day);
        // Validate the date object
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
          return date;
        }
      }
    }
  }
  // Return null if no valid date found - caller should skip this transaction
  // Using a sentinel date that will be checked by caller
  return new Date('1970-01-01'); // Invalid sentinel date
}

/**
 * Extract transaction type from message
 */
function extractTransactionType(message: string): TransactionType | null {
  const lowerMessage = message.toLowerCase();
  
  // Credit patterns
  if (/\b(credited|deposited|received|successful.*received|transfer.*received)\b/i.test(message)) {
    return 'income';
  }
  
  // Debit patterns - include "payment" as expense
  if (/\b(debited|withdrawn|paid|sent|transfer.*sent|successful.*sent|payment of|your payment)\b/i.test(message)) {
    return 'expense';
  }
  
  // Check for "from X to Y was successful" pattern
  if (/\b(from|to).*successful/i.test(message) && /\breceived\b/i.test(message)) {
    return 'income';
  }
  
  if (/\b(from|to).*successful/i.test(message) && /\b(sent|paid|transferred)\b/i.test(message)) {
    return 'expense';
  }
  
  return null;
}

/**
 * Extract remarks/description from message
 */
function extractRemarks(message: string): string {
  // Try various remark patterns
  const patterns = [
    /Remarks?:\s*(.+?)(?:\s*[-.]|$)/i, // "Remarks: ESEWA LOAD/9810264460,166626910"
    /Note:\s*(.+?)(?:\s*[-.]|$)/i,
    /Description:\s*(.+?)(?:\s*[-.]|$)/i,
    /Details?:\s*(.+?)(?:\s*[-.]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // If no remarks pattern, try to extract meaningful text after amount/date
  // This handles "from X to Y was successful" type messages
  const fromToMatch = message.match(/(?:from|to)\s+([^,]+?)(?:\s+was\s+successful|$)/i);
  if (fromToMatch) {
    return fromToMatch[1].trim();
  }

  return '';
}

/**
 * Extract account number from message
 */
function extractAccountNumber(message: string): string | undefined {
  const patterns = [
    /#(\d+)/, // #91040001
    /account[:\s]+(\d+)/i,
    /Your\s+(\d+#+\d+|\d+)/i, // Your 060###95001
    /\b(\d{8,})\b/, // Any 8+ digit number
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

/**
 * Extract reference number from message
 */
function extractReferenceNumber(message: string, remarks?: string): string | undefined {
  // Try to extract from remarks first
  if (remarks) {
    const refPatterns = [
      /:\s*(\d{10,})/, // :1764584279556
      /\b(\d{10,})\b/, // Any 10+ digit number
    ];
    
    for (const pattern of refPatterns) {
      const match = remarks.match(pattern);
      if (match) {
        return match[1];
      }
    }
  }

  // Try to extract from full message
  const refMatch = message.match(/\b(?:ref|reference|txn|transaction)[:\s#]+(\d{10,})\b/i);
  if (refMatch) {
    return refMatch[1];
  }

  return undefined;
}

/**
 * Universal SMS parser - works for all banks
 */
export function parseSMSMessage(message: string, senderName: string): ParsedTransaction | null {
  // First check if it's a transaction message
  if (!isTransactionMessage(message)) {
    return null;
  }

  try {
    // Extract amount
    const amount = extractAmount(message);
    if (!amount || amount <= 0) {
      return null;
    }

    // Extract transaction type
    const type = extractTransactionType(message);
    if (!type) {
      return null;
    }

    // Extract date
    const transactionDate = extractDate(message);
    // Check if date is valid (not the sentinel date and not too old/future)
    const minDate = new Date('2000-01-01');
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1); // Allow up to 1 year in future
    
    if (!transactionDate || 
        transactionDate.getTime() < minDate.getTime() || 
        transactionDate.getTime() > maxDate.getTime() ||
        transactionDate.getFullYear() === 1970) {
      return null; // Skip transactions without valid dates
    }

    // Extract remarks
    const remarks = extractRemarks(message);

    // Extract account number
    const accountNumber = extractAccountNumber(message);

    // Extract reference number
    const referenceNumber = extractReferenceNumber(message, remarks);

    // Clean bank name
    const cleanBank = cleanBankName(senderName);

    // Create description
    let description = `${type === 'income' ? 'Credit' : 'Debit'} from ${cleanBank}`;
    if (remarks) {
      // If remarks contain meaningful info, use it in description
      const cleanRemarks = remarks.replace(/\d{10,}/g, '').trim(); // Remove long numbers
      if (cleanRemarks && cleanRemarks.length < 50) {
        description = cleanRemarks;
      }
    }

    return {
      amount,
      type,
      date: transactionDate.toISOString(),
      description,
      remarks,
      bankName: cleanBank,
      accountNumber,
      referenceNumber,
      rawMessage: message,
    };
  } catch (error) {
    console.error('Error parsing SMS:', error);
    return null;
  }
}
