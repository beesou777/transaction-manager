import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBusinessStore } from '@/store/businessStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useSMSStore } from '@/store/smsStore';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { Input } from '@/components/Input';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useColorScheme } from 'react-native';
import { cleanBankName } from '@/utils/smsParser';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function BusinessesScreen() {
  const navigation = useNavigation();
  const { businesses, loadBusinesses, updateBusiness } = useBusinessStore();
  const { transactions, loadTransactions } = useTransactionStore();
  const { allParsedTransactions, senders, loadSenders, loadAllMessages } = useSMSStore();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    if (businesses.length > 0) {
      const business = businesses[0];
      loadTransactions(business.id);
      loadSenders(business.id);
      setEditName(business.name);
      setEditDescription(business.description || '');
    }
  }, [businesses]);

  // Load messages when senders are loaded
  useEffect(() => {
    if (businesses.length > 0 && senders.length > 0) {
      const enabledBanks = senders
        .filter(s => s.businessId === businesses[0].id && s.enabled)
        .map(s => s.senderName);
      if (enabledBanks.length > 0) {
        loadAllMessages(enabledBanks);
      }
    }
  }, [senders, businesses]);

  // Calculate business totals (all-time)
  const businessTotals = useMemo(() => {
    if (businesses.length === 0) return { income: 0, expense: 0, profit: 0, transactionCount: 0 };

    const business = businesses[0];
    
    // Get manual transactions
    const manualTransactions = transactions.filter(t => t.businessId === business.id);
    
    // Get parsed transactions for this business
    const businessBanksSet = new Set<string>();
    senders
      .filter(s => s.businessId === business.id && s.enabled)
      .forEach(s => {
        const cleaned = cleanBankName(s.senderName).toLowerCase();
        businessBanksSet.add(cleaned);
      });

    const parsedTransactions = allParsedTransactions.filter(tx => {
      if (businessBanksSet.size === 0) return false;
      const txBankName = tx.bankName.toLowerCase();
      return businessBanksSet.has(txBankName);
    });

    // Combine all transactions
    const allBusinessTransactions = [
      ...manualTransactions,
      ...parsedTransactions.map(tx => ({
        id: `parsed_${tx.rawMessage}_${tx.date}`,
        businessId: business.id,
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        category: '',
        description: tx.description,
      })),
    ];

    const income = allBusinessTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = allBusinessTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const profit = income - expense;

    return {
      income,
      expense,
      profit,
      transactionCount: allBusinessTransactions.length,
    };
  }, [businesses, transactions, allParsedTransactions, senders]);

  // Get current month totals
  const currentMonthTotals = useMemo(() => {
    if (businesses.length === 0) return { income: 0, expense: 0, profit: 0 };

    const business = businesses[0];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const manualTransactions = transactions.filter(t => {
      if (t.businessId !== business.id) return false;
      const txDate = new Date(t.date);
      return txDate >= monthStart && txDate <= monthEnd;
    });

    const businessBanksSet = new Set<string>();
    senders
      .filter(s => s.businessId === business.id && s.enabled)
      .forEach(s => {
        const cleaned = cleanBankName(s.senderName).toLowerCase();
        businessBanksSet.add(cleaned);
      });

    const parsedTransactions = allParsedTransactions.filter(tx => {
      if (businessBanksSet.size === 0) return false;
      const txBankName = tx.bankName.toLowerCase();
      if (!businessBanksSet.has(txBankName)) return false;
      const txDate = new Date(tx.date);
      return txDate >= monthStart && txDate <= monthEnd;
    });

    const allTransactions = [
      ...manualTransactions,
      ...parsedTransactions.map(tx => ({
        id: `parsed_${tx.rawMessage}_${tx.date}`,
        type: tx.type,
        amount: tx.amount,
      })),
    ];

    const income = allTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = allTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const profit = income - expense;

    return { income, expense, profit };
  }, [businesses, transactions, allParsedTransactions, senders]);

  // Get recent transactions (last 5)
  const recentTransactions = useMemo(() => {
    if (businesses.length === 0) return [];

    const business = businesses[0];
    const manualTransactions = transactions.filter(t => t.businessId === business.id);
    
    const businessBanksSet = new Set<string>();
    senders
      .filter(s => s.businessId === business.id && s.enabled)
      .forEach(s => {
        const cleaned = cleanBankName(s.senderName).toLowerCase();
        businessBanksSet.add(cleaned);
      });

    const parsedTransactions = allParsedTransactions.filter(tx => {
      if (businessBanksSet.size === 0) return false;
      const txBankName = tx.bankName.toLowerCase();
      return businessBanksSet.has(txBankName);
    });

    const allTransactions = [
      ...manualTransactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        description: tx.description || tx.category || 'Transaction',
        bankName: tx.bankName,
        isManual: true,
      })),
      ...parsedTransactions.map(tx => ({
        id: `parsed_${tx.rawMessage}_${tx.date}`,
        type: tx.type,
        amount: tx.amount,
        date: tx.date,
        description: tx.description,
        bankName: tx.bankName,
        isManual: false,
      })),
    ];

    return allTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [businesses, transactions, allParsedTransactions, senders]);

  const handleSave = async () => {
    if (businesses.length === 0) return;
    if (!editName.trim()) {
      Alert.alert('Error', 'Business name is required');
      return;
    }

    try {
      await updateBusiness(businesses[0].id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Business updated successfully');
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (businesses.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <EmptyState
            title="Setup Your Business"
            message="Set up your business to start tracking transactions from SMS and manual entries"
          />
          <Button
            title="Setup Business"
            onPress={() => navigation.navigate('NewBusiness' as never)}
            fullWidth
            style={styles.addButton}
          />
        </View>
      </View>
    );
  }

  const business = businesses[0];
  const enabledBanks = senders.filter(s => s.businessId === business.id && s.enabled);
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Business Info Card */}
        <Card style={styles.businessCard}>
          <View style={styles.businessHeader}>
            <View style={styles.businessInfo}>
              {isEditing ? (
                <>
                  <Input
                    label="Business Name"
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter business name"
                  />
                  <Input
                    label="Description"
                    value={editDescription}
                    onChangeText={setEditDescription}
                    placeholder="Optional description"
                    multiline
                    numberOfLines={3}
                    style={styles.descInput}
                  />
                  <View style={styles.editActions}>
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={() => {
                        setEditName(business.name);
                        setEditDescription(business.description || '');
                        setIsEditing(false);
                      }}
                      style={styles.cancelButton}
                    />
                    <Button
                      title="Save"
                      onPress={handleSave}
                      style={styles.saveButton}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.businessName, { color: colors.text }]}>{business.name}</Text>
                  {business.description && (
                    <Text style={[styles.businessDesc, { color: colors.textSecondary }]}>
                      {business.description}
                    </Text>
                  )}
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={styles.editLink}
                  >
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                    <Text style={[styles.editLinkText, { color: colors.primary }]}>Edit</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Card>

        {/* Current Month Summary */}
        <Card style={styles.summaryCard}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            {monthName} Summary
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
              <CurrencyDisplay amount={currentMonthTotals.income} size="medium" color={colors.success} />
            </View>
            <Text style={[styles.summarySeparator, { color: colors.textSecondary }]}>|</Text>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Expense</Text>
              <CurrencyDisplay amount={currentMonthTotals.expense} size="medium" color={colors.error} />
            </View>
          </View>
          <View style={styles.profitContainer}>
            <Text style={[styles.profitLabel, { color: colors.textSecondary }]}>Net</Text>
            <CurrencyDisplay
              amount={currentMonthTotals.profit}
              size="large"
              color={currentMonthTotals.profit >= 0 ? colors.success : colors.error}
            />
          </View>
        </Card>

        {/* All-Time Totals */}
        <Card style={styles.totalsCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>All-Time Totals</Text>
          <View style={styles.totalsGrid}>
            <View style={styles.totalItem}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Income</Text>
              <CurrencyDisplay amount={businessTotals.income} size="medium" color={colors.success} />
            </View>
            <View style={styles.totalItem}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Expense</Text>
              <CurrencyDisplay amount={businessTotals.expense} size="medium" color={colors.error} />
            </View>
            <View style={styles.totalItem}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Net Profit</Text>
              <CurrencyDisplay
                amount={businessTotals.profit}
                size="medium"
                color={businessTotals.profit >= 0 ? colors.success : colors.error}
              />
            </View>
            <View style={styles.totalItem}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Transactions</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>
                {businessTotals.transactionCount}
              </Text>
            </View>
          </View>
        </Card>

        {/* Configured Banks */}
        <Card style={styles.banksCard}>
          <View style={styles.banksHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Configured Banks</Text>
            <TouchableOpacity
              onPress={() => {
                // @ts-ignore - navigation type issue
                navigation.navigate('BusinessSmsSenders', { id: business.id });
              }}
            >
              <Text style={[styles.manageLink, { color: colors.primary }]}>Manage</Text>
            </TouchableOpacity>
          </View>
          {enabledBanks.length === 0 ? (
            <Text style={[styles.emptyBanks, { color: colors.textSecondary }]}>
              No banks configured. Add banks to track SMS transactions.
            </Text>
          ) : (
            <View style={styles.banksList}>
              {enabledBanks.map((sender) => (
                <View key={sender.id} style={[styles.bankItem, { backgroundColor: colors.surface }]}>
                  <Ionicons name="card" size={20} color={colors.primary} />
                  <Text style={[styles.bankName, { color: colors.text }]}>
                    {cleanBankName(sender.senderName)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Recent Transactions */}
        <Card style={styles.recentCard}>
          <View style={styles.recentHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
            <TouchableOpacity
              onPress={() => {
                // @ts-ignore - navigation type issue
                navigation.navigate('BusinessDetail', { id: business.id });
              }}
            >
              <Text style={[styles.viewAllLink, { color: colors.primary }]}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentTransactions.length === 0 ? (
            <Text style={[styles.emptyTransactions, { color: colors.textSecondary }]}>
              No transactions yet. Add your first transaction!
            </Text>
          ) : (
            <View style={styles.transactionsList}>
              {recentTransactions.map((tx) => (
                <View key={tx.id} style={styles.transactionRow}>
                  <View style={styles.transactionLeft}>
                    <Text style={[styles.transactionDesc, { color: colors.text }]} numberOfLines={1}>
                      {tx.description}
                    </Text>
                    <Text style={[styles.transactionMeta, { color: colors.textSecondary }]}>
                      {formatDate(tx.date)} • {formatTime(tx.date)}
                      {tx.bankName && ` • ${cleanBankName(tx.bankName)}`}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      { color: tx.type === 'income' ? colors.success : colors.error },
                    ]}
                  >
                    {tx.type === 'income' ? '+' : '-'} NPR {tx.amount.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button
            title="+ Add Transaction"
            onPress={() => {
              // @ts-ignore - navigation type issue
              navigation.navigate('NewTransaction', { businessId: business.id });
            }}
            fullWidth
            style={styles.actionButton}
          />
          <Button
            title="📱 Manage Banks"
            onPress={() => {
              // @ts-ignore - navigation type issue
              navigation.navigate('BusinessSmsSenders', { id: business.id });
            }}
            variant="outline"
            fullWidth
            style={styles.actionButton}
          />
          <Button
            title="📊 View All Transactions"
            onPress={() => {
              // @ts-ignore - navigation type issue
              navigation.navigate('BusinessDetail', { id: business.id });
            }}
            variant="outline"
            fullWidth
            style={styles.actionButton}
          />
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
  emptyContainer: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    marginTop: Spacing.lg,
  },
  businessCard: {
    marginBottom: Spacing.md,
  },
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  businessInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  businessName: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  businessDesc: {
    ...Typography.body,
    marginTop: Spacing.xs,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  editLinkText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  descInput: {
    marginTop: Spacing.md,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  summaryCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  summaryTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
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
  totalsCard: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  totalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  totalItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
  },
  totalLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  totalValue: {
    ...Typography.h4,
    fontWeight: '600',
  },
  banksCard: {
    marginBottom: Spacing.md,
  },
  banksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  manageLink: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  emptyBanks: {
    ...Typography.bodySmall,
    textAlign: 'center',
    padding: Spacing.md,
  },
  banksList: {
    gap: Spacing.sm,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 8,
    gap: Spacing.sm,
  },
  bankName: {
    ...Typography.body,
    fontWeight: '500',
  },
  recentCard: {
    marginBottom: Spacing.md,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  viewAllLink: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  emptyTransactions: {
    ...Typography.bodySmall,
    textAlign: 'center',
    padding: Spacing.md,
  },
  transactionsList: {
    gap: Spacing.sm,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  transactionLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  transactionDesc: {
    ...Typography.body,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  transactionMeta: {
    ...Typography.caption,
  },
  transactionAmount: {
    ...Typography.body,
    fontWeight: '600',
  },
  quickActions: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    marginBottom: Spacing.sm,
  },
});
