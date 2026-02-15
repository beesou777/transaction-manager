import { Business, Transaction, BankAccount, TransactionType } from '@/types';
import { SMSSenderStorage } from '@/storage/asyncStorage';
import { SMSMessage } from '@/store/smsStore';

/**
 * Demo Data Generator
 * Creates realistic fake data for demo purposes
 */

// Helper to generate dates
const getDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

const getDateWithTime = (daysAgo: number, hours: number = 12): number => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, Math.floor(Math.random() * 60), 0, 0);
  return date.getTime();
};

// Demo Business
export const getDemoBusiness = (): Business => ({
  id: 'demo_business_001',
  name: 'Shrestha Trading Company',
  description: 'Wholesale and retail trading business',
  openingBalance: 500000,
  openingBalanceDate: getDate(120), // 4 months ago
  createdAt: getDate(120),
  updatedAt: getDate(1),
});

// Demo Bank Accounts
export const getDemoBankAccounts = (businessId: string): BankAccount[] => {
  const baseDate = getDate(120);
  return [
    {
      id: 'demo_account_001',
      businessId,
      bankName: 'NIC ASIA Bank',
      accountNumber: '1234567890123',
      openingBalance: 500000,
      currentBalance: 1250000,
      createdAt: baseDate,
      updatedAt: getDate(1),
    },
    {
      id: 'demo_account_002',
      businessId,
      bankName: 'Laxmi Sunrise Bank',
      accountNumber: '9876543210987',
      openingBalance: 200000,
      currentBalance: 450000,
      createdAt: getDate(90),
      updatedAt: getDate(1),
    },
    {
      id: 'demo_account_003',
      businessId,
      bankName: 'Nabil Bank',
      accountNumber: '5555555555555',
      openingBalance: 100000,
      currentBalance: 180000,
      createdAt: getDate(60),
      updatedAt: getDate(1),
    },
  ];
};

// Demo SMS Senders
export const getDemoSMSSenders = (businessId: string): SMSSenderStorage[] => {
  const baseDate = getDate(100);
  return [
    {
      id: 'demo_sender_001',
      businessId,
      senderName: 'NICAS',
      enabled: true,
      createdAt: baseDate,
    },
    {
      id: 'demo_sender_002',
      businessId,
      senderName: 'LaxmiAlert',
      enabled: true,
      createdAt: getDate(80),
    },
    {
      id: 'demo_sender_003',
      businessId,
      senderName: 'NABIL',
      enabled: true,
      createdAt: getDate(60),
    },
  ];
};

