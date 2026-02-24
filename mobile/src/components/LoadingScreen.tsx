import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="dumbbell" size={64} color={colors.primary} />
      <Text style={styles.title}>SBS Workout Tracker</Text>
      <Text style={styles.subtitle}>Stronger by Science</Text>
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  spinner: {
    marginTop: spacing.xl,
  },
});
