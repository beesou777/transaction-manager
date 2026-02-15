import { Transaction, DateRange } from '@/types';
import { storageService } from '../asyncStorage';

export class TransactionRepository {
  async getByBankAccountId(bankAccountId: string, limit?: number): Promise<Transaction[]> {
    const transactions = await storageService.getTransactions();
    let filtered = transactions.filter(t => t.bankAccountId === bankAccountId);
    filtered.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return limit ? filtered.slice(0, limit) : filtered;
  }

  async getByBusinessId(businessId: string, dateRange?: DateRange): Promise<Transaction[]> {
    const transactions = await storageService.getTransactions();
    let filtered = transactions.filter(t => t.businessId === businessId);
    
    if (dateRange) {
      filtered = filtered.filter(t => {
        const date = new Date(t.date);
        return date >= new Date(dateRange.startDate) && date <= new Date(dateRange.endDate);
      });
    }
    
    filtered.sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return filtered;
  }

  async getById(id: string): Promise<Transaction | null> {
    const transactions = await storageService.getTransactions();
    return transactions.find(t => t.id === id) || null;
  }

  async getByReferenceNumber(referenceNumber: string, bankAccountId: string): Promise<Transaction | null> {
    const transactions = await storageService.getTransactions();
    return transactions.find(t => 
      t.referenceNumber === referenceNumber && t.bankAccountId === bankAccountId
    ) || null;
  }

  async create(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const transactions = await storageService.getTransactions();
    const now = new Date().toISOString();
    const newTransaction: Transaction = {
      ...transaction,
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };
    transactions.push(newTransaction);
    await storageService.saveTransactions(transactions);
    return newTransaction;
  }

  async update(id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<Transaction> {
    const transactions = await storageService.getTransactions();
    const index = transactions.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('Transaction not found');
    }
    transactions[index] = {
      ...transactions[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await storageService.saveTransactions(transactions);
    return transactions[index];
  }

  async delete(id: string): Promise<void> {
    const transactions = await storageService.getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    await storageService.saveTransactions(filtered);
  }

  async getCategoryBreakdown(
    businessId: string,
    type: 'income' | 'expense',
    dateRange?: DateRange
  ): Promise<{ category: string; amount: number }[]> {
    const transactions = await this.getByBusinessId(businessId, dateRange);
    const filtered = transactions.filter(t => t.type === type);
    
    const breakdown = new Map<string, number>();
    filtered.forEach(t => {
      const current = breakdown.get(t.category) || 0;
      breakdown.set(t.category, current + t.amount);
    });
    
    return Array.from(breakdown.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }
}

export const transactionRepository = new TransactionRepository();
