import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { formatCurrency } from '@/utils/currency';
import { Typography } from '@/constants/typography';
import { Colors } from '@/constants/colors';
import { useColorScheme } from 'react-native';

interface CurrencyDisplayProps {
  amount: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  showSign?: boolean;
  style?: TextStyle;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  size = 'medium',
  color,
  style,
  showSign = false,
}) => {
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  const getTextStyle = (): TextStyle => {
    switch (size) {
      case 'small':
        return Typography.bodySmall;
      case 'large':
        return { ...Typography.h3, fontSize: 28 };
      default:
        return Typography.body;
    }
  };

  const textColor = color || (amount >= 0 ? colors.income : colors.expense);

  return (
    <Text
      style={[
        getTextStyle(),
        {
          color: textColor,
          fontWeight: size === 'large' ? '700' : '600',
        },
        style,
      ]}
    >
      {formatCurrency(amount, true)}
    </Text>
  );
};
