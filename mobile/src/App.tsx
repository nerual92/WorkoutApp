import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBar, useColorScheme, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProgram } from 'workout-shared';
import { generateId, onAuthChange, logout, saveUserProgram, subscribeToProgramChanges } from 'workout-shared';
import type { AuthUser } from 'workout-shared';
import { useThemeColors } from './theme';
import { AppContext } from './AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import AppToastContainer from './components/AppToast';
import type { ToastType, ToastItem } from './components/AppToast';
import AuthScreen from './screens/AuthScreen';
import DashboardScreen from './screens/DashboardScreen';
import SetupScreen from './screens/SetupScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';

const STORAGE_KEY = 'userProgram';

const Tab = createBottomTabNavigator();

function AppContent() {
  const themeColors = useThemeColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [userProgram, setUserProgramState] = useState<UserProgram | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [workoutDayOverride, setWorkoutDayOverride] = useState<number | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Auth state
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);
  const isRemoteUpdate = useRef(false);

  // Listen to auth state
  useEffect(() => {
    const unsub = onAuthChange((user) => {
      setAuthUser(user);
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  // Subscribe to Firestore when authenticated
  useEffect(() => {
    if (!authUser) {
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
      return;
    }

    firestoreUnsubRef.current = subscribeToProgramChanges(authUser.uid, (program) => {
      isRemoteUpdate.current = true;
      if (program) {
        setUserProgramState(program);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(program)).catch(console.error);
      }
      isRemoteUpdate.current = false;
    });

    return () => {
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
    };
  }, [authUser]);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          setUserProgramState(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load program:', e);
      }
      setLoaded(true);
    })();
  }, []);

  // Persist whenever userProgram changes
  const setUserProgram = useCallback((p: UserProgram | null) => {
    setUserProgramState(p);
    if (p) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p)).catch(console.error);
      // Sync to Firestore if authenticated and not a remote update
      if (authUser && !isRemoteUpdate.current) {
        saveUserProgram(authUser.uid, p).catch(console.error);
      }
    } else {
      AsyncStorage.removeItem(STORAGE_KEY).catch(console.error);
    }
  }, [authUser]);

  const showToast = useCallback((msg: string, type: ToastType = 'success') => {
    const id = generateId();
    setToasts(prev => [...prev.slice(-2), { id, message: msg, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setUserProgramState(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const contextValue = {
    userProgram,
    setUserProgram,
    workoutDayOverride,
    setWorkoutDayOverride,
    showToast,
    authUser,
    handleLogout,
  };

  if (!authChecked || !loaded) return <LoadingScreen />;

  // Show auth screen if not logged in
  if (!authUser) {
    return <AuthScreen />;
  }

  const navTheme = isDark ? {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: themeColors.primary,
      background: themeColors.background,
      card: themeColors.surface,
      text: themeColors.text,
      border: themeColors.border,
    },
  } : {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: themeColors.primary,
      background: themeColors.background,
      card: themeColors.surface,
      text: themeColors.text,
      border: themeColors.border,
    },
  };

  return (
    <AppContext.Provider value={contextValue}>
      <View style={{ flex: 1 }}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'light-content'}
        backgroundColor={themeColors.primary}
      />
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: any = 'dumbbell';
              if (route.name === 'Home') iconName = 'home';
              else if (route.name === 'Setup') iconName = 'cog-outline';
              else if (route.name === 'Workout') iconName = 'dumbbell';
              else if (route.name === 'Analytics') iconName = 'chart-line';
              return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: themeColors.primary,
            tabBarInactiveTintColor: themeColors.textMuted,
            tabBarStyle: {
              backgroundColor: themeColors.surface,
              borderTopColor: themeColors.border,
              paddingBottom: 4,
              height: 60,
            },
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
            },
            headerStyle: {
              backgroundColor: themeColors.primary,
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 18,
            },
          })}
        >
          {userProgram ? (
            <>
              <Tab.Screen
                name="Home"
                component={DashboardScreen}
                options={{ title: 'SBS Tracker' }}
              />
              <Tab.Screen
                name="Workout"
                component={WorkoutScreen}
                options={{ title: 'Log Workout' }}
              />
              <Tab.Screen
                name="Analytics"
                component={AnalyticsScreen}
                options={{ title: 'Analytics' }}
              />
              <Tab.Screen
                name="Setup"
                component={SetupScreen}
                options={{ title: 'Settings' }}
              />
            </>
          ) : (
            <Tab.Screen
              name="Setup"
              component={SetupScreen}
              options={{ title: 'Program Setup' }}
            />
          )}
        </Tab.Navigator>
      </NavigationContainer>
      <AppToastContainer toasts={toasts} onDismiss={dismissToast} />
      </View>
    </AppContext.Provider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
