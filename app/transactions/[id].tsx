import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTransactionStore } from '@/store/transactionStore';
import { Card } from '@/components/Card';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { Button } from '@/components/Button';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { formatDate } from '@/utils/date';
import { useColorScheme } from 'react-native';

type TransactionDetailRouteProp = RouteProp<{ params: { id: string } }, 'params'>;

export default function TransactionDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<TransactionDetailRouteProp>();
  const { id } = route.params;
  const { transactions, selectTransaction, deleteTransaction } = useTransactionStore();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  const transaction = transactions.find((t) => t.id === id);

  useEffect(() => {
    if (transaction) {
      selectTransaction(transaction);
    }
  }, [id, transaction]);

  if (!transaction) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.error, { color: colors.error }]}>Transaction not found</Text>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(transaction.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const getTypeColor = () => {
    switch (transaction.type) {
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Card style={styles.amountCard}>
          <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
            {transaction.type.toUpperCase()}
          </Text>
          <CurrencyDisplay
            amount={transaction.type === 'income' ? transaction.amount : -transaction.amount}
            size="large"
            color={getTypeColor()}
          />
        </Card>

        <Card>
          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
            <Text style={[styles.value, { color: colors.text }]}>{transaction.category}</Text>
          </View>

          {transaction.description && (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
              <Text style={[styles.value, { color: colors.text }]}>{transaction.description}</Text>
            </View>
          )}

          {transaction.referenceNumber && (
            <View style={styles.detailRow}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Reference</Text>
              <Text style={[styles.value, { color: colors.text }]}>
                {transaction.referenceNumber}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
            <Text style={[styles.value, { color: colors.text }]}>
              {formatDate(transaction.date)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
            <CurrencyDisplay amount={transaction.amount} />
          </View>

          {transaction.hasVAT && (
            <>
              <View style={styles.detailRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>VAT (13%)</Text>
                <CurrencyDisplay amount={transaction.vatAmount || 0} />
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Total</Text>
                <CurrencyDisplay
                  amount={transaction.amount + (transaction.vatAmount || 0)}
                  size="medium"
                />
              </View>
            </>
          )}
        </Card>

        <Button
          title="Delete Transaction"
          onPress={handleDelete}
          variant="danger"
          fullWidth
          style={styles.deleteButton}
        />
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
  amountCard: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  typeLabel: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  label: {
    ...Typography.bodySmall,
  },
  value: {
    ...Typography.body,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  deleteButton: {
    marginTop: Spacing.xl,
  },
  error: {
    ...Typography.body,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
