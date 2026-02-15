import { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useBusinessStore } from '@/store/businessStore';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useColorScheme } from 'react-native';

type RootStackParamList = {
  Index: undefined;
  MainTabs: undefined;
  BusinessDetail: { id: string };
  BusinessSmsSenders: { id: string };
  NewBusiness: undefined;
  NewTransaction: { businessId: string };
  TransactionDetail: { id: string };
  AccountDetail: { id: string };
  AccountImport: { id: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function Index() {
  const navigation = useNavigation<NavigationProp>();
  const { loadBusinesses } = useBusinessStore();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initialize = async () => {
      try {
        // Load businesses
        await loadBusinesses();
        
        // Small delay to ensure everything is ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Navigate to main app
        navigation.replace('MainTabs');
      } catch (err) {
        console.error('Initialization error:', err);
        // Still navigate even if there's an error
        navigation.replace('MainTabs');
      }
    };

    initialize();
  }, [navigation, loadBusinesses]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image 
        source={require('../assets/arthaflow.png')} 
        style={styles.splashImage}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  splashImage: {
    width: '80%',
    maxWidth: 400,
    height: '50%',
    maxHeight: 400,
  },
  loader: {
    marginTop: Spacing.xl,
  },
});
