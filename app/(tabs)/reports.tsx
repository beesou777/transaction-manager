import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useBusinessStore } from '@/store/businessStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useSMSStore } from '@/store/smsStore';
import { cleanBankName } from '@/utils/smsParser';
// Removed database import - using store instead
import { Card } from '@/components/Card';
import { CurrencyDisplay } from '@/components/CurrencyDisplay';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useColorScheme } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { formatDate, getMonthRange } from '@/utils/date';

const screenWidth = Dimensions.get('window').width;

export default function ReportsScreen() {
  const { businesses, selectedBusiness } = useBusinessStore();
  const { transactions, loadTransactions, dateRange } = useTransactionStore();
  const { allParsedTransactions, senders, loadSenders } = useSMSStore();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; income: number; expense: number }>>([]);
  const [categoryData, setCategoryData] = useState<Array<{ name: string; amount: number; color: string }>>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  useEffect(() => {
    if (selectedBusiness) {
      loadSenders(selectedBusiness.id).then(() => {
        loadReportData();
      });
    }
  }, [selectedBusiness, dateRange, transactions, allParsedTransactions, senders]);

  const loadReportData = async () => {
    if (!selectedBusiness) return;

    try {
      await loadTransactions(selectedBusiness.id);
      const businessTransactions = transactions.filter(t => t.businessId === selectedBusiness.id);

      // Get enabled banks for this business from current senders state (cleaned and normalized)
      const enabledBanksSet = new Set<string>();
      senders
        .filter(s => s.businessId === selectedBusiness.id && s.enabled)
        .forEach(s => {
          const cleaned = cleanBankName(s.senderName).toLowerCase();
          enabledBanksSet.add(cleaned);
        });

      // Filter parsed transactions to only include those from this business's banks
      // Use strict matching (exact match only) to prevent cross-bank matching
      const businessParsedTransactions = allParsedTransactions
        .filter(tx => {
          if (enabledBanksSet.size === 0) return false;
          // Check if this transaction's bank matches any of this business's enabled banks
          const txBankName = tx.bankName.toLowerCase();
          return enabledBanksSet.has(txBankName);
        })
        .map(tx => ({
          id: `parsed_${tx.rawMessage}_${tx.date}`,
          businessId: selectedBusiness.id,
          type: tx.type,
          amount: tx.amount,
          date: tx.date,
          category: '',
          description: tx.description,
        }));

      // Combine with parsed transactions
      const allBusinessTransactions = [
        ...businessTransactions,
        ...businessParsedTransactions,
      ];

      // Calculate totals
      const income = allBusinessTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = allBusinessTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      setTotalIncome(income);
      setTotalExpense(expense);

      // Monthly breakdown
      const monthlyMap = new Map<string, { income: number; expense: number }>();
      allBusinessTransactions.forEach((txn) => {
        const month = formatDate(txn.date, 'MMM yyyy');
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { income: 0, expense: 0 });
        }
        const data = monthlyMap.get(month)!;
        if (txn.type === 'income') {
          data.income += txn.amount;
        } else if (txn.type === 'expense') {
          data.expense += txn.amount;
        }
      });

      const monthly = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6); // Last 6 months

      setMonthlyData(monthly);

      // Category breakdown
      const categoryMap = new Map<string, number>();
      allBusinessTransactions
        .filter((t) => t.type === 'expense')
        .forEach((txn) => {
          const category = txn.category || 'Other';
          categoryMap.set(category, (categoryMap.get(category) || 0) + txn.amount);
        });

      const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
      const category = Array.from(categoryMap.entries())
        .map(([name, amount], index) => ({
          name,
          amount,
          color: colors[index % colors.length],
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6);

      setCategoryData(category);
    } catch (error) {
      console.error('Error loading report data:', error);
    }
  };

  if (!selectedBusiness) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Select a business to view reports
          </Text>
        </Card>
      </View>
    );
  }

  const profit = totalIncome - totalExpense;

  const lineChartData = {
    labels: monthlyData.map((d) => d.month.substring(0, 3)),
    datasets: [
      {
        data: monthlyData.map((d) => d.income),
        color: (opacity = 1) => colors.income,
        strokeWidth: 2,
      },
      {
        data: monthlyData.map((d) => d.expense),
        color: (opacity = 1) => colors.expense,
        strokeWidth: 2,
      },
    ],
  };

  const pieChartData = categoryData.map((item) => ({
    name: item.name,
    amount: item.amount,
    color: item.color,
    legendFontColor: colors.text,
    legendFontSize: 12,
  }));

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
            <CurrencyDisplay amount={totalIncome} size="medium" color={colors.income} />
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Expense</Text>
            <CurrencyDisplay amount={totalExpense} size="medium" color={colors.expense} />
          </Card>
        </View>

        <Card style={styles.profitCard}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Net Profit</Text>
          <CurrencyDisplay amount={profit} size="large" />
        </Card>

        {/* Cashflow Chart */}
        {monthlyData.length > 0 && (
          <Card>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Cashflow Trend</Text>
            <LineChart
              data={lineChartData}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                backgroundColor: colors.card,
                backgroundGradientFrom: colors.card,
                backgroundGradientTo: colors.card,
                decimalPlaces: 0,
                color: (opacity = 1) => colors.text,
                labelColor: (opacity = 1) => colors.textSecondary,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                },
              }}
              bezier
              style={styles.chart}
            />
          </Card>
        )}

        {/* Category Breakdown */}
        {categoryData.length > 0 && (
          <Card>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Expense by Category</Text>
            <PieChart
              data={pieChartData}
              width={screenWidth - 64}
              height={220}
              chartConfig={{
                color: (opacity = 1) => colors.text,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
            <View style={styles.categoryList}>
              {categoryData.map((item) => (
                <View key={item.name} style={styles.categoryItem}>
                  <View style={[styles.categoryColor, { backgroundColor: item.color }]} />
                  <Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text>
                  <CurrencyDisplay amount={item.amount} size="small" />
                </View>
              ))}
            </View>
          </Card>
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
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    marginHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  summaryLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  profitCard: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  chartTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  chart: {
    marginVertical: Spacing.sm,
    borderRadius: 16,
  },
  categoryList: {
    marginTop: Spacing.md,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  categoryName: {
    ...Typography.body,
    flex: 1,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
  },
});
