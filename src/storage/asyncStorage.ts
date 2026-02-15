import AsyncStorage from '@react-native-async-storage/async-storage';
import { Business, Transaction, TransactionType, BankAccount } from '@/types';
import { DEMO_MODE } from '@/constants/demoMode';
import {
  getDemoBusiness,
  getDemoBankAccounts,
  getDemoSMSSenders,
  getDemoTransactions,
} from '@/utils/demoData';

export interface SMSSenderStorage {
  id: string;
  businessId: string;
  senderName: string;
  enabled: boolean;
  createdAt: string;
}

const STORAGE_KEYS = {
  businesses: '@finance:businesses',
  transactions: '@finance:transactions',
  bankAccounts: '@finance:bankAccounts',
  smsSenders: '@finance:smsSenders',
  settings: '@finance:settings',
};

// Cache demo data to avoid regenerating on every call
let demoBusinessCache: Business | null = null;
let demoBankAccountsCache: BankAccount[] | null = null;
let demoSMSSendersCache: SMSSenderStorage[] | null = null;
let demoTransactionsCache: Transaction[] | null = null;

// Pre-generate demo data immediately when DEMO_MODE is enabled
// With only 10-14 transactions, this is fast enough to do synchronously
if (DEMO_MODE) {
  try {
    demoBusinessCache = getDemoBusiness();
    demoBankAccountsCache = getDemoBankAccounts(demoBusinessCache.id);
    demoSMSSendersCache = getDemoSMSSenders(demoBusinessCache.id);
    // Generate transactions immediately - only 12 transactions, very fast
    demoTransactionsCache = getDemoTransactions(demoBusinessCache.id, demoBankAccountsCache);
  } catch (error) {
    console.error('Error pre-generating demo data:', error);
  }
}

/**
 * AsyncStorage-based data storage
 * Replaces SQLite database
 * 
 * DEMO MODE: When DEMO_MODE is true, returns fake data instead of real data
 */

// Businesses
export const storageService = {
  // Businesses
  async getBusinesses(): Promise<Business[]> {
    if (DEMO_MODE) {
      if (!demoBusinessCache) {
        demoBusinessCache = getDemoBusiness();
      }
      return [demoBusinessCache];
    }
    
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.businesses);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting businesses:', error);
      return [];
    }
  },

  async saveBusinesses(businesses: Business[]): Promise<void> {
    if (DEMO_MODE) {
      // In demo mode, update cache but don't save to storage
      if (businesses.length > 0) {
        demoBusinessCache = businesses[0];
      }
      return;
    }
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.businesses, JSON.stringify(businesses));
    } catch (error) {
      console.error('Error saving businesses:', error);
      throw error;
    }
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    if (DEMO_MODE) {
      if (!demoTransactionsCache) {
        // Generate transactions based on demo business and accounts
        const business = await this.getBusinesses();
        if (business.length > 0) {
          const accounts = await this.getBankAccounts();
          demoTransactionsCache = getDemoTransactions(business[0].id, accounts);
        } else {
          demoTransactionsCache = [];
        }
      }
      return demoTransactionsCache;
    }
    
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.transactions);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  },

  async saveTransactions(transactions: Transaction[]): Promise<void> {
    if (DEMO_MODE) {
      // In demo mode, update cache but don't save to storage
      demoTransactionsCache = transactions;
      return;
    }
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error saving transactions:', error);
      throw error;
    }
  },

  // Bank Accounts
  async getBankAccounts(): Promise<BankAccount[]> {
    if (DEMO_MODE) {
      if (!demoBankAccountsCache) {
        const business = await this.getBusinesses();
        if (business.length > 0) {
          demoBankAccountsCache = getDemoBankAccounts(business[0].id);
        } else {
          demoBankAccountsCache = [];
        }
      }
      return demoBankAccountsCache;
    }
    
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.bankAccounts);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting bank accounts:', error);
      return [];
    }
  },

  async saveBankAccounts(accounts: BankAccount[]): Promise<void> {
    if (DEMO_MODE) {
      // In demo mode, update cache but don't save to storage
      demoBankAccountsCache = accounts;
      return;
    }
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.bankAccounts, JSON.stringify(accounts));
    } catch (error) {
      console.error('Error saving bank accounts:', error);
      throw error;
    }
  },

  // SMS Senders
  async getSMSSenders(): Promise<SMSSenderStorage[]> {
    if (DEMO_MODE) {
      if (!demoSMSSendersCache) {
        const business = await this.getBusinesses();
        if (business.length > 0) {
          demoSMSSendersCache = getDemoSMSSenders(business[0].id);
        } else {
          demoSMSSendersCache = [];
        }
      }
      return demoSMSSendersCache;
    }
    
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.smsSenders);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting SMS senders:', error);
      return [];
    }
  },

  async saveSMSSenders(senders: SMSSenderStorage[]): Promise<void> {
    if (DEMO_MODE) {
      // In demo mode, update cache but don't save to storage
      demoSMSSendersCache = senders;
      return;
    }
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.smsSenders, JSON.stringify(senders));
    } catch (error) {
      console.error('Error saving SMS senders:', error);
      throw error;
    }
  },

  // Clear all data
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },
};
