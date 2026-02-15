import { Transaction, TransactionType } from '@/types';
import { transactionRepository } from '@/storage/repositories/transactionRepository';
import { bankAccountRepository } from '@/storage/repositories/bankAccountRepository';
import { calculateVAT } from '@/utils/currency';

export class TransactionService {
  /**
   * Create transaction and update bank account balance
   */
  async createTransaction(
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Transaction> {
    // Check for duplicate by reference number
    if (transaction.referenceNumber) {
      const existing = await transactionRepository.getByReferenceNumber(
        transaction.referenceNumber,
        transaction.bankAccountId
      );
      if (existing) {
        throw new Error('Transaction with this reference number already exists');
      }
    }

    // Calculate VAT if applicable
    let vatAmount: number | undefined;
    if (transaction.hasVAT) {
      vatAmount = calculateVAT(transaction.amount);
    }

    // Create transaction
    const created = await transactionRepository.create({
      ...transaction,
      vatAmount,
    });

    // Update bank account balance
    await this.recalculateBalance(transaction.bankAccountId);

    return created;
  }

  /**
   * Update transaction and recalculate balance
   */
  async updateTransaction(
    id: string,
    updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>
  ): Promise<Transaction> {
    const existing = await transactionRepository.getById(id);
    if (!existing) {
      throw new Error('Transaction not found');
    }

    // Calculate VAT if applicable
    if (updates.hasVAT !== undefined || updates.amount !== undefined) {
      const amount = updates.amount ?? existing.amount;
      const hasVAT = updates.hasVAT ?? existing.hasVAT;
      if (hasVAT) {
        updates.vatAmount = calculateVAT(amount);
      } else {
        updates.vatAmount = undefined;
      }
    }

    const updated = await transactionRepository.update(id, updates);

    // Recalculate balance for affected account
    await this.recalculateBalance(existing.bankAccountId);

    return updated;
  }

  /**
   * Delete transaction and recalculate balance
   */
  async deleteTransaction(id: string): Promise<void> {
    const transaction = await transactionRepository.getById(id);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const bankAccountId = transaction.bankAccountId;
    await transactionRepository.delete(id);
    await this.recalculateBalance(bankAccountId);
  }

  /**
   * Recalculate bank account balance based on all transactions
   */
  async recalculateBalance(bankAccountId: string): Promise<void> {
    const account = await bankAccountRepository.getById(bankAccountId);
    if (!account) {
      throw new Error('Bank account not found');
    }

    const transactions = await transactionRepository.getByBankAccountId(bankAccountId);
    let balance = account.openingBalance;

    for (const txn of transactions) {
      if (txn.type === 'income') {
        balance += txn.amount;
      } else if (txn.type === 'expense') {
        balance -= txn.amount;
      } else if (txn.type === 'transfer') {
        // Transfer logic: could be positive or negative depending on direction
        // For now, we'll treat it as expense (outgoing)
        balance -= txn.amount;
      }
    }

    await bankAccountRepository.updateBalance(bankAccountId, balance);
  }

  /**
   * Check if transaction is duplicate
   */
  async isDuplicate(referenceNumber: string, bankAccountId: string): Promise<boolean> {
    const existing = await transactionRepository.getByReferenceNumber(referenceNumber, bankAccountId);
    return existing !== null;
  }
}

export const transactionService = new TransactionService();
