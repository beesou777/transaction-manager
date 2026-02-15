import { useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBusinessStore } from '@/store/businessStore';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useColorScheme } from 'react-native';

export default function Index() {
  const navigation = useNavigation();
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
        navigation.replace('MainTabs' as never);
      } catch (err) {
        console.error('Initialization error:', err);
        // Still navigate even if there's an error
        navigation.replace('MainTabs' as never);
      }
    };

    initialize();
  }, [navigation, loadBusinesses]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
        {Platform.OS === 'android' ? 'Requesting SMS permission...' : 'Loading...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.bodySmall,
    marginTop: Spacing.md,
  },
});
