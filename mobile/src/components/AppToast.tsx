import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface AppToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const ICONS: Record<ToastType, { name: string; color: string }> = {
  success: { name: 'check-circle', color: '#22c55e' },
  error: { name: 'close-circle', color: '#ef4444' },
  info: { name: 'information', color: '#3b82f6' },
  warning: { name: 'alert', color: '#f59e0b' },
};

const BG_COLORS: Record<ToastType, string> = {
  success: '#f0fdf4',
  error: '#fef2f2',
  info: '#eff6ff',
  warning: '#fffbeb',
};

function AppToastItem({ toast, onDismiss }: AppToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(() => onDismiss(toast.id));
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const icon = ICONS[toast.type];

  return (
    <Animated.View style={[styles.toast, { backgroundColor: BG_COLORS[toast.type], opacity, transform: [{ translateY }] }]}>
      <MaterialCommunityIcons name={icon.name as any} size={20} color={icon.color} />
      <Text style={[styles.text, { color: '#1f2937' }]} numberOfLines={2}>{toast.message}</Text>
    </Animated.View>
  );
}

interface AppToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function AppToastContainer({ toasts, onDismiss }: AppToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <>
      {toasts.map((t) => (
        <AppToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 9999,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
