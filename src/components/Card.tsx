import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';
import { Shadows, BorderRadius, Spacing } from '@/constants/spacing';
import { useColorScheme } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof Spacing;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, padding = 'md', onPress }) => {
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          padding: Spacing[padding],
          shadowColor: colors.shadow,
        },
        Shadows.md,
        style,
      ]}
      onStartShouldSetResponder={onPress ? () => true : undefined}
      onResponderRelease={onPress}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    marginVertical: Spacing.sm,
  },
});
