import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBusinessStore } from '@/store/businessStore';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useColorScheme } from 'react-native';

export default function NewBusinessScreen() {
  const navigation = useNavigation();
  const { createBusiness, isLoading } = useBusinessStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Business name is required');
      return;
    }

    try {
      await createBusiness({ name: name.trim(), description: description.trim() || undefined });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Input
          label="Business Name *"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError(null);
          }}
          placeholder="Enter business name"
          error={error}
        />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          multiline
          numberOfLines={3}
        />
        <Button
          title="Create Business"
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
