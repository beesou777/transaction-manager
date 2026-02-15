import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBusinessStore } from '@/store/businessStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useSMSStore } from '@/store/smsStore';
import { Card } from '@/components/Card';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { EmptyState } from '@/components/EmptyState';
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

  // Calculate totals using useMemo to recalculate when data changes
  const { totalIncome, totalExpense, totalBalance } = useMemo(() => {
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

    // Calculate totals from all transactions across all businesses
    const income = allTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = allTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const balance = income - expense;

    return { totalIncome: income, totalExpense: expense, totalBalance: balance };
  }, [transactions, allParsedTransactions, senders, businesses]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Total Balance Card */}
        <Card style={styles.balanceCard}>
          <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Total Balance</Text>
          <CurrencyDisplay amount={totalBalance} size="large" />
        </Card>

        {/* Income and Expense Summary */}
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Income</Text>
            <CurrencyDisplay amount={totalIncome} size="medium" color={colors.success} />
          </Card>
          <Card style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Expense</Text>
            <CurrencyDisplay amount={totalExpense} size="medium" color={colors.error} />
          </Card>
        </View>

        {/* Businesses Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Businesses</Text>
          {businesses.length === 0 ? (
            <Card>
              <EmptyState
                title="No Businesses Yet"
                message="Create your first business to get started"
              />
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Businesses' as never)}
              >
                <Text style={styles.addButtonText}>Add Business</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            businesses.map((business) => (
              <TouchableOpacity
                key={business.id}
                onPress={() => navigation.navigate('BusinessDetail' as never, { id: business.id } as never)}
              >
                <Card>
                  <Text style={[styles.businessName, { color: colors.text }]}>{business.name}</Text>
                  {business.description && (
                    <Text style={[styles.businessDesc, { color: colors.textSecondary }]}>
                      {business.description}
                    </Text>
                  )}
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
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
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  summaryLabel: {
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
  businessName: {
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  businessDesc: {
    ...Typography.bodySmall,
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
