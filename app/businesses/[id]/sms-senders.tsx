import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSMSStore, SMSSender } from '@/store/smsStore';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useColorScheme } from 'react-native';

type SMSSendersRouteProp = RouteProp<{ params: { id: string } }, 'params'>;

export default function SMSSendersScreen() {
  const navigation = useNavigation();
  const route = useRoute<SMSSendersRouteProp>();
  const { id } = route.params;
  const { senders, availableSenders, loadSenders, loadAvailableSenders, requestSMSPermission, addSender, toggleSender, deleteSender, isLoading, error } = useSMSStore();
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  const [showAvailable, setShowAvailable] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    if (id) {
      loadSenders(id);
      checkPermissionAndLoad();
    }
  }, [id]);

  const checkPermissionAndLoad = async () => {
    if (Platform.OS === 'android') {
      const { PermissionsAndroid } = require('react-native');
      try {
        const checkResult = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_SMS
        );
        setPermissionGranted(checkResult);
      } catch (error) {
        console.error('Error checking permission:', error);
        setPermissionGranted(false);
      }
    } else {
      setPermissionGranted(false);
    }
    loadAvailableSenders();
  };

  const handleRequestPermission = async () => {
    try {
      const granted = await requestSMSPermission();
      if (granted) {
        setPermissionGranted(true);
        // Reload available senders after permission granted
        await loadAvailableSenders();
        Alert.alert('Permission Granted', 'You can now track SMS transactions. Add senders from the list below.');
      } else {
        Alert.alert('Permission Denied', 'SMS permission is required to automatically detect bank transaction senders. You can grant it in app settings.');
      }
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  const handleAddSender = async (senderName: string) => {
    if (!id) return;
    try {
      await addSender(id, senderName);
      setShowAvailable(false);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  const handleToggle = async (senderId: string, enabled: boolean) => {
    try {
      await toggleSender(senderId, !enabled);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };

  const handleDelete = (sender: SMSSender) => {
    Alert.alert(
      'Delete Sender',
      `Stop tracking SMS from "${sender.senderName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSender(sender.id),
        },
      ]
    );
  };

  const renderSender = ({ item }: { item: SMSSender }) => (
    <Card>
      <View style={styles.senderRow}>
        <View style={styles.senderInfo}>
          <Text style={[styles.senderName, { color: colors.text }]}>{item.senderName}</Text>
          <Text style={[styles.senderStatus, { color: colors.textSecondary }]}>
            {item.enabled ? 'Tracking enabled' : 'Tracking disabled'}
          </Text>
        </View>
        <View style={styles.senderActions}>
          <Switch
            value={item.enabled}
            onValueChange={() => handleToggle(item.id, item.enabled)}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={styles.deleteButton}
          >
            <Text style={[styles.deleteText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  const renderAvailableSender = (senderName: string) => (
    <TouchableOpacity
      key={senderName}
      onPress={() => handleAddSender(senderName)}
      style={[styles.availableSender, { backgroundColor: colors.surface }]}
    >
      <Text style={[styles.availableSenderText, { color: colors.text }]}>{senderName}</Text>
      <Text style={[styles.addText, { color: colors.primary }]}>+ Add</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>SMS Senders to Track</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Select which SMS senders to automatically track transactions from
          </Text>
        </View>

        {senders.length === 0 ? (
          <Card>
            <EmptyState
              title="No SMS Senders"
              message="Add SMS senders to automatically track transactions"
            />
          </Card>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tracked Senders</Text>
            <FlatList
              data={senders}
              renderItem={renderSender}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Senders</Text>
            <View style={styles.headerButtons}>
              <Button
                title="Refresh"
                variant="outline"
                onPress={async () => {
                  await loadAvailableSenders();
                }}
                style={styles.refreshButton}
              />
              <Button
                title={showAvailable ? 'Hide' : 'Show'}
                variant="outline"
                onPress={() => setShowAvailable(!showAvailable)}
              />
            </View>
          </View>
          {showAvailable && (
            <View style={styles.availableList}>
              {Platform.OS === 'android' && !permissionGranted && (
                <Card style={styles.permissionCard}>
                  <Text style={[styles.permissionTitle, { color: colors.text }]}>
                    SMS Permission Required
                  </Text>
                  <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
                    Grant SMS permission to automatically detect bank transaction SMS senders from your messages.
                  </Text>
                  <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                    Note: Automatic SMS reading requires SMS permission. You can also manually add senders.
                  </Text>
                  <Button
                    title="Grant Permission"
                    onPress={handleRequestPermission}
                    fullWidth
                    style={styles.permissionButton}
                  />
                </Card>
              )}
              {isLoading ? (
                <Card>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Loading senders from your SMS...
                  </Text>
                </Card>
              ) : availableSenders.length === 0 ? (
                <Card>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {Platform.OS === 'android' && !permissionGranted
                      ? 'Grant SMS permission above to see SMS senders from your messages, or add custom senders manually.'
                      : 'No SMS senders found in your messages. Add custom senders using the button below.'}
                  </Text>
                </Card>
              ) : (
                <>
                  <Text style={[styles.availableLabel, { color: colors.textSecondary }]}>
                    SMS Senders from your messages ({availableSenders.length}):
                  </Text>
                  {availableSenders.map((sender) => renderAvailableSender(sender))}
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.fabContainer}>
        <Button
          title="+ Add Custom Sender"
          onPress={() => {
            Alert.prompt(
              'Add SMS Sender',
              'Enter the SMS sender name to track (e.g., NIBL, NABIL)',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Add',
                  onPress: (text: string | undefined) => {
                    if (text && text.trim()) {
                      handleAddSender(text.trim());
                    }
                  },
                },
              ],
              'plain-text'
            );
          }}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: Spacing.md,
  },
  title: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  section: {
    padding: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  refreshButton: {
    minWidth: 80,
  },
  sectionTitle: {
    ...Typography.h3,
    marginBottom: Spacing.md,
  },
  senderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  senderInfo: {
    flex: 1,
  },
  senderName: {
    ...Typography.h4,
    marginBottom: Spacing.xs,
  },
  senderStatus: {
    ...Typography.caption,
  },
  senderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  deleteButton: {
    padding: Spacing.sm,
  },
  deleteText: {
    ...Typography.bodySmall,
  },
  availableList: {
    gap: Spacing.sm,
  },
  availableSender: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  availableSenderText: {
    ...Typography.body,
    fontWeight: '500',
  },
  addText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
    padding: Spacing.md,
  },
  permissionCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  permissionTitle: {
    ...Typography.h4,
    marginBottom: Spacing.sm,
  },
  permissionText: {
    ...Typography.bodySmall,
    marginBottom: Spacing.md,
  },
  permissionButton: {
    marginTop: Spacing.sm,
  },
  noteText: {
    ...Typography.caption,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  availableLabel: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  fabContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
});
