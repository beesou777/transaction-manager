import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Papa from 'papaparse';
import { CSVTransaction, CSVImportConfig, TransactionType } from '@/types';
// Database removed - using AsyncStorage instead
import { formatDateForDB } from '@/utils/date';

export class CSVService {
  /**
   * Pick CSV file from device
   */
  async pickCSVFile(): Promise<{ uri: string; name: string; size?: number } | null> {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.csv, DocumentPicker.types.allFiles],
      });

      return {
        uri: result.uri,
        name: result.name || 'file.csv',
        size: result.size,
      };
    } catch (error) {
      console.error('Error picking CSV file:', error);
      throw error;
    }
  }

  /**
   * Read and parse CSV file
   */
  async parseCSVFile(uri: string): Promise<any[]> {
    try {
      const fileContent = await RNFS.readFile(uri, 'utf8');
      
      return new Promise((resolve, reject) => {
        Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              console.warn('CSV parsing warnings:', results.errors);
            }
            resolve(results.data);
          },
          error: (error) => {
            reject(error);
          },
        });
      });
    } catch (error) {
      console.error('Error reading CSV file:', error);
      throw error;
    }
  }

  /**
   * Detect CSV column structure
   */
  detectColumns(data: any[]): CSVImportConfig {
    if (data.length === 0) {
      throw new Error('CSV file is empty');
    }

    const firstRow = data[0];
    const columns = Object.keys(firstRow);

    // Try to detect date column
    let dateColumn = columns.find(col => 
      /date|transaction.*date|txn.*date/i.test(col)
    ) || columns[0];

    // Try to detect amount column
    let amountColumn = columns.find(col => 
      /amount|balance|value|credit|debit/i.test(col)
    ) || columns.find(col => {
      const value = firstRow[col];
      return typeof value === 'string' && /[\d,]+\.?\d*/.test(value);
    }) || columns[1];

    // Try to detect description column
    const descriptionColumn = columns.find(col => 
      /description|details|narration|remarks|note/i.test(col)
    );

    // Try to detect reference column
    const referenceColumn = columns.find(col => 
      /reference|ref|transaction.*id|txn.*id|cheque/i.test(col)
    );

    // Try to detect type column
    const typeColumn = columns.find(col => 
      /type|transaction.*type|credit.*debit/i.test(col)
    );

    return {
      dateColumn,
      amountColumn,
      descriptionColumn: descriptionColumn || undefined,
      referenceColumn: referenceColumn || undefined,
      typeColumn: typeColumn || undefined,
      hasHeader: true,
    };
  }

  /**
   * Convert CSV rows to transaction objects
   */
  convertToTransactions(
    data: any[],
    config: CSVImportConfig,
    defaultType: TransactionType = 'expense'
  ): CSVTransaction[] {
    const transactions: CSVTransaction[] = [];

    for (const row of data) {
      try {
        // Parse amount
        const amountStr = row[config.amountColumn]?.toString().replace(/[Rs.,\s]/g, '') || '0';
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount === 0) continue;

        // Parse date
        const dateStr = row[config.dateColumn];
        let date: Date;
        try {
          date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            // Try DD/MM/YYYY format
            const parts = dateStr.split(/[-\/]/);
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1;
              const year = parseInt(parts[2].length === 2 ? `20${parts[2]}` : parts[2]);
              date = new Date(year, month, day);
            } else {
              date = new Date();
            }
          }
        } catch {
          date = new Date();
        }

        // Determine type
        let type: TransactionType = defaultType;
        if (config.typeColumn && row[config.typeColumn]) {
          const typeStr = row[config.typeColumn].toString().toLowerCase();
          if (typeStr.includes('credit') || typeStr.includes('income') || typeStr.includes('deposit')) {
            type = 'income';
          } else if (typeStr.includes('debit') || typeStr.includes('expense') || typeStr.includes('withdraw')) {
            type = 'expense';
          } else if (typeStr.includes('transfer')) {
            type = 'transfer';
          }
        } else {
          // Infer from amount sign or column name
          if (config.amountColumn.toLowerCase().includes('credit') || amount < 0) {
            type = 'income';
            amount = Math.abs(amount);
          }
        }

        transactions.push({
          date: formatDateForDB(date),
          amount: Math.abs(amount),
          description: config.descriptionColumn ? row[config.descriptionColumn]?.toString() : undefined,
          referenceNumber: config.referenceColumn ? row[config.referenceColumn]?.toString() : undefined,
          type,
        });
      } catch (error) {
        console.warn('Error parsing CSV row:', error, row);
        continue;
      }
    }

    return transactions;
  }

  /**
   * Check if CSV file was already imported (duplicate detection)
   */
  async isDuplicate(fileName: string, fileHash: string): Promise<boolean> {
    // Database removed - import tracking disabled for now
    // TODO: Implement import tracking with AsyncStorage if needed
    return false; // Always allow imports for now
  }

  /**
   * Record CSV import
   */
  async recordImport(fileName: string, fileHash: string, transactionCount: number): Promise<void> {
    // Database removed - import tracking disabled for now
    // TODO: Implement import tracking with AsyncStorage if needed
    console.log(`CSV import recorded: ${fileName}, ${transactionCount} transactions`);
  }

  /**
   * Generate file hash (simple implementation)
   */
  async generateFileHash(uri: string): Promise<string> {
    const content = await RNFS.readFile(uri, 'utf8');
    // Simple hash (in production, use crypto)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

export const csvService = new CSVService();
