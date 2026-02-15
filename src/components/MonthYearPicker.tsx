import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useColorScheme } from 'react-native';

interface MonthYearPickerProps {
  selectedYear: number;
  selectedMonth: number; // 0-11 (0 = January)
  onYearMonthChange: (year: number, month: number) => void;
}

export function MonthYearPicker({ selectedYear, selectedMonth, onYearMonthChange }: MonthYearPickerProps) {
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];
  const [showPicker, setShowPicker] = useState(false);
  const [tempYear, setTempYear] = useState(selectedYear);
  const [tempMonth, setTempMonth] = useState(selectedMonth);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const formatDisplay = () => {
    return `${monthNames[selectedMonth]} ${selectedYear}`;
  };

  const handleConfirm = () => {
    onYearMonthChange(tempYear, tempMonth);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setTempYear(selectedYear);
    setTempMonth(selectedMonth);
    setShowPicker(false);
  };

  // Generate years (2020 to 2030)
  const years = Array.from({ length: 11 }, (_, i) => 2020 + i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.pickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => {
          setTempYear(selectedYear);
          setTempMonth(selectedMonth);
          setShowPicker(true);
        }}
      >
        <Text style={[styles.pickerText, { color: colors.text }]}>
          {formatDisplay()}
        </Text>
        <Text style={[styles.pickerIcon, { color: colors.primary }]}>▼</Text>
      </TouchableOpacity>
      
      {Platform.OS === 'ios' ? (
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCancel}>
                  <Text style={[styles.modalButton, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Month & Year</Text>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={[styles.modalButton, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={tempMonth}
                  onValueChange={setTempMonth}
                  style={[styles.picker, { color: colors.text, backgroundColor: colors.surface }]}
                >
                  {months.map((month) => (
                    <Picker.Item key={month} label={monthNames[month]} value={month} />
                  ))}
                </Picker>
                <Picker
                  selectedValue={tempYear}
                  onValueChange={setTempYear}
                  style={[styles.picker, { color: colors.text, backgroundColor: colors.surface }]}
                >
                  {years.map((year) => (
                    <Picker.Item key={year} label={String(year)} value={year} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </Modal>
      ) : (
        // Android: Show picker in modal
        <Modal
          visible={showPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCancel}>
                  <Text style={[styles.modalButton, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Month & Year</Text>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={[styles.modalButton, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={tempMonth}
                  onValueChange={setTempMonth}
                  style={[styles.picker, { color: colors.text, backgroundColor: colors.surface }]}
                  dropdownIconColor={colors.text}
                >
                  {months.map((month) => (
                    <Picker.Item key={month} label={monthNames[month]} value={month} />
                  ))}
                </Picker>
                <Picker
                  selectedValue={tempYear}
                  onValueChange={setTempYear}
                  style={[styles.picker, { color: colors.text, backgroundColor: colors.surface }]}
                  dropdownIconColor={colors.text}
                >
                  {years.map((year) => (
                    <Picker.Item key={year} label={String(year)} value={year} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
  },
  pickerText: {
    ...Typography.body,
    fontWeight: '500',
  },
  pickerIcon: {
    ...Typography.body,
    marginLeft: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.md,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    ...Typography.h4,
    fontWeight: '600',
  },
  modalButton: {
    ...Typography.body,
    fontWeight: '600',
  },
  pickerContainer: {
    flexDirection: 'row',
    height: 200,
  },
  picker: {
    flex: 1,
  },
});
