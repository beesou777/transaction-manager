import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useColorScheme } from 'react-native';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export function DateRangePicker({ startDate, endDate, onStartDateChange, onEndDateChange }: DateRangePickerProps) {
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Select date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(null);
    }
    
    if (selectedDate && showPicker) {
      const dateString = selectedDate.toISOString().split('T')[0];
      if (showPicker === 'start') {
        onStartDateChange(dateString);
        // Auto-open end date picker if start is selected
        if (Platform.OS === 'ios') {
          setTimeout(() => setShowPicker('end'), 100);
        }
      } else {
        onEndDateChange(dateString);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.dateRow}>
        <TouchableOpacity
          style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowPicker('start')}
        >
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>From:</Text>
          <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(startDate)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowPicker('end')}
        >
          <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>To:</Text>
          <Text style={[styles.dateValue, { color: colors.text }]}>{formatDate(endDate)}</Text>
        </TouchableOpacity>
      </View>
      
      {showPicker && (
        <DateTimePicker
          value={showPicker === 'start' && startDate ? new Date(startDate) : showPicker === 'end' && endDate ? new Date(endDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={showPicker === 'end' && startDate ? new Date(startDate) : undefined}
        />
      )}
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          onPress={() => {
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 30);
            onStartDateChange(start.toISOString().split('T')[0]);
            onEndDateChange(end.toISOString().split('T')[0]);
          }}
          style={styles.resetButton}
        >
          <Text style={[styles.resetText, { color: colors.primary }]}>Last 30 Days</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            onStartDateChange('');
            onEndDateChange('');
          }}
          style={styles.resetButton}
        >
          <Text style={[styles.resetText, { color: colors.primary }]}>Show All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dateButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs,
  },
  dateValue: {
    ...Typography.body,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.xs,
  },
  resetButton: {
    padding: Spacing.xs,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  resetText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
});
