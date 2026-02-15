import { Transaction, DateRange, MonthlyReport, CategoryReport, CashflowData } from '@/types';
import { transactionRepository } from '@/storage/repositories/transactionRepository';
import { formatDate } from '@/utils/date';

export class ReportService {
  /**
   * Get monthly income vs expense report
   */
  async getMonthlyReport(businessId: string, dateRange?: DateRange): Promise<MonthlyReport[]> {
    const transactions = await transactionRepository.getByBusinessId(businessId, dateRange);

    const monthlyMap = new Map<string, { income: number; expense: number }>();

    transactions.forEach((txn) => {
      const month = formatDate(txn.date, 'yyyy-MM');
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

    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        profit: data.income - data.expense,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get category-wise breakdown
   */
  async getCategoryReport(
    businessId: string,
    type: 'income' | 'expense',
    dateRange?: DateRange
  ): Promise<CategoryReport[]> {
    const breakdown = await transactionRepository.getCategoryBreakdown(businessId, type, dateRange);
    const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

    return breakdown.map((item) => ({
      category: item.category,
      amount: item.amount,
      percentage: total > 0 ? (item.amount / total) * 100 : 0,
      type,
    }));
  }

  /**
   * Get cashflow data for chart
   */
  async getCashflowData(businessId: string, dateRange?: DateRange): Promise<CashflowData[]> {
    const transactions = await transactionRepository.getByBusinessId(businessId, dateRange);

    const dailyMap = new Map<string, { income: number; expense: number }>();

    transactions.forEach((txn) => {
      const date = formatDate(txn.date, 'yyyy-MM-dd');
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { income: 0, expense: 0 });
      }
      const data = dailyMap.get(date)!;
      if (txn.type === 'income') {
        data.income += txn.amount;
      } else if (txn.type === 'expense') {
        data.expense += txn.amount;
      }
    });

    let runningBalance = 0;
    return Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => {
        runningBalance += data.income - data.expense;
        return {
          date,
          income: data.income,
          expense: data.expense,
          balance: runningBalance,
        };
      });
  }

  /**
   * Get business profit/loss summary
   */
  async getBusinessSummary(businessId: string, dateRange?: DateRange): Promise<{
    totalIncome: number;
    totalExpense: number;
    profit: number;
    transactionCount: number;
  }> {
    const transactions = await transactionRepository.getByBusinessId(businessId, dateRange);

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpense,
      profit: totalIncome - totalExpense,
      transactionCount: transactions.length,
    };
  }
}

export const reportService = new ReportService();
