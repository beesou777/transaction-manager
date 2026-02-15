import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useBankAccountStore } from '@/store/bankAccountStore';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { parseCurrency } from '@/utils/currency';
import { useColorScheme } from 'react-native';

export default function NewAccountScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { businessId } = (route.params as { businessId?: string }) || {};
  const { createAccount, isLoading } = useBankAccountStore();
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  const handleSubmit = async () => {
    if (!bankName.trim()) {
      setError('Bank name is required');
      return;
    }
    if (!accountNumber.trim()) {
      setError('Account number is required');
      return;
    }
    if (!businessId) {
      Alert.alert('Error', 'Business ID is missing');
      return;
    }

    try {
      const balance = parseCurrency(openingBalance) || 0;
      await createAccount({
        businessId,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        openingBalance: balance,
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Input
          label="Bank Name *"
          value={bankName}
          onChangeText={(text) => {
            setBankName(text);
            setError(null);
          }}
          placeholder="e.g., Nepal Investment Bank"
          error={error && error.includes('Bank') ? error : undefined}
        />
        <Input
          label="Account Number *"
          value={accountNumber}
          onChangeText={(text) => {
            setAccountNumber(text);
            setError(null);
          }}
          placeholder="Enter account number"
          keyboardType="numeric"
          error={error && error.includes('Account') ? error : undefined}
        />
        <Input
          label="Opening Balance"
          value={openingBalance}
          onChangeText={setOpeningBalance}
          placeholder="Rs. 0.00"
          keyboardType="numeric"
        />
        <Button
          title="Create Account"
          onPress={handleSubmit}
          loading={isLoading}
          fullWidth
          style={styles.submitButton}
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
  submitButton: {
    marginTop: Spacing.lg,
  },
});
