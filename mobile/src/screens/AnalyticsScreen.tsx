import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { WorkoutSession, ArchivedProgram } from 'workout-shared';
import { EXERCISES } from 'workout-shared';
import { calculateVolume } from 'workout-shared';
import { useAppContext } from '../AppContext';
import { colors, spacing, globalStyles } from '../theme';

type AnalyticsTab = 'overview' | 'history' | 'trends' | 'past-programs';

export default function AnalyticsScreen() {
  const { userProgram, setUserProgram, showToast } = useAppContext();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [includePastInTrends, setIncludePastInTrends] = useState(true);
  const [selectedProgramIndex, setSelectedProgramIndex] = useState<number>(-1);

  if (!userProgram) {
    return (
      <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <MaterialCommunityIcons name="chart-line" size={48} color={colors.textMuted} />
        <Text style={globalStyles.emptyText}>No data yet. Start logging workouts!</Text>
      </View>
    );
  }

  const sessions = userProgram.workoutSessions;
  const programHistory = userProgram.programHistory || [];
  const currentProgramName = userProgram.program.name;

  const allProgramSessions = [...programHistory.flatMap(h => h.sessions), ...sessions];
  const activeSessions = selectedProgramIndex === -2
    ? allProgramSessions
    : selectedProgramIndex === -1
      ? sessions
      : (programHistory[selectedProgramIndex]?.sessions || []);

  // Exercise stats
  const exerciseStats = new Map<string, {
    totalVolume: number;
    totalSets: number;
    maxWeight: number;
    sessionCount: number;
  }>();

  activeSessions.forEach(session => {
    session.sets.forEach(set => {
      const stats = exerciseStats.get(set.exerciseId) || {
        totalVolume: 0, totalSets: 0, maxWeight: 0, sessionCount: 0,
      };
      stats.totalVolume += calculateVolume(set.weight, set.reps, 1);
      stats.totalSets += 1;
      stats.maxWeight = Math.max(stats.maxWeight, set.weight);
      exerciseStats.set(set.exerciseId, stats);
    });
  });

  exerciseStats.forEach((stats, exerciseId) => {
    stats.sessionCount = activeSessions.filter(s =>
      s.sets.some(set => set.exerciseId === exerciseId)
    ).length;
  });

  const sortedStats = Array.from(exerciseStats.entries())
    .sort(([, a], [, b]) => b.totalVolume - a.totalVolume);

  const uniqueDates = new Set(activeSessions.map(s => s.date));

  // Trends
  const allSessionsForTrends = (includePastInTrends || selectedProgramIndex === -2)
    ? allProgramSessions : activeSessions;
  const usedExerciseIds = Array.from(new Set(
    allSessionsForTrends.flatMap(s => s.sets.map(set => set.exerciseId))
  ));

  const getWeightTrend = (exerciseId: string) => {
    const sorted = [...allSessionsForTrends].sort((a, b) => a.date.localeCompare(b.date));
    return sorted
      .filter(s => s.sets.some(set => set.exerciseId === exerciseId))
      .map(session => {
        const exSets = session.sets.filter(s => s.exerciseId === exerciseId);
        const maxWeight = Math.max(...exSets.map(s => s.weight));
        const totalVolume = exSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        return {
          date: session.date,
          day: session.programDay,
          maxWeight,
          totalVolume,
          sets: exSets.length,
          reps: exSets[0]?.reps || 0,
        };
      });
  };

  const handleRestoreProgram = (archiveIndex: number) => {
    const toRestore = programHistory[archiveIndex];
    if (!toRestore) return;

    Alert.alert(
      'Restore Program?',
      `Archive current program and restore "${toRestore.program.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: () => {
            const newHistory = programHistory.filter((_, i) => i !== archiveIndex);
            if (userProgram.workoutSessions.length > 0) {
              const dates = userProgram.workoutSessions.map(s => s.date).sort();
              newHistory.push({
                program: userProgram.program,
                sessions: userProgram.workoutSessions,
                startDate: userProgram.createdDate,
                endDate: dates[dates.length - 1],
              });
            }

            const restored = {
              ...userProgram,
              id: userProgram.id,
              createdDate: toRestore.startDate,
              program: toRestore.program,
              workoutSessions: toRestore.sessions,
              currentWeek: 1,
              currentDay: 1,
              programHistory: newHistory.length > 0 ? newHistory : undefined,
            };
            setUserProgram(restored);
            showToast(`Restored ${toRestore.program.name}!`);
          },
        },
      ]
    );
  };

  const tabs: { key: AnalyticsTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'history', label: 'History' },
    { key: 'trends', label: 'Trends' },
  ];
  if (programHistory.length > 0) {
    tabs.push({ key: 'past-programs', label: 'Past' });
  }

  return (
    <ScrollView style={globalStyles.scrollContainer}>
      {/* Program picker */}
      {programHistory.length > 0 && (
        <View style={styles.pickerCard}>
          <Text style={styles.pickerLabel}>Viewing:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedProgramIndex}
              onValueChange={(val) => {
                setSelectedProgramIndex(val);
                setExpandedSession(null);
                setSelectedExercise('');
              }}
              style={styles.picker}
            >
              <Picker.Item label="All Programs" value={-2} />
              <Picker.Item label={`${currentProgramName} (current)`} value={-1} />
              {programHistory.map((arch, idx) => {
                const fmt = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                return (
                  <Picker.Item
                    key={idx}
                    label={`${arch.program.name} (${fmt(arch.startDate)} – ${fmt(arch.endDate)})`}
                    value={idx}
                  />
                );
              })}
            </Picker>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {tabs.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Overview */}
      {activeTab === 'overview' && (
        <View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{activeSessions.length}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{uniqueDates.size}</Text>
              <Text style={styles.statLabel}>Unique Days</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {activeSessions.reduce((sum, s) => sum + s.sets.length, 0)}
              </Text>
              <Text style={styles.statLabel}>Total Sets</Text>
            </View>
          </View>

          <View style={globalStyles.card}>
            <Text style={globalStyles.subtitle}>Exercise Performance</Text>
            {sortedStats.length === 0 ? (
              <Text style={globalStyles.textSecondary}>No workout data yet.</Text>
            ) : (
              sortedStats.map(([exerciseId, stats]) => (
                <View key={exerciseId} style={styles.exerciseRow}>
                  <Text style={globalStyles.text}>
                    {EXERCISES.find(e => e.id === exerciseId)?.name || exerciseId}
                  </Text>
                  <Text style={globalStyles.textSecondary}>
                    {stats.totalSets} sets · {stats.maxWeight}lbs max
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <View>
          {activeSessions.length === 0 ? (
            <View style={globalStyles.emptyState}>
              <Text style={globalStyles.emptyText}>No workout history yet.</Text>
            </View>
          ) : (
            [...activeSessions].reverse().map(session => {
              const isExpanded = expandedSession === session.id;
              const exerciseGroups: Record<string, typeof session.sets> = {};
              session.sets.forEach(set => {
                if (!exerciseGroups[set.exerciseId]) exerciseGroups[set.exerciseId] = [];
                exerciseGroups[set.exerciseId].push(set);
              });

              return (
                <TouchableOpacity
                  key={session.id}
                  style={globalStyles.card}
                  onPress={() => setExpandedSession(isExpanded ? null : session.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.historyHeader}>
                    <View>
                      <Text style={styles.historyDate}>
                        {new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric'
                        })}
                      </Text>
                      <Text style={globalStyles.textSecondary}>Day {session.programDay}</Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={globalStyles.textSecondary}>{session.sets.length} sets</Text>
                      <MaterialCommunityIcons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.historyDetail}>
                      {Object.entries(exerciseGroups).map(([exId, sets]) => {
                        const ex = EXERCISES.find(e => e.id === exId);
                        return (
                          <View key={exId} style={styles.historyExercise}>
                            <Text style={[globalStyles.text, { fontWeight: '600' }]}>
                              {ex?.name || exId}
                            </Text>
                            <View style={styles.historyBadges}>
                              {sets.map((set, idx) => (
                                <View key={idx} style={styles.setBadge}>
                                  <Text style={styles.setBadgeText}>
                                    {set.reps}×{set.weight}lbs
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        );
                      })}
                      {session.notes && (
                        <Text style={[globalStyles.textSecondary, { marginTop: spacing.sm, fontStyle: 'italic' }]}>
                          {session.notes}
                        </Text>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      {/* Trends */}
      {activeTab === 'trends' && (
        <View>
          <View style={styles.trendPicker}>
            <Text style={styles.inputLabel}>Select Exercise:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedExercise}
                onValueChange={setSelectedExercise}
                style={styles.picker}
              >
                <Picker.Item label="-- Choose an exercise --" value="" />
                {usedExerciseIds.map(id => (
                  <Picker.Item
                    key={id}
                    label={EXERCISES.find(e => e.id === id)?.name || id}
                    value={id}
                  />
                ))}
              </Picker>
            </View>

            {programHistory.length > 0 && (
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setIncludePastInTrends(!includePastInTrends)}
              >
                <MaterialCommunityIcons
                  name={includePastInTrends ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={22}
                  color={colors.primary}
                />
                <Text style={[globalStyles.text, { marginLeft: spacing.sm }]}>
                  Include past programs
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {selectedExercise && (() => {
            const trend = getWeightTrend(selectedExercise);
            if (trend.length === 0) return (
              <View style={globalStyles.emptyState}>
                <Text style={globalStyles.emptyText}>No data for this exercise</Text>
              </View>
            );

            const maxW = Math.max(...trend.map(t => t.maxWeight));
            const minW = Math.min(...trend.map(t => t.maxWeight));
            const weightRange = maxW - minW;
            const allSameWeight = weightRange === 0;
            const firstW = trend[0].maxWeight;
            const lastW = trend[trend.length - 1].maxWeight;
            const change = lastW - firstW;

            return (
              <View>
                <View style={styles.trendCards}>
                  <View style={styles.trendCard}>
                    <Text style={styles.trendCardLabel}>Current</Text>
                    <Text style={styles.trendCardValue}>{lastW}lbs</Text>
                  </View>
                  <View style={styles.trendCard}>
                    <Text style={styles.trendCardLabel}>Max Ever</Text>
                    <Text style={styles.trendCardValue}>{maxW}lbs</Text>
                  </View>
                  <View style={styles.trendCard}>
                    <Text style={styles.trendCardLabel}>Progress</Text>
                    <Text style={[styles.trendCardValue, { color: change >= 0 ? colors.success : colors.danger }]}>
                      {change >= 0 ? '+' : ''}{change}lbs
                    </Text>
                  </View>
                </View>

                {/* Bar chart */}
                <View style={globalStyles.card}>
                  <Text style={globalStyles.subtitle}>Weight Over Time</Text>
                  <View style={styles.chartContainer}>
                    {trend.map((point, idx) => {
                      const heightPct = allSameWeight
                        ? 70
                        : 20 + ((point.maxWeight - minW) / weightRange) * 80;
                      return (
                        <View key={idx} style={styles.chartBarWrapper}>
                          <Text style={styles.chartBarValue}>{point.maxWeight}</Text>
                          <View style={styles.chartBarTrack}>
                            <View
                              style={[
                                styles.chartBar,
                                { height: `${heightPct}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.chartBarLabel}>
                            {new Date(point.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Session details table */}
                <View style={globalStyles.card}>
                  <Text style={globalStyles.subtitle}>Session Details</Text>
                  {trend.map((point, idx) => (
                    <View key={idx} style={styles.trendRow}>
                      <Text style={globalStyles.text}>
                        {new Date(point.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                      <Text style={globalStyles.textSecondary}>
                        {point.sets}×{point.reps}
                      </Text>
                      <Text style={[globalStyles.text, { fontWeight: '700', color: colors.primary }]}>
                        {point.maxWeight}lbs
                      </Text>
                      <Text style={globalStyles.textSecondary}>
                        Vol: {point.totalVolume}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}

          {!selectedExercise && usedExerciseIds.length > 0 && (
            <View style={globalStyles.emptyState}>
              <Text style={globalStyles.emptyText}>
                Select an exercise above to view its weight progression.
              </Text>
            </View>
          )}
          {usedExerciseIds.length === 0 && (
            <View style={globalStyles.emptyState}>
              <Text style={globalStyles.emptyText}>
                Complete some workouts to see trends!
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Past Programs */}
      {activeTab === 'past-programs' && (
        <View>
          {programHistory.length === 0 ? (
            <View style={globalStyles.emptyState}>
              <Text style={globalStyles.emptyText}>No archived programs yet.</Text>
            </View>
          ) : (
            [...programHistory].reverse().map((arch, idx) => {
              const realIdx = programHistory.length - 1 - idx;
              const totalSets = arch.sessions.reduce((sum, s) => sum + s.sets.length, 0);
              const uniqueExercises = new Set(
                arch.sessions.flatMap(s => s.sets.map(set => set.exerciseId))
              );
              const formatDate = (d: string) =>
                new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

              return (
                <View key={realIdx} style={globalStyles.card}>
                  <View style={styles.pastHeader}>
                    <View style={styles.pastNameRow}>
                      <MaterialCommunityIcons name="archive" size={16} color={colors.textSecondary} />
                      <Text style={[globalStyles.subtitle, { marginLeft: spacing.xs, marginBottom: 0 }]}>
                        {arch.program.name}
                      </Text>
                    </View>
                    <Text style={globalStyles.textSecondary}>
                      {formatDate(arch.startDate)} – {formatDate(arch.endDate)}
                    </Text>
                  </View>

                  <View style={styles.pastStatsRow}>
                    <Text style={globalStyles.textSecondary}>{arch.sessions.length} workouts</Text>
                    <Text style={globalStyles.textSecondary}>{totalSets} sets</Text>
                    <Text style={globalStyles.textSecondary}>{uniqueExercises.size} exercises</Text>
                  </View>

                  {arch.program.days.map(day => (
                    <Text key={day.dayNumber} style={styles.pastDayText}>
                      {day.dayName}: {day.exercises.slice(0, 2).map(ex =>
                        EXERCISES.find(e => e.id === ex.exerciseId)?.name || ex.exerciseId
                      ).join(', ')}
                      {day.exercises.length > 2 ? ` +${day.exercises.length - 2}` : ''}
                    </Text>
                  ))}

                  <TouchableOpacity
                    style={styles.restoreBtn}
                    onPress={() => handleRestoreProgram(realIdx)}
                  >
                    <MaterialCommunityIcons name="restore" size={16} color={colors.primary} />
                    <Text style={styles.restoreBtnText}>Restore Program</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      )}

      <View style={{ height: spacing.xl * 2 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pickerCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    marginTop: spacing.xs,
  },
  pickerWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
    color: colors.text,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  historyDate: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  historyDetail: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  historyExercise: {
    marginBottom: spacing.sm,
  },
  historyBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 4,
  },
  setBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setBadgeText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  trendPicker: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  trendCards: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  trendCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  trendCardLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  trendCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  pastHeader: {
    marginBottom: spacing.sm,
  },
  pastNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pastStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  pastDayText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
  },
  restoreBtnText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    gap: 4,
    marginTop: spacing.sm,
  },
  chartBarWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBarValue: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
    fontWeight: '600',
  },
  chartBarTrack: {
    flex: 1,
    width: '80%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  chartBarLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
});
