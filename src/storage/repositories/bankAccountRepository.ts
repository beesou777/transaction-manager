import { BankAccount } from '@/types';
import { storageService } from '../asyncStorage';

export class BankAccountRepository {
  async getByBusinessId(businessId: string): Promise<BankAccount[]> {
    const accounts = await storageService.getBankAccounts();
    return accounts.filter(a => a.businessId === businessId);
  }

  async getById(id: string): Promise<BankAccount | null> {
    const accounts = await storageService.getBankAccounts();
    return accounts.find(a => a.id === id) || null;
  }

  async create(account: Omit<BankAccount, 'id' | 'currentBalance' | 'createdAt' | 'updatedAt'>): Promise<BankAccount> {
    const accounts = await storageService.getBankAccounts();
    const now = new Date().toISOString();
    const newAccount: BankAccount = {
      ...account,
      id: `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      currentBalance: account.openingBalance,
      createdAt: now,
      updatedAt: now,
    };
    accounts.push(newAccount);
    await storageService.saveBankAccounts(accounts);
    return newAccount;
  }

  async update(id: string, updates: Partial<Omit<BankAccount, 'id' | 'createdAt'>>): Promise<BankAccount> {
    const accounts = await storageService.getBankAccounts();
    const index = accounts.findIndex(a => a.id === id);
    if (index === -1) {
      throw new Error('Bank account not found');
    }
    accounts[index] = {
      ...accounts[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await storageService.saveBankAccounts(accounts);
    return accounts[index];
  }

  async delete(id: string): Promise<void> {
    const accounts = await storageService.getBankAccounts();
    const filtered = accounts.filter(a => a.id !== id);
    await storageService.saveBankAccounts(filtered);
  }

  async updateBalance(id: string, balance: number): Promise<void> {
    const accounts = await storageService.getBankAccounts();
    const index = accounts.findIndex(a => a.id === id);
    if (index === -1) {
      throw new Error('Bank account not found');
    }
    accounts[index].currentBalance = balance;
    accounts[index].updatedAt = new Date().toISOString();
    await storageService.saveBankAccounts(accounts);
  }
}

export const bankAccountRepository = new BankAccountRepository();
