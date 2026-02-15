import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBusinessStore } from '@/store/businessStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useSMSStore } from '@/store/smsStore';
import { Card } from '@/components/Card';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { EmptyState } from '@/components/EmptyState';
import { MonthYearPicker } from '@/components/MonthYearPicker';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useColorScheme } from 'react-native';
import { cleanBankName } from '@/utils/smsParser';

export default function HomeScreen() {
  const navigation = useNavigation();
  const { businesses, loadBusinesses } = useBusinessStore();
  const { transactions, loadTransactions } = useTransactionStore();
  const { allParsedTransactions, senders, loadSenders, loadAllMessages } = useSMSStore();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];
  const hasLoadedMessages = useRef(false);
  
  // Month/Year selector state - default to current month
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  // Load all data on mount
  useEffect(() => {
    const initializeData = async () => {
      // Load businesses and transactions first
      await loadBusinesses();
      await loadTransactions();
    };
    initializeData();
  }, []);

  // Load senders for all businesses when businesses are loaded, then load messages
  useEffect(() => {
    const loadSendersAndMessages = async () => {
      if (businesses.length === 0 || hasLoadedMessages.current) return;
      
      // Load senders for all businesses
      await Promise.all(businesses.map(biz => loadSenders(biz.id)));
      
      // Wait a bit for state to update (Zustand is synchronous but React needs to re-render)
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get the latest senders from the store
      const storeState = useSMSStore.getState();
      const currentSenders = storeState.senders;
      
      // Collect all enabled senders from all businesses
      const allEnabledSenders = currentSenders
        .filter(s => s.enabled)
        .map(s => s.senderName);
      
      // Remove duplicates
      const uniqueSenders = Array.from(new Set(allEnabledSenders));
      
      // Load all messages if we have enabled senders
      if (uniqueSenders.length > 0) {
        hasLoadedMessages.current = true;
        await loadAllMessages(uniqueSenders);
      } else {
        // Mark as loaded even if no senders (to avoid retrying)
        hasLoadedMessages.current = true;
      }
    };
    
    loadSendersAndMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses.length]); // Only depend on businesses.length to avoid loops

  // Get selected month start and end dates
  const getSelectedMonthRange = () => {
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  // Calculate per-business monthly breakdown and totals
  const { 
    totalIncome, 
    totalExpense, 
    totalBalance,
    businessBreakdowns 
  } = useMemo(() => {
    // Create a map of businessId -> enabled bank names (cleaned) for efficient lookup
    const businessBanksMap = new Map<string, Set<string>>();
    businesses.forEach(biz => {
      const bankSet = new Set<string>();
      senders
        .filter(s => s.businessId === biz.id && s.enabled)
        .forEach(s => {
          const cleaned = cleanBankName(s.senderName).toLowerCase();
          bankSet.add(cleaned);
        });
      if (bankSet.size > 0) {
        businessBanksMap.set(biz.id, bankSet);
      }
    });

    // Match parsed transactions to businesses based on which business has that bank configured
    const parsedTransactionsByBusiness = allParsedTransactions
      .map(tx => {
        const txBankNameLower = tx.bankName.toLowerCase();
        
        // Find which business has this bank configured - use strict matching
        for (const [businessId, bankSet] of businessBanksMap.entries()) {
          if (bankSet.has(txBankNameLower)) {
            return {
              ...tx,
              businessId,
            };
          }
        }
        
        // No match found
        return null;
      })
      .filter((tx): tx is NonNullable<typeof tx> => tx !== null); // Only include transactions that matched a business

    // Combine manual transactions and parsed transactions
    const allTransactions = [
      ...transactions,
      ...parsedTransactionsByBusiness.map(tx => ({
        id: `parsed_${tx.rawMessage}_${tx.date}`,
        businessId: tx.businessId,
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        category: '',
        description: tx.description,
      })),
    ];

    // Get selected month range for summary (top section)
    const monthRange = getSelectedMonthRange();
    
    // Calculate per-business ALL-TIME breakdown (not just selected month)
    const breakdowns = businesses.map((business) => {
      // Filter transactions for this business - ALL TIME
      const businessTransactions = allTransactions.filter((t) => {
        return t.businessId === business.id;
      });

      const income = businessTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = businessTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const profit = income - expense;

      return {
        businessId: business.id,
        businessName: business.name,
        income,
        expense,
        profit,
      };
    });

    // Calculate totals from all transactions across all businesses (current month)
    const monthTransactions = allTransactions.filter((t) => {
      const txDate = new Date(t.date).toISOString().split('T')[0];
      return txDate >= monthRange.start && txDate <= monthRange.end;
    });

    const income = monthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    return { 
      totalIncome: income, 
      totalExpense: expense, 
      totalBalance: balance,
      businessBreakdowns: breakdowns,
    };
  }, [transactions, allParsedTransactions, senders, businesses, selectedYear, selectedMonth]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[selectedMonth];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Month/Year Picker */}
        <Card style={styles.pickerCard}>
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>
            Select Month & Year
          </Text>
          <MonthYearPicker
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onYearMonthChange={(year, month) => {
              setSelectedYear(year);
              setSelectedMonth(month);
            }}
          />
        </Card>

        {/* Monthly Summary Header */}
        <Card style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
            {monthName} {selectedYear} Summary
          </Text>
          <View style={styles.summaryDisplay}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Income</Text>
              <CurrencyDisplay amount={totalIncome} size="medium" color={colors.success} />
            </View>
            <Text style={[styles.summarySeparator, { color: colors.textSecondary }]}>|</Text>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Expense</Text>
              <CurrencyDisplay amount={totalExpense} size="medium" color={colors.error} />
            </View>
          </View>
          <View style={styles.profitContainer}>
            <Text style={[styles.profitLabel, { color: colors.textSecondary }]}>Net</Text>
            <CurrencyDisplay amount={totalBalance} size="medium" color={totalBalance >= 0 ? colors.success : colors.error} />
          </View>
        </Card>

        {/* Business Summary */}
        {businesses.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Business Summary</Text>
            {businesses.map((business) => {
              const breakdown = businessBreakdowns.find((b) => b.businessId === business.id);
              const income = breakdown?.income || 0;
              const expense = breakdown?.expense || 0;
              const profit = breakdown?.profit || 0;
              
              return (
                <TouchableOpacity
                  key={business.id}
                  activeOpacity={0.8}
                  style={styles.businessCard}
                  onPress={() => {
                    // @ts-ignore - navigation type issue
                    navigation.navigate('BusinessDetail', { id: business.id });
                  }}
                >
                  <Card style={styles.businessCard}>
                    <Text style={[styles.businessName, { color: colors.text }]}>{business.name}</Text>
                    <View style={styles.businessSummary}>
                      <View style={styles.businessSummaryItem}>
                        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Income</Text>
                        <CurrencyDisplay amount={income} size="medium" color={colors.success} />
                      </View>
                      <Text style={[styles.summarySeparator, { color: colors.textSecondary }]}>|</Text>
                      <View style={styles.businessSummaryItem}>
                        <Text style={[styles.summaryText, { color: colors.textSecondary }]}>Expense</Text>
                        <CurrencyDisplay amount={expense} size="medium" color={colors.error} />
                      </View>
                    </View>
                    <View style={styles.profitContainer}>
                      <Text style={[styles.profitLabel, { color: colors.textSecondary }]}>Net</Text>
                      <CurrencyDisplay amount={profit} size="medium" color={profit >= 0 ? colors.success : colors.error} />
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
  },
  balanceCard: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  balanceLabel: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
  pickerCard: {
    marginBottom: Spacing.lg,
  },
  pickerLabel: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
  summaryDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryText: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xs,
  },
  summarySeparator: {
    ...Typography.h3,
    marginHorizontal: Spacing.md,
  },
  profitContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  profitLabel: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xs,
  },
  section: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  monthLabel: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  businessCard: {
    marginBottom: Spacing.md,
  },
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  businessInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  businessName: {
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  businessDesc: {
    ...Typography.bodySmall,
  },
  businessSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  businessSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  addButton: {
    padding: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  addButtonText: {
    ...Typography.button,
    color: '#FFFFFF',
  },
});
