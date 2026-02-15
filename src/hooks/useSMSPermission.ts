import { useEffect, useState } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';

export interface SMSPermissionState {
  granted: boolean;
  checking: boolean;
  error: string | null;
}

/**
 * Hook to request and check SMS permission on app startup
 */
export const useSMSPermission = () => {
  const [state, setState] = useState<SMSPermissionState>({
    granted: false,
    checking: true,
    error: null,
  });

  useEffect(() => {
    checkAndRequestPermission();
  }, []);

  const checkAndRequestPermission = async () => {
    if (Platform.OS !== 'android') {
      setState({ granted: false, checking: false, error: 'SMS permission only available on Android' });
      return;
    }

    try {
      // First check if permission is already granted
      const checkResult = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS
      );

      if (checkResult) {
        setState({ granted: true, checking: false, error: null });
        return;
      }

      // Request permission - this will show the dialog
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission Required',
          message:
            'This app needs access to read SMS messages to automatically detect and track bank transactions from your messages.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Grant Permission',
        }
      );


      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        setState({ granted: true, checking: false, error: null });
      } else if (granted === PermissionsAndroid.RESULTS.DENIED) {
        setState({
          granted: false,
          checking: false,
          error: 'SMS permission was denied. You can grant it later in app settings.',
        });
      } else {
        setState({
          granted: false,
          checking: false,
          error: 'SMS permission was not granted. You can grant it later.',
        });
      }
    } catch (error) {
      console.error('Error requesting SMS permission:', error);
      setState({
        granted: false,
        checking: false,
        error: (error as Error).message,
      });
    }
  };

  const requestPermission = async () => {
    setState((prev) => ({ ...prev, checking: true }));
    await checkAndRequestPermission();
  };

  return {
    ...state,
    requestPermission,
  };
};
