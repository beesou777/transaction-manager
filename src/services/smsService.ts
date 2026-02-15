import { Platform } from 'react-native';
import { ParsedSMS, BankSMSPattern, TransactionType } from '@/types';

/**
 * Default SMS patterns for common Nepali banks
 */
export const DEFAULT_BANK_PATTERNS: BankSMSPattern[] = [
  {
    bankName: 'Nepal Investment Bank',
    senderPattern: /NIBL/i,
    amountPattern: /Rs\.?\s*([\d,]+\.?\d*)/i,
    datePattern: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    typePattern: /(credited|debited|withdrawn|deposited)/i,
  },
  {
    bankName: 'Nepal Rastra Bank',
    senderPattern: /NRB/i,
    amountPattern: /Rs\.?\s*([\d,]+\.?\d*)/i,
    datePattern: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    typePattern: /(credited|debited|withdrawn|deposited)/i,
  },
  {
    bankName: 'Nabil Bank',
    senderPattern: /NABIL/i,
    amountPattern: /Rs\.?\s*([\d,]+\.?\d*)/i,
    datePattern: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    typePattern: /(credited|debited|withdrawn|deposited)/i,
  },
  {
    bankName: 'Standard Chartered',
    senderPattern: /SCB/i,
    amountPattern: /Rs\.?\s*([\d,]+\.?\d*)/i,
    datePattern: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    typePattern: /(credited|debited|withdrawn|deposited)/i,
  },
  // Generic pattern as fallback
  {
    bankName: 'Generic Bank',
    senderPattern: /BANK/i,
    amountPattern: /Rs\.?\s*([\d,]+\.?\d*)/i,
    datePattern: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
    typePattern: /(credited|debited|withdrawn|deposited)/i,
  },
];

export class SMSService {
  private patterns: BankSMSPattern[] = DEFAULT_BANK_PATTERNS;

  /**
   * Check if SMS permissions are available (Android only)
   */
  async isAvailable(): Promise<boolean> {
    return Platform.OS === 'android';
  }

  /**
   * Parse SMS message to extract transaction details
   */
  parseSMS(message: string, sender?: string): ParsedSMS | null {
    for (const pattern of this.patterns) {
      // Check if sender matches
      if (sender) {
        const senderMatch = typeof pattern.senderPattern === 'string'
          ? sender.includes(pattern.senderPattern)
          : pattern.senderPattern.test(sender);
        if (!senderMatch) continue;
      }

      // Extract amount
      const amountMatch = message.match(pattern.amountPattern);
      if (!amountMatch) continue;

      // Extract date
      const dateMatch = message.match(pattern.datePattern);
      if (!dateMatch) continue;

      // Determine transaction type
      const typeMatch = message.match(pattern.typePattern);
      const typeStr = typeMatch ? typeMatch[1].toLowerCase() : '';
      let type: TransactionType = 'expense';
      if (typeStr.includes('credit') || typeStr.includes('deposit')) {
        type = 'income';
      } else if (typeStr.includes('debit') || typeStr.includes('withdraw')) {
        type = 'expense';
      }

      // Parse amount (remove commas)
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));

      // Parse date (assume DD/MM/YYYY or DD-MM-YYYY format)
      const dateParts = dateMatch[1].split(/[-\/]/);
      let date: Date;
      if (dateParts.length === 3) {
        const day = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // JS months are 0-indexed
        const year = parseInt(dateParts[2].length === 2 ? `20${dateParts[2]}` : dateParts[2]);
        date = new Date(year, month, day);
      } else {
        date = new Date(); // Fallback to today
      }

      return {
        amount,
        type,
        date: date.toISOString(),
        description: message.substring(0, 100), // First 100 chars
        bankName: pattern.bankName,
      };
    }

    return null;
  }

  /**
   * Set custom bank patterns
   */
  setPatterns(patterns: BankSMSPattern[]): void {
    this.patterns = patterns;
  }

  /**
   * Add a new bank pattern
   */
  addPattern(pattern: BankSMSPattern): void {
    this.patterns.push(pattern);
  }
}

export const smsService = new SMSService();
