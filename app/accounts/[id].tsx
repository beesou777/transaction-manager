import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBankAccountStore } from '@/store/bankAccountStore';
import { useTransactionStore } from '@/store/transactionStore';
import { Card } from '@/components/Card';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { formatDate } from '@/utils/date';
import { Transaction, TransactionType } from '@/types';
import { useColorScheme } from 'react-native';

export default function AccountDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = (route.params as { id?: string }) || {};
  const { accounts, selectAccount } = useBankAccountStore();
  const { transactions, loadTransactions, deleteTransaction, isLoading } = useTransactionStore();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  const account = accounts.find((a) => a.id === id);

  useEffect(() => {
    if (id) {
      loadTransactions(id);
      const acc = accounts.find((a) => a.id === id);
      if (acc) selectAccount(acc);
    }
  }, [id, accounts]);

  if (!account) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>Account not found</Text>
      </View>
    );
  }

  const getTransactionColor = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return colors.income;
      case 'expense':
        return colors.expense;
      case 'transfer':
        return colors.transfer;
      default:
        return colors.text;
    }
  };

  const handleDelete = (transaction: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTransaction(transaction.id),
        },
      ]
    );
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('TransactionDetail' as never, { id: item.id } as never)}
      onLongPress={() => handleDelete(item)}
    >
      <Card>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionInfo}>
            <Text style={[styles.transactionCategory, { color: colors.text }]}>
              {item.category}
            </Text>
            {item.description && (
              <Text style={[styles.transactionDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.description}
              </Text>
            )}
            <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
              {formatDate(item.date)}
            </Text>
          </View>
          <View style={styles.transactionAmount}>
            <CurrencyDisplay
              amount={item.type === 'income' ? item.amount : -item.amount}
              color={getTransactionColor(item.type)}
            />
            {item.hasVAT && (
              <Text style={[styles.vatLabel, { color: colors.textSecondary }]}>+ VAT</Text>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.bankName, { color: colors.text }]}>{account.bankName}</Text>
        <Text style={[styles.accountNumber, { color: colors.textSecondary }]}>
          {account.accountNumber}
        </Text>
      </View>

      <Card style={styles.balanceCard}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Current Balance</Text>
        <CurrencyDisplay amount={account.currentBalance} size="large" />
      </Card>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text>
        {transactions.length === 0 ? (
          <Card>
            <EmptyState
              title="No Transactions"
              message="Add your first transaction to get started"
            />
          </Card>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            refreshing={isLoading}
            onRefresh={() => loadTransactions(id!)}
            contentContainerStyle={styles.list}
          />
        )}
      </View>

      <View style={styles.fabContainer}>
        <Button
          title="Import CSV"
          onPress={() => navigation.navigate('CSVImport' as never, { accountId: id } as never)}
          variant="outline"
          fullWidth
          style={styles.importButton}
        />
        <Button
          title="+ Add Transaction"
          onPress={() => navigation.navigate('NewTransaction' as never, { accountId: id } as never)}
          fullWidth
          style={styles.addButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.md,
  },
  bankName: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  accountNumber: {
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
  section: {
    flex: 1,
    padding: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  list: {
    paddingBottom: Spacing.xl,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  transactionCategory: {
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  transactionDesc: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xs,
  },
  transactionDate: {
    ...Typography.caption,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  vatLabel: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  fabContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  importButton: {
    marginBottom: Spacing.sm,
  },
  addButton: {
    marginTop: 0,
  },
  error: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