// Demo Transactions - 5-6 transactions per bank (15-18 total)
export const getDemoTransactions = (businessId: string, accounts: BankAccount[]): Transaction[] => {
  const transactions: Transaction[] = [];
  const categories = {
    income: ['Sales', 'Service Revenue', 'Consulting'],
    expense: ['Rent', 'Utilities', 'Salary'],
  };

  const bankNames = ['NIC ASIA Bank', 'Laxmi Sunrise Bank', 'Nabil Bank'];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  // Generate 5-6 transactions per bank (2-3 income, 2-3 expense)
  bankNames.forEach((bankName, bankIndex) => {
    const account = accounts[bankIndex % accounts.length];
    
    // 2-3 Income transactions per bank
    for (let i = 0; i < 3; i++) {
      const daysAgo = (bankIndex * 10) + (i * 3); // Spread over days
      const date = new Date(now - daysAgo * oneDay).toISOString();
      const amount = 50000 + (i * 15000); // 50k, 65k, 80k
      const category = categories.income[i % categories.income.length];
      
      transactions.push({
        id: `demo_txn_${bankIndex}_income_${i}`,
        businessId,
        bankAccountId: account.id,
        bankName,
        type: 'income',
        amount,
        category,
        description: `${category} - Payment received`,
        referenceNumber: `REF${bankIndex}${1000 + i}`,
        date,
        hasVAT: i % 2 === 0,
        vatAmount: i % 2 === 0 ? Math.floor(amount * 0.13) : undefined,
        reconciled: true,
        status: 'cleared',
        createdAt: date,
        updatedAt: date,
      });
    }
    
    // 2-3 Expense transactions per bank
    for (let i = 0; i < 3; i++) {
      const daysAgo = (bankIndex * 10) + (i * 3) + 1; // Offset by 1 day
      const date = new Date(now - daysAgo * oneDay).toISOString();
      const amount = 10000 + (i * 8000); // 10k, 18k, 26k
      const category = categories.expense[i % categories.expense.length];
      
      transactions.push({
        id: `demo_txn_${bankIndex}_expense_${i}`,
        businessId,
        bankAccountId: account.id,
        bankName,
        type: 'expense',
        amount,
        category,
        description: `${category} - Payment made`,
        referenceNumber: `REF${bankIndex}${2000 + i}`,
        date,
        hasVAT: i % 3 === 0,
        vatAmount: i % 3 === 0 ? Math.floor(amount * 0.13) : undefined,
        reconciled: true,
        status: 'cleared',
        createdAt: date,
        updatedAt: date,
      });
    }
  });

  // Sort by date (newest first)
  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Demo SMS Messages - Matching the transactions
export const getDemoSMSMessages = (senderName: string): SMSMessage[] => {
  const messages: SMSMessage[] = [];
  const senderMap: { [key: string]: string } = {
    'NICAS': 'NIC ASIA Bank',
    'LaxmiAlert': 'Laxmi Sunrise Bank',
    'NABIL': 'Nabil Bank',
  };

  const bankName = senderMap[senderName] || 'Bank';

  // Generate exactly 6 SMS messages per sender (5-6 transactions per bank)
  const count = 6;
  
  // Helper to format date as DD/MM/YYYY
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Get bank index for consistent amounts
  const bankIndex = senderName === 'NICAS' ? 0 : senderName === 'LaxmiAlert' ? 1 : 2;
  const baseAmounts = [50000, 65000, 80000, 10000, 18000, 26000]; // 3 income, 3 expense amounts

  for (let i = 0; i < count; i++) {
    const daysAgo = (bankIndex * 10) + (i * 3); // Spread over days
    const isCredit = i < 3; // First 3 are credits, last 3 are debits
    const amount = baseAmounts[i];
    const date = getDateWithTime(daysAgo, 9 + (i % 10));
    const dateStr = formatDate(date);
    
    let message = '';
    if (senderName === 'NICAS') {
      message = isCredit
        ? `NIC ASIA: A/c 1234567890123 credited with Rs. ${amount.toLocaleString()}.00 on ${dateStr}. Avl Bal: Rs. ${(1000000 + amount).toLocaleString()}.00`
        : `NIC ASIA: A/c 1234567890123 debited with Rs. ${amount.toLocaleString()}.00 on ${dateStr}. Avl Bal: Rs. ${(1000000 - amount).toLocaleString()}.00`;
    } else if (senderName === 'LaxmiAlert') {
      message = isCredit
        ? `Laxmi Sunrise Bank: Your A/c 9876543210987 credited Rs. ${amount.toLocaleString()} on ${dateStr}. Balance: Rs. ${(500000 + amount).toLocaleString()}`
        : `Laxmi Sunrise Bank: Your A/c 9876543210987 debited Rs. ${amount.toLocaleString()} on ${dateStr}. Balance: Rs. ${(500000 - amount).toLocaleString()}`;
    } else if (senderName === 'NABIL') {
      message = isCredit
        ? `NABIL: A/c 5555555555555 credited Rs. ${amount.toLocaleString()}.00 on ${dateStr}. Available: Rs. ${(200000 + amount).toLocaleString()}.00`
        : `NABIL: A/c 5555555555555 debited Rs. ${amount.toLocaleString()}.00 on ${dateStr}. Available: Rs. ${(200000 - amount).toLocaleString()}.00`;
    }

    messages.push({
      _id: `demo_sms_${bankIndex}_${i}`,
      address: senderName,
      body: message,
      date: date,
    });
  }

  // Sort by date (newest first)
  return messages.sort((a, b) => b.date - a.date);
};

// Demo Available Senders (for SMS screen)
export const getDemoAvailableSenders = (): string[] => {
  return ['NICAS', 'LaxmiAlert', 'NABIL'];
};
