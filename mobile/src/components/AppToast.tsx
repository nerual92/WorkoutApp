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
  success: { name: 'check-circle', color: '#1A7A42' },
  error: { name: 'close-circle', color: '#A63D40' },
  info: { name: 'information', color: '#7E8A82' },
  warning: { name: 'alert', color: '#C49032' },
};

const BG_COLORS: Record<ToastType, string> = {
  success: '#111513',
  error: '#111513',
  info: '#111513',
  warning: '#111513',
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
      <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>{toast.message}</Text>
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
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 9999,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
