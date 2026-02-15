import { create } from 'zustand';
import { BankAccount } from '@/types';
import { bankAccountRepository } from '@/storage/repositories/bankAccountRepository';

interface BankAccountState {
  accounts: BankAccount[];
  selectedAccount: BankAccount | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadAccounts: (businessId: string) => Promise<void>;
  createAccount: (account: Omit<BankAccount, 'id' | 'currentBalance' | 'createdAt' | 'updatedAt'>) => Promise<BankAccount>;
  updateAccount: (id: string, updates: Partial<Omit<BankAccount, 'id' | 'createdAt'>>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  selectAccount: (account: BankAccount | null) => void;
  refreshAccount: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useBankAccountStore = create<BankAccountState>((set, get) => ({
  accounts: [],
  selectedAccount: null,
  isLoading: false,
  error: null,

  loadAccounts: async (businessId) => {
    set({ isLoading: true, error: null });
    try {
      const accounts = await bankAccountRepository.getByBusinessId(businessId);
      set({ accounts, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createAccount: async (account) => {
    set({ isLoading: true, error: null });
    try {
      const created = await bankAccountRepository.create(account);
      set((state) => ({
        accounts: [created, ...state.accounts],
        isLoading: false,
      }));
      return created;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateAccount: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await bankAccountRepository.update(id, updates);
      set((state) => ({
        accounts: state.accounts.map((a) => (a.id === id ? updated : a)),
        selectedAccount: state.selectedAccount?.id === id ? updated : state.selectedAccount,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteAccount: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await bankAccountRepository.delete(id);
      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id),
        selectedAccount: state.selectedAccount?.id === id ? null : state.selectedAccount,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  selectAccount: (account) => {
    set({ selectedAccount: account });
  },

  refreshAccount: async (id) => {
    try {
      const account = await bankAccountRepository.getById(id);
      if (account) {
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? account : a)),
          selectedAccount: state.selectedAccount?.id === id ? account : state.selectedAccount,
        }));
      }
    } catch (error) {
      console.error('Error refreshing account:', error);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
