import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Switch, Text } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTransactionStore } from '@/store/transactionStore';
import { useBusinessStore } from '@/store/businessStore';
import { useSMSStore } from '@/store/smsStore';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { parseCurrency } from '@/utils/currency';
import { formatDateForDB } from '@/utils/date';
import { TransactionType } from '@/types';
import { Picker } from '@react-native-picker/picker';
import { useColorScheme } from 'react-native';
import { cleanBankName } from '@/utils/smsParser';

const TRANSACTION_TYPES: { label: string; value: TransactionType }[] = [
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
  { label: 'Transfer', value: 'transfer' },
];

const CATEGORIES = [
  'Salary',
  'Sales',
  'Rent',
  'Utilities',
  'Supplies',
  'Marketing',
  'Transport',
  'Other',
];

type NewTransactionRouteProp = RouteProp<{ params: { businessId?: string } }, 'params'>;

export default function NewTransactionScreen() {
  const navigation = useNavigation();
  const route = useRoute<NewTransactionRouteProp>();
  const { businessId } = route.params || {};
  const { createTransaction, isLoading } = useTransactionStore();
  const { businesses } = useBusinessStore();
  const { senders, loadSenders } = useSMSStore();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  const business = businessId ? businesses.find((b) => b.id === businessId) : null;

  // Load SMS senders for this business
  useEffect(() => {
    if (businessId) {
      loadSenders(businessId);
    }
  }, [businessId]);

  // Get enabled banks
  const enabledBanks = senders.filter(s => s.enabled).map(s => s.senderName);

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBank, setSelectedBank] = useState<string>('none');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!businessId || !business) {
      Alert.alert('Error', 'Business information is missing');
      return;
    }

    const amountValue = parseCurrency(amount);
    if (!amountValue || amountValue <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      await createTransaction({
        businessId: business.id,
        type,
        amount: amountValue,
        category,
        description: description.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        date: formatDateForDB(new Date(date)),
        hasVAT: false,
        bankName: selectedBank !== 'none' ? cleanBankName(selectedBank) : undefined,
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
          label="Transaction Type"
          value={type}
          editable={false}
        />
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={type}
            onValueChange={(value) => setType(value)}
            style={[styles.picker, { color: colors.text }]}
          >
            {TRANSACTION_TYPES.map((t) => (
              <Picker.Item key={t.value} label={t.label} value={t.value} />
            ))}
          </Picker>
        </View>

        <Input
          label="Amount (Rs.) *"
          value={amount}
          onChangeText={(text) => {
            setAmount(text);
            setError(null);
          }}
          placeholder="0.00"
          keyboardType="numeric"
          error={error}
        />

        {type === 'expense' && (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Category *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                style={[styles.picker, { color: colors.text }]}
              >
                {CATEGORIES.map((cat) => (
                  <Picker.Item key={cat} label={cat} value={cat} />
                ))}
              </Picker>
            </View>
          </>
        )}

        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          multiline
          numberOfLines={3}
        />

        <Input
          label="Reference Number"
          value={referenceNumber}
          onChangeText={setReferenceNumber}
          placeholder="Cheque number, transaction ID, etc."
        />

        {enabledBanks.length > 0 && (
          <>
            <Text style={[styles.label, { color: colors.text }]}>Bank (Optional)</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedBank}
                onValueChange={setSelectedBank}
                style={[styles.picker, { color: colors.text }]}
              >
                <Picker.Item label="None" value="none" />
                {enabledBanks.map((bank) => (
                  <Picker.Item key={bank} label={cleanBankName(bank)} value={bank} />
                ))}
              </Picker>
            </View>
          </>
        )}

        <Input
          label="Date *"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />

        <Button
          title="Create Transaction"
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
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginVertical: Spacing.sm,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  submitButton: {
    marginTop: Spacing.lg,
  },
  label: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
});
