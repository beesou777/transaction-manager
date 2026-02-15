/**
 * Nepali Finance Manager App
 * Main entry point with navigation setup
 *
 * @format
 */

import * as React from 'react';
import { useEffect } from 'react';
import { StatusBar, Platform, PermissionsAndroid, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { Colors } from '@/constants/colors';
import IndexScreen from './app/index';
import HomeScreen from './app/(tabs)/home';
import BusinessesScreen from './app/(tabs)/businesses';

// Import other screens
import BusinessDetailScreen from './app/businesses/[id]';
import BusinessSmsSendersScreen from './app/businesses/[id]/sms-senders';
import NewBusinessScreen from './app/businesses/new';
import NewTransactionScreen from './app/transactions/new';
import TransactionDetailScreen from './app/transactions/[id]';
import AccountDetailScreen from './app/accounts/[id]';
import AccountImportScreen from './app/accounts/[id]/import';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tab Navigator
function MainTabs() {
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Businesses') {
            iconName = focused ? 'business' : 'business-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: '#fff',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Businesses" 
        component={BusinessesScreen}
        options={{ title: 'Businesses' }}
      />
    </Tab.Navigator>
  );
}

function App() {
  const colorScheme = useColorScheme() || 'light';
  const colors = Colors[colorScheme];

  useEffect(() => {
    // Request SMS permission on Android
    if (Platform.OS === 'android') {
      PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS)
        .then((granted) => {
          if (!granted) {
            PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.READ_SMS,
              {
                title: 'SMS Permission Required',
                message:
                  'This app needs access to read SMS messages to automatically detect and track bank transactions from your messages.',
                buttonNeutral: 'Ask Me Later',
                buttonNegative: 'Cancel',
                buttonPositive: 'Grant Permission',
              }
            ).catch(() => {
              // Permission denied
            });
          }
        })
        .catch(() => {
          // Error checking permission
        });
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.primary} />
          <Stack.Navigator
            screenOptions={{
              headerStyle: {
                backgroundColor: colors.primary,
              },
              headerTintColor: '#fff',
            }}
          >
            <Stack.Screen
              name="Index"
              component={IndexScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
                  <Stack.Screen
                    name="BusinessDetail"
                    component={BusinessDetailScreen}
                    options={{ title: 'Transactions' }}
                  />
            <Stack.Screen
              name="BusinessSmsSenders"
              component={BusinessSmsSendersScreen}
              options={{ title: 'SMS Senders' }}
            />
            <Stack.Screen
              name="NewBusiness"
              component={NewBusinessScreen}
              options={{ title: 'New Business' }}
            />
            <Stack.Screen
              name="NewTransaction"
              component={NewTransactionScreen}
              options={{ title: 'New Transaction' }}
            />
            <Stack.Screen
              name="TransactionDetail"
              component={TransactionDetailScreen}
              options={{ title: 'Transaction Details' }}
            />
            <Stack.Screen
              name="AccountDetail"
              component={AccountDetailScreen}
              options={{ title: 'Account Details' }}
            />
            <Stack.Screen
              name="AccountImport"
              component={AccountImportScreen}
              options={{ title: 'Import Transactions' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
