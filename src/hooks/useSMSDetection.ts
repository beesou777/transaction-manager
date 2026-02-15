import { useEffect, useState } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import * as SMS from 'expo-sms';
import { smsService } from '@/services/smsService';
import { ParsedSMS } from '@/types';
import { useTransactionStore } from '@/store/transactionStore';
import { useBankAccountStore } from '@/store/bankAccountStore';
import { useBusinessStore } from '@/store/businessStore';

interface UseSMSDetectionOptions {
  enabled: boolean;
  bankAccountId?: string;
  businessId?: string;
}

export const useSMSDetection = (options: UseSMSDetectionOptions) => {
  const { enabled, bankAccountId, businessId } = options;
  const { createTransaction } = useTransactionStore();
  const { accounts } = useBankAccountStore();
  const { businesses } = useBusinessStore();
  const [isListening, setIsListening] = useState(false);
  const [lastParsedSMS, setLastParsedSMS] = useState<ParsedSMS | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') {
      return;
    }

    const requestPermission = async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          {
            title: 'SMS Permission',
            message: 'This app needs access to read SMS to auto-detect bank transactions.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setIsListening(true);
        } else {
          Alert.alert(
            'Permission Denied',
            'SMS auto-detection requires SMS read permission.'
          );
        }
      } catch (error) {
        console.error('Error requesting SMS permission:', error);
      }
    };

    requestPermission();

    // Note: Actual SMS listening would require native module
    // This is a placeholder for the implementation
    // In production, you'd use a library like react-native-sms-listener

    return () => {
      setIsListening(false);
    };
  }, [enabled]);

  const handleSMSReceived = async (message: string, sender?: string) => {
    if (!bankAccountId || !businessId) {
      return;
    }

    const parsed = smsService.parseSMS(message, sender);
    if (!parsed) {
      return;
    }

    setLastParsedSMS(parsed);

    // Find the account
    const account = accounts.find((a) => a.id === bankAccountId);
    if (!account) {
      return;
    }

    // Create transaction from SMS
    try {
      await createTransaction({
        businessId,
        bankAccountId,
        type: parsed.type,
        amount: parsed.amount,
        category: 'Bank Transaction',
        description: parsed.description,
        date: parsed.date,
        hasVAT: false,
      });

      Alert.alert(
        'Transaction Detected',
        `Detected ${parsed.type}: Rs. ${parsed.amount} from ${parsed.bankName}`
      );
    } catch (error) {
      console.error('Error creating transaction from SMS:', error);
    }
  };

  return {
    isListening,
    lastParsedSMS,
    handleSMSReceived,
  };
};
