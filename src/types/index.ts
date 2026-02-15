// Core entity types
export interface Business {
  id: string;
  name: string;
  description?: string;
  openingBalance?: number; // Opening balance for the business
  openingBalanceDate?: string; // Date when opening balance was set
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  id: string;
  businessId: string;
  bankName: string;
  accountNumber: string;
  openingBalance: number;
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  businessId: string;
  bankAccountId?: string; // Optional - not used with SMS tracking
  bankName?: string; // Bank name for manual transactions (from SMS senders)
  type: TransactionType;
  amount: number;
  category: string;
  description?: string;
  referenceNumber?: string;
  date: string;
  hasVAT: boolean;
  vatAmount?: number;
  reconciled?: boolean; // For bank statement reconciliation
  status?: 'cleared' | 'pending'; // Transaction status
  createdAt: string;
  updatedAt: string;
}

// CSV Import types
export interface CSVImportConfig {
  dateColumn: string;
  amountColumn: string;
  descriptionColumn?: string;
  referenceColumn?: string;
  typeColumn?: string;
  hasHeader: boolean;
}

export interface CSVTransaction {
  date: string;
  amount: number;
  description?: string;
  referenceNumber?: string;
  type: TransactionType;
}

// SMS Detection types
export interface SMSConfig {
  enabled: boolean;
  bankPatterns: BankSMSPattern[];
}

export interface BankSMSPattern {
  bankName: string;
  senderPattern: RegExp | string;
  amountPattern: RegExp;
  datePattern: RegExp;
  typePattern: RegExp;
}

export interface ParsedSMS {
  amount: number;
  type: TransactionType;
  date: string;
  description: string;
  bankName: string;
}

// Report types
export interface MonthlyReport {
  month: string;
  income: number;
  expense: number;
  profit: number;
}

export interface CategoryReport {
  category: string;
  amount: number;
  percentage: number;
  type: TransactionType;
}

export interface CashflowData {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

// Date range filter
export interface DateRange {
  startDate: string;
  endDate: string;
}

// Nepali fiscal year
export interface FiscalYear {
  year: string; // e.g., "2080-2081"
  startDate: string; // Baisakh 1
  endDate: string; // Chaitra end
}

// App settings
export interface AppSettings {
  currency: string;
  fiscalYear: FiscalYear;
  smsDetection: SMSConfig;
  theme: 'light' | 'dark' | 'auto';
}
