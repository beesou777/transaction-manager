import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import Papa from 'papaparse';
import { Transaction } from '@/types';
import { formatDate } from '@/utils/date';
import { formatCurrency } from '@/utils/currency';

export class ExportService {
  /**
   * Export transactions to CSV
   */
  async exportTransactionsToCSV(
    transactions: Transaction[],
    filename: string = 'transactions.csv'
  ): Promise<void> {
    const csvData = transactions.map((txn) => ({
      Date: formatDate(txn.date, 'yyyy-MM-dd'),
      Type: txn.type,
      Amount: formatCurrency(txn.amount, false),
      Category: txn.category,
      Description: txn.description || '',
      'Reference Number': txn.referenceNumber || '',
      'Has VAT': txn.hasVAT ? 'Yes' : 'No',
      'VAT Amount': txn.vatAmount ? formatCurrency(txn.vatAmount, false) : '',
    }));

    const csv = Papa.unparse(csvData);
    const fileUri = `${RNFS.DocumentDirectoryPath}/${filename}`;

    await RNFS.writeFile(fileUri, csv, 'utf8');

    await Share.open({
      url: `file://${fileUri}`,
      type: 'text/csv',
      title: 'Export Transactions',
    });
  }

  /**
   * Export financial summary to text file (PDF generation would require additional library)
   */
  async exportSummaryToText(
    summary: {
      totalIncome: number;
      totalExpense: number;
      profit: number;
      transactionCount: number;
    },
    filename: string = 'financial_summary.txt'
  ): Promise<void> {
    const content = `
Financial Summary Report
Generated: ${formatDate(new Date().toISOString())}

Total Income: ${formatCurrency(summary.totalIncome)}
Total Expense: ${formatCurrency(summary.totalExpense)}
Net Profit: ${formatCurrency(summary.profit)}
Total Transactions: ${summary.transactionCount}
    `.trim();

    const fileUri = `${RNFS.DocumentDirectoryPath}/${filename}`;
    await RNFS.writeFile(fileUri, content, 'utf8');

    await Share.open({
      url: `file://${fileUri}`,
      type: 'text/plain',
      title: 'Export Summary',
    });
  }
}

export const exportService = new ExportService();
