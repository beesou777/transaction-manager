import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useBusinessStore } from '@/store/businessStore';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/Button';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useColorScheme } from 'react-native';

export default function BusinessesScreen() {
  const navigation = useNavigation();
  const { businesses, loadBusinesses, deleteBusiness, isLoading } = useBusinessStore();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    loadBusinesses();
  }, []);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Business',
      `Are you sure you want to delete "${name}"? This will also delete all associated bank accounts and transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteBusiness(id),
        },
      ]
    );
  };

  const renderBusiness = ({ item }: { item: typeof businesses[0] }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('BusinessDetail' as never, { id: item.id } as never)}
      onLongPress={() => handleDelete(item.id, item.name)}
    >
      <Card>
        <View style={styles.businessHeader}>
          <View style={styles.businessInfo}>
            <Text style={[styles.businessName, { color: colors.text }]}>{item.name}</Text>
            {item.description && (
              <Text style={[styles.businessDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {businesses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            title="No Businesses"
            message="Create your first business to start managing transactions"
          />
          <Button
            title="Create Business"
            onPress={() => navigation.navigate('NewBusiness' as never)}
            fullWidth
            style={styles.addButton}
          />
        </View>
      ) : (
        <>
          <FlatList
            data={businesses}
            renderItem={renderBusiness}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshing={isLoading}
            onRefresh={loadBusinesses}
          />
          <View style={styles.fabContainer}>
            <Button
              title="+ Add Business"
              onPress={() => navigation.navigate('NewBusiness' as never)}
              fullWidth
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Spacing.md,
  },
  businessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  businessDesc: {
    ...Typography.bodySmall,
  },
  emptyContainer: {
    flex: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  addButton: {
    marginTop: Spacing.lg,
  },
  fabContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
});
