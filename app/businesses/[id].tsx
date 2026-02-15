import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Alert, Platform, InteractionManager, BackHandler } from 'react-native';
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
import { findDuplicates, isDuplicateTransaction } from '@/utils/duplicateDetection';

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
  isDuplicate?: boolean; // True if this is a duplicate of another transaction
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

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Handle back button - navigate back instead of closing app
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true; // Prevent default behavior
      }
      return false; // Allow default behavior (close app) if can't go back
    });

    return () => backHandler.remove();
  }, [navigation]);

  // Load data immediately but asynchronously - don't block navigation
  useEffect(() => {
    if (id) {
      // Set loading state immediately
      setIsLoadingData(true);
      
      // Load data asynchronously using requestIdleCallback or setTimeout for immediate execution
      const loadData = async () => {
        try {
          // Load transactions and senders in parallel - these are now fast with minimal data
          await Promise.all([
            loadTransactions(id),
            loadSenders(id),
          ]);
          
          const biz = businesses.find((b) => b.id === id);
          if (biz) selectBusiness(biz);
          
          setIsLoadingData(false);
        } catch (error) {
          console.error('Error loading data:', error);
          setIsLoadingData(false);
        }
      };
      
      // Use requestAnimationFrame for immediate execution after render
      // This ensures navigation happens instantly
      requestAnimationFrame(() => {
        // Use setTimeout(0) to defer to next event loop tick
        setTimeout(() => {
          loadData();
        }, 0);
      });
    } else {
      setIsLoadingData(false);
    }
  }, [id, businesses, loadTransactions, loadSenders, selectBusiness]);

  // Load all messages when senders are loaded - after initial data is loaded
  useEffect(() => {
    if (enabledBanks.length > 0 && id && !isLoadingData) {
      // Load messages after a short delay to not block UI
      const timer = setTimeout(() => {
        loadAllMessages(enabledBanks);
        setIsInitialLoad(false);
      }, 200);
      
      return () => clearTimeout(timer);
    } else if (!isLoadingData) {
      setIsInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabledBanksKey, id, isLoadingData]);

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

  // Memoize business banks set to avoid recalculating
  const businessBanksSet = useMemo(() => {
    const bankSet = new Set<string>();
    senders
      .filter(s => s.businessId === id && s.enabled)
      .forEach(s => {
        const cleaned = cleanBankName(s.senderName).toLowerCase();
        bankSet.add(cleaned);
        // Also add variations for better matching
        const words = cleaned.split(' ');
        if (words.length > 1) {
          bankSet.add(words[0]); // Add first word (e.g., "laxmi" from "laxmi bank")
          // For "Laxmi Bank", also add "laxmi" for matching
          if (words[0] === 'laxmi' || words[0] === 'sunrise') {
            bankSet.add('laxmi bank'); // Normalize to "laxmi bank"
          }
        }
      });
    return bankSet;
  }, [senders, id]);

  // Memoize filtered parsed transactions
  const businessParsedTransactions = useMemo(() => {
    if (businessBanksSet.size === 0) return [];
    
    return allParsedTransactions.filter(tx => {
      const txBankNameLower = tx.bankName.toLowerCase();
      
      // Check exact match first
      if (businessBanksSet.has(txBankNameLower)) return true;
      
      // Normalize transaction bank name for matching
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
        if (normalizedTxBank.includes(bankName) || bankName.includes(normalizedTxBank)) {
          return true;
        }
      }
      return false;
    });
  }, [allParsedTransactions, businessBanksSet]);

  // Memoize manual transactions
  const manualTransactions = useMemo(() => 
    transactions.filter((t) => t.businessId === id),
    [transactions, id]
  );
  
  // Memoize combined transactions with duplicate detection
  const allTransactions = useMemo(() => {
    // For large datasets, skip duplicate detection on initial load to speed up navigation
    if (isInitialLoad && (manualTransactions.length > 50 || businessParsedTransactions.length > 50)) {
      // Fast path: just combine without duplicate detection
      const combined: CombinedTransaction[] = [];
      
      // Add manual transactions
      manualTransactions.forEach((tx) => {
        combined.push({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          date: tx.date,
          description: tx.description || tx.category,
          category: tx.category,
          bankName: tx.bankName,
          isManual: true,
          isDuplicate: false,
        });
      });
      
      // Add parsed transactions
      businessParsedTransactions.forEach((tx, index) => {
        const uniqueKey = `parsed_${tx.bankName}_${tx.date}_${tx.amount}_${index}`;
        combined.push({
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
          isDuplicate: false,
        });
      });
      
      return combined;
    }
    
    // Full duplicate detection for smaller datasets or after initial load
    const transactionMap = new Map<string, CombinedTransaction>();
    const usedParsedIndices = new Set<number>();
    
    // First, add manual transactions
    manualTransactions.forEach((tx) => {
      const duplicateParsed = businessParsedTransactions.findIndex(
        (parsedTx, index) => 
          !usedParsedIndices.has(index) && 
          isDuplicateTransaction(tx, parsedTx)
      );
      
      if (duplicateParsed !== -1) {
        usedParsedIndices.add(duplicateParsed);
        transactionMap.set(tx.id, {
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          date: tx.date,
          description: tx.description || tx.category,
          category: tx.category,
          bankName: tx.bankName,
          isManual: true,
          isDuplicate: true,
        });
      } else {
        transactionMap.set(tx.id, {
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          date: tx.date,
          description: tx.description || tx.category,
          category: tx.category,
          bankName: tx.bankName,
          isManual: true,
          isDuplicate: false,
        });
      }
    });
    
    // Add remaining parsed transactions
    businessParsedTransactions.forEach((tx, index) => {
      if (!usedParsedIndices.has(index)) {
        const uniqueKey = `parsed_${tx.bankName}_${tx.date}_${tx.amount}_${index}_${tx.rawMessage?.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '') || ''}`;
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
            isDuplicate: false,
          });
        }
      }
    });
    
    return Array.from(transactionMap.values());
  }, [manualTransactions, businessParsedTransactions, isInitialLoad]);

  // Memoize filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    let filtered = allTransactions;
    
    // Filter by bank if selected
    if (selectedBank !== 'all') {
      const selectedBankCleaned = cleanBankName(selectedBank).toLowerCase();
      filtered = filtered.filter((tx) => {
        if (tx.isManual) {
          if (!tx.bankName) return true;
          return cleanBankName(tx.bankName).toLowerCase() === selectedBankCleaned;
        }
        return tx.bankName && tx.bankName.toLowerCase() === selectedBankCleaned;
      });
    }

    // Filter by date range - only filter if dates are set
    if (startDate || endDate) {
      filtered = filtered.filter((tx) => {
        const txDateStr = new Date(tx.date).toISOString().split('T')[0];
        if (startDate && txDateStr < startDate) return false;
        if (endDate && txDateStr > endDate) return false;
        return true;
      });
    }

    // Sort by date (newest first)
    return [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allTransactions, selectedBank, startDate, endDate]);

  // Group transactions by month and day
  type GroupedTransactions = {
    month: string;
    monthYear: string;
    monthIncome: number;
    monthExpense: number;
    days: {
      date: string;
      day: number;
      dayName: string;
      monthYear: string;
      income: number;
      expense: number;
      transactions: CombinedTransaction[];
    }[];
  };

  const groupedTransactions = useMemo(() => {
    const monthMap = new Map<string, GroupedTransactions>();
    
    filteredTransactions.forEach((tx) => {
      const date = new Date(tx.date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const dayKey = date.toISOString().split('T')[0];
      const day = date.getDate();
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: date.toLocaleDateString('en-US', { month: 'long' }),
          monthYear: monthKey,
          monthIncome: 0,
          monthExpense: 0,
          days: [],
        });
      }
      
      const monthData = monthMap.get(monthKey)!;
      
      // Update month totals
      if (tx.type === 'income') {
        monthData.monthIncome += tx.amount;
      } else {
        monthData.monthExpense += tx.amount;
      }
      
      // Find or create day entry
      let dayData = monthData.days.find(d => d.date === dayKey);
      if (!dayData) {
        dayData = {
          date: dayKey,
          day,
          dayName,
          monthYear: monthKey,
          income: 0,
          expense: 0,
          transactions: [],
        };
        monthData.days.push(dayData);
      }
      
      // Update day totals and add transaction
      if (tx.type === 'income') {
        dayData.income += tx.amount;
      } else {
        dayData.expense += tx.amount;
      }
      dayData.transactions.push(tx);
    });
    
    // Sort days within each month (newest first)
    monthMap.forEach((monthData) => {
      monthData.days.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    
    // Convert to array and sort months (newest first)
    return Array.from(monthMap.values()).sort((a, b) => {
      const dateA = new Date(a.monthYear);
      const dateB = new Date(b.monthYear);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredTransactions]);

  // Memoize totals calculation
  const { totalIncome, totalExpense, totalBalance } = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      totalIncome: income,
      totalExpense: expense,
      totalBalance: income - expense,
    };
  }, [filteredTransactions]);

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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderTransaction = (item: CombinedTransaction) => (
    <Card style={[
      styles.transactionCard, 
      item.isDuplicate && { borderLeftWidth: 4, borderLeftColor: colors.warning }
    ].filter(Boolean) as any}>
      <View style={styles.transactionItemContent}>
        <View style={styles.transactionItemLeft}>
          <Text style={[styles.transactionDescription, { color: colors.text }]}>
            {item.description}
          </Text>
          {item.bankName && (
            <Text style={[styles.transactionBank, { color: colors.textSecondary }]}>
              {item.bankName}
            </Text>
          )}
          {item.remarks && (
            <Text style={[styles.transactionRemarks, { color: colors.textSecondary }]}>
              {item.remarks}
            </Text>
          )}
          {item.isDuplicate && (
            <View style={[styles.duplicateBadge, { backgroundColor: colors.warning + '20' }]}>
              <Text style={[styles.duplicateText, { color: colors.warning }]}>⚠️ Duplicate</Text>
            </View>
          )}
        </View>
        <View style={styles.transactionItemRight}>
          <Text style={[styles.transactionTime, { color: colors.textSecondary }]}>
            {formatTime(item.date)}
          </Text>
          <Text style={[styles.transactionAmount, { color: item.type === 'income' ? colors.success : colors.error }]}>
            NPR {item.amount.toFixed(2)}
          </Text>
        </View>
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

  // Show loading state immediately while data is being loaded
  const showLoading = isLoadingData || (transactions.length === 0 && senders.length === 0);

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

        {showLoading ? (
          <Card style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading data...
            </Text>
          </Card>
        ) : (
          <>
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
          </>
        )}

        {!showLoading && (
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

            {(isLoading || isInitialLoad) ? (
              <Card style={styles.loadingCard}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  {isLoading ? 'Loading transactions...' : 'Processing...'}
                </Text>
              </Card>
            ) : filteredTransactions.length > 0 ? (
            <View style={styles.transactionsContainer}>
              <Text style={[styles.transactionsCount, { color: colors.textSecondary }]}>
                {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
                {startDate && endDate && ` (${formatDate(startDate)} - ${formatDate(endDate)})`}
                {selectedBank !== 'all' && ` • ${cleanBankName(selectedBank)}`}
              </Text>
              
              {groupedTransactions.map((monthData) => (
                <View key={monthData.monthYear} style={styles.monthSection}>
                  {/* Month Header */}
                  <View style={[styles.monthHeader, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.monthTitle, { color: colors.text }]}>
                      {monthData.month}
                    </Text>
                    <View style={styles.monthTotals}>
                      <Text style={[styles.monthTotalLabel, { color: colors.textSecondary }]}>
                        Income: <Text style={{ color: colors.success }}>NPR {monthData.monthIncome.toFixed(2)}</Text>
                      </Text>
                      <Text style={[styles.monthTotalLabel, { color: colors.textSecondary }]}>
                        Expense: <Text style={{ color: colors.error }}>NPR {monthData.monthExpense.toFixed(2)}</Text>
                      </Text>
                    </View>
                  </View>
                  
                  {/* Days */}
                  {monthData.days.map((dayData) => (
                    <View key={dayData.date} style={styles.daySection}>
                      {/* Day Header */}
                      <View style={[styles.dayHeader, { backgroundColor: colors.background }]}>
                        <View style={styles.dayHeaderLeft}>
                          <Text style={[styles.dayNumber, { color: colors.text }]}>
                            {dayData.day}
                          </Text>
                          <View style={styles.dayInfo}>
                            <Text style={[styles.dayName, { color: colors.text }]}>
                              {dayData.dayName}
                            </Text>
                            <Text style={[styles.dayMonthYear, { color: colors.textSecondary }]}>
                              {dayData.monthYear}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.dayTotals}>
                          <Text style={[styles.dayTotalLabel, { color: colors.textSecondary }]}>
                            Income: <Text style={{ color: colors.success }}>NPR {dayData.income.toFixed(2)}</Text>
                          </Text>
                          <Text style={[styles.dayTotalLabel, { color: colors.textSecondary }]}>
                            Expense: <Text style={{ color: colors.error }}>NPR {dayData.expense.toFixed(2)}</Text>
                          </Text>
                        </View>
                      </View>
                      
                      {/* Transactions for this day */}
                      {dayData.transactions.map((tx) => (
                        <View key={tx.id} style={styles.transactionItemWrapper}>
                          {renderTransaction(tx)}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
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
        )}
      </ScrollView>

      <View style={styles.fabContainer}>
        <Button
          title="📱 Manage Banks"
          onPress={() => {
            // @ts-ignore - navigation type issue
            navigation.navigate('BusinessSmsSenders', { id });
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
  transactionSource: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sourceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 4,
  },
  sourceText: {
    ...Typography.caption,
    fontWeight: '600',
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
  duplicateBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: Spacing.xs,
  },
  duplicateText: {
    ...Typography.caption,
    fontSize: 10,
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
  monthSection: {
    marginBottom: Spacing.lg,
  },
  monthHeader: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  monthTitle: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  monthTotals: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  monthTotalLabel: {
    ...Typography.bodySmall,
  },
  daySection: {
    marginBottom: Spacing.md,
  },
  dayHeader: {
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dayNumber: {
    ...Typography.h2,
    fontWeight: '700',
    minWidth: 40,
  },
  dayInfo: {
    justifyContent: 'center',
  },
  dayName: {
    ...Typography.body,
    fontWeight: '600',
  },
  dayMonthYear: {
    ...Typography.caption,
    marginTop: 2,
  },
  dayTotals: {
    alignItems: 'flex-end',
  },
  dayTotalLabel: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  transactionItemWrapper: {
    marginBottom: Spacing.sm,
  },
  transactionItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionItemLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  transactionItemRight: {
    alignItems: 'flex-end',
  },
  transactionDescription: {
    ...Typography.body,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  transactionBank: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  transactionRemarks: {
    ...Typography.caption,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  transactionTime: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  transactionAmount: {
    ...Typography.body,
    fontWeight: '600',
  },
  duplicateIndicator: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
});
