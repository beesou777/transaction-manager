import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { useBusinessStore } from '@/store/businessStore';
import { useTransactionStore } from '@/store/transactionStore';
import { Transaction } from '@/types';
import { useSMSStore } from '@/store/smsStore';
import { ParsedTransaction } from '@/utils/smsParser';
import { Card } from '@/components/Card';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { Button } from '@/components/Button';
import { DateRangePicker } from '@/components/DateRangePicker';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useColorScheme } from 'react-native';
import * as FileSystem from 'react-native-fs';
import Share from 'react-native-share';
import { cleanBankName } from '@/utils/smsParser';

type BusinessDetailRouteProp = RouteProp<{ params: { id: string } }, 'params'>;

type CombinedTransaction = {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  description: string;
  bankName?: string;
  remarks?: string;
  referenceNumber?: string;
  accountNumber?: string;
  category?: string;
  isManual: boolean;
};

export default function BusinessDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<BusinessDetailRouteProp>();
  const { id } = route.params;
  const { businesses, selectBusiness } = useBusinessStore();
  const { transactions, loadTransactions } = useTransactionStore();
  const { senders, loadSenders, parsedTransactions, allParsedTransactions, loadAllMessages, setSelectedSender, selectedSender, isLoading } = useSMSStore();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const business = businesses.find((b) => b.id === id);

  // Get enabled senders as banks - memoize to prevent unnecessary re-renders
  const enabledBanks = useMemo(() => 
    senders.filter(s => s.enabled).map(s => s.senderName),
    [senders]
  );
  const enabledBanksKey = useMemo(() => 
    enabledBanks.sort().join(','),
    [enabledBanks]
  );

  useEffect(() => {
    if (id) {
      loadTransactions(id);
      loadSenders(id);
      const biz = businesses.find((b) => b.id === id);
      if (biz) selectBusiness(biz);
    }
  }, [id, businesses]);

  // Load all messages when senders are loaded - use stable key to prevent loops
  useEffect(() => {
    if (enabledBanks.length > 0 && id) {
      loadAllMessages(enabledBanks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledBanksKey, id]);

  // Don't set default date range - show all transactions by default
  // User can set date range if needed

  const handleBankChange = (bankName: string) => {
    setSelectedBank(bankName);
    if (bankName === 'all') {
      setSelectedSender(null);
    } else {
      setSelectedSender(bankName);
    }
  };

  // First, filter parsed transactions to only include those from this business's banks
  // Create a set of cleaned bank names for this business (with variations)
  const businessBanksSet = new Set<string>();
  senders
    .filter(s => s.businessId === id && s.enabled)
    .forEach(s => {
      const cleaned = cleanBankName(s.senderName).toLowerCase();
      businessBanksSet.add(cleaned);
      // Also add variations for better matching
      const words = cleaned.split(' ');
      if (words.length > 1) {
        businessBanksSet.add(words[0]); // Add first word (e.g., "laxmi" from "laxmi bank")
        // For "Laxmi Bank", also add "laxmi" for matching
        if (words[0] === 'laxmi' || words[0] === 'sunrise') {
          businessBanksSet.add('laxmi bank'); // Normalize to "laxmi bank"
        }
      }
    });

  // Filter parsed transactions to only include those from this business's banks
  const businessParsedTransactions = allParsedTransactions.filter(tx => {
    if (businessBanksSet.size === 0) return false;
    const txBankNameLower = tx.bankName.toLowerCase();
    
    // Check exact match first
    if (businessBanksSet.has(txBankNameLower)) return true;
    
    // Normalize transaction bank name for matching
    // "Laxmi Sunrise" or "Laxmi Bank" should match "laxmi bank"
    let normalizedTxBank = txBankNameLower;
    if (normalizedTxBank.includes('laxmi') || normalizedTxBank.includes('sunrise')) {
      normalizedTxBank = 'laxmi bank';
    }
    if (businessBanksSet.has(normalizedTxBank)) return true;
    
    // Check if transaction bank name contains any of the business bank names
    for (const bankName of businessBanksSet) {
      if (txBankNameLower.includes(bankName) || bankName.includes(txBankNameLower)) {
        return true;
      }
      // Also check normalized versions
      if (normalizedTxBank.includes(bankName) || bankName.includes(normalizedTxBank)) {
        return true;
      }
    }
    return false;
  });

  // Combine parsed transactions and manual transactions
  // Use Set to deduplicate by creating unique keys
  const transactionMap = new Map<string, CombinedTransaction>();
  
  // Add parsed transactions with unique IDs (only from this business)
  businessParsedTransactions.forEach((tx, index) => {
    // Create unique ID using hash of message + date + index
    const uniqueKey = `parsed_${tx.bankName}_${tx.date}_${tx.amount}_${index}_${tx.rawMessage.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '')}`;
    if (!transactionMap.has(uniqueKey)) {
      transactionMap.set(uniqueKey, {
        id: uniqueKey,
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        description: tx.description,
        bankName: tx.bankName,
        remarks: tx.remarks,
        referenceNumber: tx.referenceNumber,
        accountNumber: tx.accountNumber,
        isManual: false,
      });
    }
  });
  
  // Add manual transactions
  transactions
    .filter((t) => t.businessId === id)
    .forEach((tx) => {
      transactionMap.set(tx.id, {
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        description: tx.description || tx.category,
        category: tx.category,
        bankName: tx.bankName,
        isManual: true,
      });
    });
  
  const allTransactions = Array.from(transactionMap.values());

  // Filter by bank if selected
  let bankFilteredTransactions = allTransactions;
  if (selectedBank !== 'all') {
    const selectedBankCleaned = cleanBankName(selectedBank).toLowerCase();
    bankFilteredTransactions = allTransactions.filter((tx) => {
      if (tx.isManual) {
        // For manual transactions, show if they match the selected bank or have no bank
        if (!tx.bankName) return true;
        return cleanBankName(tx.bankName).toLowerCase() === selectedBankCleaned;
      }
      // For parsed transactions, compare cleaned bank names (case-insensitive)
      return tx.bankName && tx.bankName.toLowerCase() === selectedBankCleaned;
    });
  }

  // Filter by date range - only filter if dates are set
  // Also filter out transactions with invalid dates (today's date when it shouldn't be)
  const filteredTransactions = bankFilteredTransactions.filter((tx) => {
    // Skip transactions with invalid dates (parsing failed - shows today's date)
    const txDate = new Date(tx.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const txDateOnly = new Date(txDate);
    txDateOnly.setHours(0, 0, 0, 0);
    
    // If date is today and it's a parsed transaction, it might be invalid
    // Only skip if it's clearly a parsing error (date is exactly today at midnight)
    // For now, show all transactions and let date range filter handle it
    
    // Apply date range filter if dates are set
    if (startDate || endDate) {
      const txDateStr = txDate.toISOString().split('T')[0];
      if (startDate && txDateStr < startDate) return false;
      if (endDate && txDateStr > endDate) return false;
    }
    
    return true;
  });

  // Sort by date (newest first)
  filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = filteredTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleExport = async () => {
    try {
      const data = filteredTransactions.map((tx) => ({
        Date: formatDate(tx.date),
        Type: tx.type === 'income' ? 'Credit' : 'Debit',
        Amount: tx.amount.toFixed(2),
        Bank: tx.bankName || 'Manual',
        Category: tx.category || '',
        Remarks: tx.remarks || '',
        Description: tx.description || '',
        Reference: tx.referenceNumber || '',
        Account: tx.accountNumber || '',
      }));

      const csvHeader = 'Date,Type,Amount,Bank,Category,Remarks,Description,Reference,Account\n';
      const csvRows = data.map((row) =>
        Object.values(row)
          .map((val) => `"${String(val).replace(/"/g, '""')}"`)
          .join(',')
      );
      const csvContent = csvHeader + csvRows.join('\n');

      const fileName = `${business?.name || 'transactions'}_${selectedBank === 'all' ? 'all' : selectedBank}_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${FileSystem.DocumentDirectoryPath}/${fileName}`;

      await FileSystem.writeFile(filePath, csvContent, 'utf8');

      await Share.open({
        title: 'Export Transactions',
        message: 'Export transactions as CSV',
        url: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
        type: 'text/csv',
        filename: fileName,
      });

      Alert.alert('Success', 'Transactions exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export transactions');
    }
  };

  const renderTransaction = ({ item }: { item: CombinedTransaction }) => (
    <Card style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.transactionTypeContainer}>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: item.type === 'income' ? colors.income + '20' : colors.expense + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.typeText,
                {
                  color: item.type === 'income' ? colors.income : colors.expense,
                },
              ]}
            >
              {item.type === 'income' ? 'Credit' : 'Debit'}
            </Text>
          </View>
          <CurrencyDisplay
            amount={item.amount}
            size="medium"
            color={item.type === 'income' ? colors.income : colors.expense}
          />
        </View>
        <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
          {formatDateTime(item.date)}
        </Text>
      </View>
      <View style={styles.transactionDetails}>
        {item.bankName && (
          <Text style={[styles.bankName, { color: colors.text }]}>{item.bankName}</Text>
        )}
        {item.category && (
          <Text style={[styles.category, { color: colors.textSecondary }]}>Category: {item.category}</Text>
        )}
        <Text style={[styles.description, { color: colors.text }]}>{item.description}</Text>
        {item.remarks && (
          <Text style={[styles.remarks, { color: colors.textSecondary }]}>Remarks: {item.remarks}</Text>
        )}
        {item.referenceNumber && (
          <Text style={[styles.reference, { color: colors.textSecondary }]}>
            Ref: {item.referenceNumber}
          </Text>
        )}
        {item.accountNumber && (
          <Text style={[styles.account, { color: colors.textSecondary }]}>
            Account: {item.accountNumber}
          </Text>
        )}
      </View>
    </Card>
  );

  if (!business) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>Business not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={[styles.businessName, { color: colors.text }]}>{business.name}</Text>
          {business.description && (
            <Text style={[styles.businessDesc, { color: colors.textSecondary }]}>
              {business.description}
            </Text>
          )}
        </View>

        <Card style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Net Balance</Text>
          <CurrencyDisplay amount={totalBalance} size="large" />
        </Card>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Income</Text>
            <CurrencyDisplay amount={totalIncome} size="medium" color={colors.income} />
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Expense</Text>
            <CurrencyDisplay amount={totalExpense} size="medium" color={colors.expense} />
          </Card>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text>
            <View style={styles.headerActions}>
              {enabledBanks.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    loadAllMessages(enabledBanks);
                  }} 
                  style={styles.refreshButton}
                  disabled={isLoading}
                >
                  <Text style={[styles.exportText, { color: colors.primary, opacity: isLoading ? 0.5 : 1 }]}>
                    🔄 {isLoading ? 'Loading...' : 'Refresh'}
                  </Text>
                </TouchableOpacity>
              )}
              {filteredTransactions.length > 0 && (
                <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
                  <Text style={[styles.exportText, { color: colors.primary }]}>📥 Export</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {enabledBanks.length > 0 && (
            <Card style={styles.bankSelectorCard}>
              <Text style={[styles.selectorLabel, { color: colors.textSecondary, marginBottom: Spacing.sm }]}>
                Filter by Bank:
              </Text>
              <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Picker
                  selectedValue={selectedBank}
                  onValueChange={handleBankChange}
                  style={[styles.picker, { color: colors.text }]}
                  dropdownIconColor={colors.text}
                >
                  <Picker.Item label="All Banks" value="all" />
                  {enabledBanks.map((bank) => (
                    <Picker.Item key={bank} label={cleanBankName(bank)} value={bank} />
                  ))}
                </Picker>
              </View>
            </Card>
          )}

          <Card style={styles.dateFilterCard}>
            <Text style={[styles.selectorLabel, { color: colors.textSecondary, marginBottom: Spacing.sm }]}>
              Date Range:
            </Text>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </Card>

          {isLoading ? (
            <Card style={styles.loadingCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading transactions...
              </Text>
            </Card>
          ) : filteredTransactions.length > 0 ? (
            <View style={styles.transactionsContainer}>
              <Text style={[styles.transactionsCount, { color: colors.textSecondary }]}>
                {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
                {startDate && endDate && ` (${formatDate(startDate)} - ${formatDate(endDate)})`}
                {selectedBank !== 'all' && ` • ${cleanBankName(selectedBank)}`}
              </Text>
              <FlatList
                data={filteredTransactions}
                renderItem={renderTransaction}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          ) : (
            <Card>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No transactions found
                {selectedBank !== 'all' && ` from ${cleanBankName(selectedBank)}`}
                {startDate && endDate && ` between ${formatDate(startDate)} and ${formatDate(endDate)}`}
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>

      <View style={styles.fabContainer}>
        <Button
          title="📱 Manage Banks"
          onPress={() => {
            // @ts-ignore - navigation type issue
            navigation.navigate('SMSSenders', { id });
          }}
          fullWidth
          style={styles.smsButton}
        />
        <Button
          title="+ Add Transaction"
          onPress={() => {
            // @ts-ignore - navigation type issue
            navigation.navigate('NewTransaction', { businessId: id });
          }}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: Spacing.md,
  },
  businessName: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  businessDesc: {
    ...Typography.body,
  },
  balanceCard: {
    margin: Spacing.md,
    alignItems: 'center',
  },
  balanceLabel: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    marginHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  statLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  section: {
    padding: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  bankSelectorCard: {
    marginBottom: Spacing.md,
  },
  selectorLabel: {
    ...Typography.bodySmall,
  },
  pickerContainer: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: Spacing.sm,
  },
  picker: {
    height: 50,
  },
  dateFilterCard: {
    marginBottom: Spacing.md,
  },
  transactionsContainer: {
    marginTop: Spacing.md,
  },
  transactionsCount: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  transactionCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  transactionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 4,
  },
  typeText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  transactionDate: {
    ...Typography.caption,
  },
  transactionDetails: {
    marginTop: Spacing.xs,
  },
  bankName: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  category: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
  },
  description: {
    ...Typography.body,
    marginTop: Spacing.xs,
  },
  remarks: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
  },
  reference: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  account: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  loadingCard: {
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    ...Typography.bodySmall,
    marginTop: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
    padding: Spacing.md,
  },
  fabContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  smsButton: {
    marginBottom: Spacing.sm,
  },
  error: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  exportButton: {
    padding: Spacing.xs,
  },
  exportText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  refreshButton: {
    padding: Spacing.xs,
  },
});
