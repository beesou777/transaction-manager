import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBankAccountStore } from '@/store/bankAccountStore';
import { useBusinessStore } from '@/store/businessStore';
import { useTransactionStore } from '@/store/transactionStore';
import { csvService } from '@/services/csvService';
import { transactionService } from '@/services/transactionService';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useColorScheme } from 'react-native';

export default function CSVImportScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { accountId, id } = (route.params as { accountId?: string; id?: string }) || {};
  const accountIdToUse = accountId || id;
  const { accounts } = useBankAccountStore();
  const { businesses } = useBusinessStore();
  const { createTransaction } = useTransactionStore();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  const account = accounts.find((a) => a.id === accountIdToUse);
  const business = account ? businesses.find((b) => b.id === account.businessId) : null;

  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<{
    total: number;
    imported: number;
    duplicates: number;
    errors: number;
  } | null>(null);

  const handleImport = async () => {
    if (!account || !business) {
      Alert.alert('Error', 'Account information is missing');
      return;
    }

    try {
      setIsImporting(true);
      
      // Pick CSV file
      const file = await csvService.pickCSVFile();
      if (!file) {
        setIsImporting(false);
        return;
      }

      // Check for duplicates
      const fileHash = await csvService.generateFileHash(file.uri);
      const isDuplicate = await csvService.isDuplicate(file.name, fileHash);
      
      if (isDuplicate) {
        Alert.alert(
          'Duplicate File',
          'This file has already been imported. Please select a different file.',
          [{ text: 'OK' }]
        );
        setIsImporting(false);
        return;
      }

      // Parse CSV
      const csvData = await csvService.parseCSVFile(file.uri);
      const config = csvService.detectColumns(csvData);
      const transactions = csvService.convertToTransactions(csvData, config);

      // Import transactions
      let imported = 0;
      let duplicates = 0;
      let errors = 0;

      for (const txn of transactions) {
        try {
          // Check for duplicate by reference number
          if (txn.referenceNumber) {
            const isDup = await transactionService.isDuplicate(
              txn.referenceNumber,
              account.id
            );
            if (isDup) {
              duplicates++;
              continue;
            }
          }

          await createTransaction({
            businessId: business.id,
            bankAccountId: account.id,
            ...txn,
            category: txn.category || 'Other',
          });
          imported++;
        } catch (error) {
          console.error('Error importing transaction:', error);
          errors++;
        }
      }

      // Record import
      await csvService.recordImport(file.name, fileHash, imported);

      setImportStats({
        total: transactions.length,
        imported,
        duplicates,
        errors,
      });

      Alert.alert(
        'Import Complete',
        `Imported ${imported} transactions.\n${duplicates} duplicates skipped.\n${errors} errors.`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Import Error', (error as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Card>
          <Text style={[styles.title, { color: colors.text }]}>Import Bank Statement</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Select a CSV file from your bank statement to import transactions automatically.
            Duplicate transactions will be skipped.
          </Text>
        </Card>

        {importStats && (
          <Card>
            <Text style={[styles.statsTitle, { color: colors.text }]}>Import Statistics</Text>
            <View style={styles.statsRow}>
              <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Total:</Text>
              <Text style={[styles.statsValue, { color: colors.text }]}>{importStats.total}</Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Imported:</Text>
              <Text style={[styles.statsValue, { color: colors.success }]}>
                {importStats.imported}
              </Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Duplicates:</Text>
              <Text style={[styles.statsValue, { color: colors.warning }]}>
                {importStats.duplicates}
              </Text>
            </View>
            <View style={styles.statsRow}>
              <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>Errors:</Text>
              <Text style={[styles.statsValue, { color: colors.error }]}>
                {importStats.errors}
              </Text>
            </View>
          </Card>
        )}

        <Button
          title={isImporting ? 'Importing...' : 'Select CSV File'}
          onPress={handleImport}
          disabled={isImporting}
          loading={isImporting}
          fullWidth
          style={styles.importButton}
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
  title: {
    ...Typography.h3,
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.body,
    lineHeight: 22,
  },
  statsTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  statsLabel: {
    ...Typography.body,
  },
  statsValue: {
    ...Typography.body,
    fontWeight: '600',
  },
  importButton: {
    marginTop: Spacing.lg,
  },
});
