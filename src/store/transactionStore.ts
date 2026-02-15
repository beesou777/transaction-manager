import { create } from 'zustand';
import { Transaction, DateRange } from '@/types';
import { storageService } from '@/storage/asyncStorage';
import { calculateVAT } from '@/utils/currency';

interface TransactionState {
  transactions: Transaction[];
  selectedTransaction: Transaction | null;
  isLoading: boolean;
  error: string | null;
  dateRange: DateRange | null;

  // Actions
  loadTransactions: (businessId?: string) => Promise<void>;
  createTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'bankAccountId'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  selectTransaction: (transaction: Transaction | null) => void;
  setDateRange: (range: DateRange | null) => void;
  clearError: () => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  selectedTransaction: null,
  isLoading: false,
  error: null,
  dateRange: null,

  loadTransactions: async (businessId) => {
    set({ isLoading: true, error: null });
    try {
      const allTransactions = await storageService.getTransactions();
      const filtered = businessId
        ? allTransactions.filter((t) => t.businessId === businessId)
        : allTransactions;
      set({ transactions: filtered, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createTransaction: async (transaction) => {
    set({ isLoading: true, error: null });
    try {
      const id = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Calculate VAT if applicable
      let vatAmount: number | undefined;
      if (transaction.hasVAT) {
        vatAmount = calculateVAT(transaction.amount);
      }

      const newTransaction: Transaction = {
        id,
        ...transaction,
        vatAmount,
        createdAt: now,
        updatedAt: now,
      };

      const transactions = await storageService.getTransactions();
      transactions.push(newTransaction);
      await storageService.saveTransactions(transactions);

      set((state) => ({
        transactions: [newTransaction, ...state.transactions],
        isLoading: false,
      }));
      return newTransaction;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateTransaction: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const transactions = await storageService.getTransactions();
      const index = transactions.findIndex((t) => t.id === id);
      if (index === -1) throw new Error('Transaction not found');

      // Calculate VAT if applicable
      if (updates.hasVAT !== undefined || updates.amount !== undefined) {
        const amount = updates.amount ?? transactions[index].amount;
        const hasVAT = updates.hasVAT ?? transactions[index].hasVAT;
        if (hasVAT) {
          updates.vatAmount = calculateVAT(amount);
        } else {
          updates.vatAmount = undefined;
        }
      }

      transactions[index] = {
        ...transactions[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await storageService.saveTransactions(transactions);

      set((state) => ({
        transactions: state.transactions.map((t) => (t.id === id ? transactions[index] : t)),
        selectedTransaction: state.selectedTransaction?.id === id ? transactions[index] : state.selectedTransaction,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteTransaction: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const transactions = await storageService.getTransactions();
      const filtered = transactions.filter((t) => t.id !== id);
      await storageService.saveTransactions(filtered);

      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
        selectedTransaction: state.selectedTransaction?.id === id ? null : state.selectedTransaction,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  selectTransaction: (transaction) => {
    set({ selectedTransaction: transaction });
  },

  setDateRange: (range) => {
    set({ dateRange: range });
  },

  clearError: () => {
    set({ error: null });
  },
}));
