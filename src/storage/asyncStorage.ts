import AsyncStorage from '@react-native-async-storage/async-storage';
import { Business, Transaction, TransactionType, BankAccount } from '@/types';

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

/**
 * AsyncStorage-based data storage
 * Replaces SQLite database
 */

// Businesses
export const storageService = {
  // Businesses
  async getBusinesses(): Promise<Business[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.businesses);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting businesses:', error);
      return [];
    }
  },

  async saveBusinesses(businesses: Business[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.businesses, JSON.stringify(businesses));
    } catch (error) {
      console.error('Error saving businesses:', error);
      throw error;
    }
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.transactions);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  },

  async saveTransactions(transactions: Transaction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error saving transactions:', error);
      throw error;
    }
  },

  // Bank Accounts
  async getBankAccounts(): Promise<BankAccount[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.bankAccounts);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting bank accounts:', error);
      return [];
    }
  },

  async saveBankAccounts(accounts: BankAccount[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.bankAccounts, JSON.stringify(accounts));
    } catch (error) {
      console.error('Error saving bank accounts:', error);
      throw error;
    }
  },

  // SMS Senders
  async getSMSSenders(): Promise<SMSSenderStorage[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.smsSenders);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting SMS senders:', error);
      return [];
    }
  },

  async saveSMSSenders(senders: SMSSenderStorage[]): Promise<void> {
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
