import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { EXERCISES } from 'workout-shared';
import { getWeekProgression } from 'workout-shared';
import { useAppContext } from '../AppContext';
import { colors, spacing, globalStyles } from '../theme';

export default function DashboardScreen() {
  const { userProgram, setWorkoutDayOverride } = useAppContext();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Context is already reactive; brief delay gives visual feedback
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  if (!userProgram) return null;

  const weekProgression = getWeekProgression(userProgram.currentWeek);
  const lastSession = userProgram.workoutSessions.length > 0
    ? userProgram.workoutSessions[userProgram.workoutSessions.length - 1]
    : null;

  // Group last session sets by exercise
  const lastSessionGroups: Record<string, typeof lastSession extends null ? never : NonNullable<typeof lastSession>['sets']> = {};
  if (lastSession) {
    lastSession.sets.forEach(set => {
      if (!lastSessionGroups[set.exerciseId]) lastSessionGroups[set.exerciseId] = [];
      lastSessionGroups[set.exerciseId].push(set);
    });
  }

  const handleStartWorkout = (dayNumber: number) => {
    setWorkoutDayOverride(dayNumber);
    navigation.navigate('Workout');
  };

  return (
    <ScrollView
      style={globalStyles.scrollContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* Welcome */}
      <View style={styles.welcome}>
        <Text style={styles.welcomeTitle}>Welcome Back!</Text>
        <Text style={styles.welcomeSubtitle}>
          Week {userProgram.currentWeek} of 8  ·  {userProgram.program.name}  ·  {weekProgression.sets}×{weekProgression.reps}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{userProgram.workoutSessions.length}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{userProgram.currentWeek}/8</Text>
          <Text style={styles.statLabel}>Week</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {userProgram.workoutSessions.reduce((sum, s) => sum + s.sets.length, 0)}
          </Text>
          <Text style={styles.statLabel}>Total Sets</Text>
        </View>
      </View>

      {/* Empty state */}
      {userProgram.workoutSessions.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="rocket-launch" size={48} color={colors.primary} />
          <Text style={styles.emptyTitle}>Ready to start?</Text>
          <Text style={styles.emptyText}>
            You haven't logged any workouts yet. Pick a day below and crush your first session!
          </Text>
        </View>
      )}

      {/* Day Cards */}
      <Text style={[globalStyles.subtitle, { marginTop: spacing.md }]}>Start a Workout</Text>
      {userProgram.program.days.map((day) => {
        const isNext = day.dayNumber === userProgram.currentDay;
        const exerciseNames = day.exercises
          .map(ex => EXERCISES.find(e => e.id === ex.exerciseId)?.name || ex.exerciseId)
          .slice(0, 3);
        const extra = day.exercises.length - 3;

        return (
          <TouchableOpacity
            key={day.dayNumber}
            style={[styles.dayCard, isNext && styles.dayCardNext]}
            onPress={() => handleStartWorkout(day.dayNumber)}
            activeOpacity={0.7}
          >
            <View style={styles.dayCardHeader}>
              <Text style={[styles.dayName, isNext && styles.dayNameNext]}>{day.dayName}</Text>
              {isNext && (
                <View style={styles.nextBadge}>
                  <Text style={styles.nextBadgeText}>Up Next</Text>
                </View>
              )}
            </View>
            <View style={styles.dayExercises}>
              {exerciseNames.map((name, i) => (
                <Text key={i} style={styles.dayExerciseName}>· {name}</Text>
              ))}
              {extra > 0 && <Text style={styles.dayMore}>+{extra} more</Text>}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Last Workout */}
      {lastSession && (
        <View style={[globalStyles.card, { marginTop: spacing.md }]}>
          <Text style={globalStyles.subtitle}>Last Workout</Text>
          <View style={styles.lastHeader}>
            <Text style={styles.lastDate}>
              {new Date(lastSession.date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long', month: 'short', day: 'numeric'
              })}
            </Text>
            <Text style={styles.lastSets}>{lastSession.sets.length} sets</Text>
          </View>
          {Object.entries(lastSessionGroups).map(([exId, sets]) => {
            const ex = EXERCISES.find(e => e.id === exId);
            const maxWeight = Math.max(...sets.map(s => s.weight));
            return (
              <View key={exId} style={styles.lastExRow}>
                <Text style={globalStyles.text}>{ex?.name || exId}</Text>
                <Text style={globalStyles.textSecondary}>
                  {sets.length} sets · {maxWeight}lbs
                </Text>
              </View>
            );
          })}
          {lastSession.notes && (
            <Text style={[globalStyles.textSecondary, { marginTop: spacing.sm, fontStyle: 'italic' }]}>
              {lastSession.notes}
            </Text>
          )}
        </View>
      )}

      {/* Quick Links */}
      <View style={styles.quickLinks}>
        <TouchableOpacity
          style={styles.quickLinkBtn}
          onPress={() => navigation.navigate('Analytics')}
        >
          <MaterialCommunityIcons name="chart-bar" size={18} color={colors.text} />
          <Text style={styles.quickLinkBtnText}>View Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickLinkBtn}
          onPress={() => navigation.navigate('Setup', { startNew: true })}
        >
          <MaterialCommunityIcons name="plus-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.quickLinkBtnText, { color: colors.primary }]}>New Program</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  welcome: {
    marginBottom: spacing.md,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primaryBright,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dayCardNext: {
    borderColor: colors.primaryBright,
    backgroundColor: colors.primaryMuted,
  },
  dayCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dayNameNext: {
    color: colors.primaryBright,
  },
  nextBadge: {
    backgroundColor: colors.primaryBright,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  nextBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  dayExercises: {
    marginTop: 2,
  },
  dayExerciseName: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  dayMore: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  lastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lastDate: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  lastSets: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  lastExRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  quickLinks: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  quickLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.xs,
  },
  quickLinkBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
