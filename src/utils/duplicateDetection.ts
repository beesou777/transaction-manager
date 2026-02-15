import { Transaction } from '@/types';
import { ParsedTransaction } from './smsParser';

/**
 * Check if a manual transaction is a duplicate of a parsed SMS transaction
 * Matches by: same date (±1 day), same amount (±1 NPR), same bank, same type
 */
export function isDuplicateTransaction(
  manualTx: Transaction,
  parsedTx: ParsedTransaction
): boolean {
  // Must be same type
  if (manualTx.type !== parsedTx.type) {
    return false;
  }

  // Must be same bank (case-insensitive)
  if (manualTx.bankName && parsedTx.bankName) {
    const manualBank = manualTx.bankName.toLowerCase().trim();
    const parsedBank = parsedTx.bankName.toLowerCase().trim();
    if (manualBank !== parsedBank) {
      return false;
    }
  } else if (manualTx.bankName || parsedTx.bankName) {
    // One has bank, other doesn't - not a duplicate
    return false;
  }

  // Amount must match within 1 NPR tolerance (for rounding differences)
  const amountDiff = Math.abs(manualTx.amount - parsedTx.amount);
  if (amountDiff > 1) {
    return false;
  }

  // Date must match within ±1 day (SMS might arrive next day)
  const manualDate = new Date(manualTx.date);
  const parsedDate = new Date(parsedTx.date);
  const dateDiff = Math.abs(manualDate.getTime() - parsedDate.getTime());
  const oneDayInMs = 24 * 60 * 60 * 1000;
  
  if (dateDiff > oneDayInMs) {
    return false;
  }

  // All checks passed - likely duplicate
  return true;
}

/**
 * Check if two parsed transactions are duplicates
 */
export function areParsedTransactionsDuplicate(
  tx1: ParsedTransaction,
  tx2: ParsedTransaction
): boolean {
  if (tx1.type !== tx2.type) return false;
  if (tx1.bankName.toLowerCase() !== tx2.bankName.toLowerCase()) return false;
  
  const amountDiff = Math.abs(tx1.amount - tx2.amount);
  if (amountDiff > 1) return false;
  
  const dateDiff = Math.abs(new Date(tx1.date).getTime() - new Date(tx2.date).getTime());
  const oneDayInMs = 24 * 60 * 60 * 1000;
  if (dateDiff > oneDayInMs) return false;
  
  return true;
}

/**
 * Find duplicate transactions in a list
 * Returns a map of transaction IDs to their duplicate IDs
 */
export function findDuplicates(
  manualTransactions: Transaction[],
  parsedTransactions: ParsedTransaction[]
): Map<string, string[]> {
  const duplicates = new Map<string, string[]>();
  
  manualTransactions.forEach((manualTx) => {
    const duplicateParsed = parsedTransactions.filter((parsedTx) =>
      isDuplicateTransaction(manualTx, parsedTx)
    );
    
    if (duplicateParsed.length > 0) {
      // Store the parsed transaction info as potential duplicates
      const duplicateIds = duplicateParsed.map((tx) => 
        `parsed_${tx.bankName}_${tx.date}_${tx.amount}`
      );
      duplicates.set(manualTx.id, duplicateIds);
    }
  });
  
  return duplicates;
}
