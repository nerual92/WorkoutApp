import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Vibration,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import type { WorkoutSet, WorkoutSession } from 'workout-shared';
import { EXERCISES } from 'workout-shared';
import { generateId, getTodayISO, getWeekProgression, getLastWeightForExercise } from 'workout-shared';
import { useAppContext } from '../AppContext';
import UndoToast from '../components/UndoToast';
import { colors, spacing, globalStyles } from '../theme';

const DRAFT_KEY = 'workoutDraft';

interface WorkoutDraft {
  dayNumber: number;
  sets: WorkoutSet[];
  exerciseIndex: number;
  notes: string;
  savedAt: string;
}

export default function WorkoutScreen() {
  const { userProgram, setUserProgram, workoutDayOverride, setWorkoutDayOverride, showToast } = useAppContext();
  const navigation = useNavigation<any>();

  const activeDayNumber = workoutDayOverride ?? userProgram?.currentDay ?? 1;
  const currentDay = userProgram?.program.days[(activeDayNumber) - 1];
  const weekProgression = getWeekProgression(userProgram?.currentWeek ?? 1);

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSets, setCurrentSets] = useState<WorkoutSet[]>([]);
  const [notes, setNotes] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [repsInput, setRepsInput] = useState('');
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [undoState, setUndoState] = useState<{ set: WorkoutSet; index: number } | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const [editReps, setEditReps] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [repsLocked, setRepsLocked] = useState(true);

  const prevExerciseIndexRef = useRef(currentExerciseIndex);
  const scrollViewRef = useRef<ScrollView>(null);

  const currentExercise = currentDay?.exercises[currentExerciseIndex];
  const exercise = currentExercise ? EXERCISES.find(e => e.id === currentExercise.exerciseId) : null;

  // Merge current + archived sessions for weight lookup
  const allSessions = useMemo(() => {
    if (!userProgram) return [];
    const archived = (userProgram.programHistory || []).flatMap(h => h.sessions);
    return [...userProgram.workoutSessions, ...archived];
  }, [userProgram]);

  const lastWeight = currentExercise
    ? getLastWeightForExercise(currentExercise.exerciseId, allSessions)
    : null;

  // Load draft on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(DRAFT_KEY);
        if (saved) {
          const draft: WorkoutDraft = JSON.parse(saved);
          // Only restore if same day
          if (draft.dayNumber === activeDayNumber && draft.sets.length > 0) {
            setCurrentSets(draft.sets);
            setCurrentExerciseIndex(draft.exerciseIndex);
            setNotes(draft.notes || '');
          }
        }
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
      setDraftLoaded(true);
    })();
  }, []);

  // Save draft whenever sets/notes/exercise change
  useEffect(() => {
    if (!draftLoaded) return;
    const draft: WorkoutDraft = {
      dayNumber: activeDayNumber,
      sets: currentSets,
      exerciseIndex: currentExerciseIndex,
      notes,
      savedAt: new Date().toISOString(),
    };
    if (currentSets.length > 0) {
      AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(console.error);
    } else {
      AsyncStorage.removeItem(DRAFT_KEY).catch(console.error);
    }
  }, [currentSets, currentExerciseIndex, notes, draftLoaded]);

  // Update weight/reps when exercise changes
  useEffect(() => {
    if (currentExercise) {
      const exerciseChanged = prevExerciseIndexRef.current !== currentExerciseIndex;
      prevExerciseIndexRef.current = currentExerciseIndex;

      setRepsInput(weekProgression.reps.toString());

      if (exerciseChanged) {
        if (lastWeight !== null) {
          setWeightInput(lastWeight.toString());
        } else {
          setWeightInput('');
        }
      }
    }
  }, [currentExerciseIndex, currentExercise, lastWeight, weekProgression.reps]);

  // Rest timer
  useEffect(() => {
    if (restTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setRestTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (restTimeRemaining === 0 && isResting) {
      setIsResting(false);
      Vibration.vibrate([0, 300, 100, 300]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [restTimeRemaining, isResting]);

  const setsForCurrentExercise = currentSets.filter(
    s => s.exerciseId === currentExercise?.exerciseId
      && (s.slotIndex === undefined || s.slotIndex === currentExerciseIndex)
  );
  const allSetsComplete = setsForCurrentExercise.length >= weekProgression.sets;

  const handleAddSet = () => {
    const weight = parseFloat(weightInput) || 0;
    const reps = parseInt(repsInput) || 0;

    if (!currentExercise || weight <= 0) {
      showToast('Please enter a valid weight');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const setToAdd: WorkoutSet = {
      exerciseId: currentExercise.exerciseId,
      slotIndex: currentExerciseIndex,
      setNumber: setsForCurrentExercise.length + 1,
      reps: reps > 0 ? reps : weekProgression.reps,
      weight,
    };

    const newSets = [...currentSets, setToAdd];
    setCurrentSets(newSets);
    Keyboard.dismiss();

    // Check if target sets reached
    const setsNow = newSets.filter(s => s.exerciseId === currentExercise.exerciseId
      && (s.slotIndex === undefined || s.slotIndex === currentExerciseIndex));
    if (setsNow.length >= weekProgression.sets) {
      // Move to next exercise
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setRestTimeRemaining(0);
      setIsResting(false);
      if (currentDay && currentExerciseIndex < currentDay.exercises.length - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
      }
    } else {
      // Start rest timer
      setRestTimeRemaining(90);
      setIsResting(true);
    }
  };

  const handleRemoveSet = (setToRemove: WorkoutSet) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const idx = currentSets.indexOf(setToRemove);
    setUndoState({ set: setToRemove, index: idx });
    setCurrentSets(currentSets.filter(s => s !== setToRemove));
  };

  const handleUndoRemove = () => {
    if (undoState) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setCurrentSets(prev => {
        const newSets = [...prev];
        newSets.splice(undoState.index, 0, undoState.set);
        return newSets;
      });
      setUndoState(null);
    }
  };

  const handleStartEdit = (set: WorkoutSet, globalIdx: number) => {
    setEditingSetIndex(globalIdx);
    setEditReps(set.reps.toString());
    setEditWeight(set.weight.toString());
  };

  const handleSaveEdit = () => {
    if (editingSetIndex === null) return;
    const newReps = parseInt(editReps) || 0;
    const newWeight = parseFloat(editWeight) || 0;
    if (newReps <= 0 || newWeight <= 0) {
      showToast('Please enter valid reps and weight', 'warning');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCurrentSets(prev => prev.map((s, i) =>
      i === editingSetIndex ? { ...s, reps: newReps, weight: newWeight } : s
    ));
    setEditingSetIndex(null);
  };

  const handleCancelEdit = () => {
    setEditingSetIndex(null);
  };

  const handleSkipRest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setRestTimeRemaining(0);
    setIsResting(false);
  };

  const handleCompleteWorkout = () => {
    if (currentSets.length === 0) {
      showToast('Add at least one set before completing');
      return;
    }

    Alert.alert(
      'Complete Workout?',
      `Log ${currentSets.length} sets for ${currentDay?.dayName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete & Log',
          onPress: () => {
            if (!userProgram || !currentDay) return;

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

            const session: WorkoutSession = {
              id: generateId(),
              date: getTodayISO(),
              programDay: activeDayNumber,
              sets: currentSets,
              completed: true,
              notes: notes || undefined,
            };

            // Improved week advancement: track which days have been completed this week
            const currentWeekSessions = userProgram.workoutSessions.filter(s => {
              // Count sessions in the current week cycle
              return true; // simplified - count all sessions for this program
            });
            const totalDays = userProgram.program.days.length;
            const completedDays = new Set(
              [...userProgram.workoutSessions, session].map(s => s.programDay)
            );

            let nextDay = userProgram.currentDay;
            let nextWeek = userProgram.currentWeek;

            // Advance to next uncompleted day, or wrap to week+1
            if (activeDayNumber === userProgram.currentDay) {
              // Find the next day that should be done
              let foundNext = false;
              for (let i = 1; i <= totalDays; i++) {
                const candidateDay = ((userProgram.currentDay - 1 + i) % totalDays) + 1;
                if (candidateDay <= userProgram.currentDay) {
                  // We've wrapped around - advance the week
                  nextDay = candidateDay;
                  nextWeek = userProgram.currentWeek < 8
                    ? userProgram.currentWeek + 1
                    : userProgram.currentWeek;
                  foundNext = true;
                  break;
                } else {
                  nextDay = candidateDay;
                  foundNext = true;
                  break;
                }
              }
              if (!foundNext) {
                nextDay = 1;
                nextWeek = userProgram.currentWeek < 8
                  ? userProgram.currentWeek + 1
                  : userProgram.currentWeek;
              }
            }

            const updated = {
              ...userProgram,
              workoutSessions: [...userProgram.workoutSessions, session],
              currentDay: nextDay,
              currentWeek: nextWeek,
            };

            setUserProgram(updated);
            setCurrentSets([]);
            setCurrentExerciseIndex(0);
            setNotes('');
            setRestTimeRemaining(0);
            setIsResting(false);
            setWorkoutDayOverride(null);

            // Clear draft
            AsyncStorage.removeItem(DRAFT_KEY).catch(console.error);

            showToast(`Workout logged! ${currentSets.length} sets recorded.`);
            // Navigation will update automatically; delay to let navigator re-render
            setTimeout(() => {
              try { navigation.navigate('Home'); } catch {}
            }, 100);
          },
        },
      ]
    );
  };

  if (!userProgram) {
    return (
      <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center', padding: spacing.xl }]}>
        <MaterialCommunityIcons name="dumbbell" size={48} color={colors.textMuted} />
        <Text style={[globalStyles.emptyText, { marginTop: spacing.md }]}>
          No program set up yet. Go to Setup to create one.
        </Text>
      </View>
    );
  }

  if (!currentDay) {
    return (
      <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={globalStyles.text}>Invalid day</Text>
      </View>
    );
  }

  const totalSetsNeeded = currentDay.exercises.reduce((sum) => sum + weekProgression.sets, 0);
  const totalSetsComplete = currentSets.length;
  const progressPct = totalSetsNeeded > 0 ? (totalSetsComplete / totalSetsNeeded) * 100 : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={globalStyles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
      {/* Header */}
      <View style={styles.header}>
        <Text style={globalStyles.title}>{currentDay.dayName} — Week {userProgram.currentWeek}</Text>
        <TouchableOpacity
          style={[styles.completeBtn, currentSets.length === 0 && styles.completeBtnDisabled]}
          onPress={handleCompleteWorkout}
          disabled={currentSets.length === 0}
        >
          <MaterialCommunityIcons name="check" size={16} color="#fff" />
          <Text style={styles.completeBtnText}>Complete</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(progressPct, 100)}%` }]} />
        </View>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressLabel}>{totalSetsComplete}/{totalSetsNeeded} sets</Text>
          <Text style={styles.progressLabel}>
            Week {userProgram.currentWeek} · {weekProgression.sets}×{weekProgression.reps}
          </Text>
        </View>
      </View>

      {/* Exercise dots */}
      <View style={styles.dotsRow}>
        {currentDay.exercises.map((ex, idx) => {
          const exSets = currentSets.filter(s => s.exerciseId === ex.exerciseId
            && (s.slotIndex === undefined || s.slotIndex === idx));
          const isDone = exSets.length >= weekProgression.sets;
          const isCurrent = idx === currentExerciseIndex;
          const isPartial = exSets.length > 0 && !isDone;

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dot,
                isDone && styles.dotDone,
                isCurrent && styles.dotCurrent,
                isPartial && styles.dotPartial,
              ]}
              onPress={() => {
                setCurrentExerciseIndex(idx);
                setRestTimeRemaining(0);
                setIsResting(false);
              }}
            >
              <Text style={[styles.dotText, isDone && styles.dotTextDone]}>
                {isDone ? '✓' : idx + 1}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Current exercise card */}
      <View style={globalStyles.card}>
        <Text style={styles.exerciseName}>{exercise?.name || 'Unknown'}</Text>
        <Text style={globalStyles.textSecondary}>
          Target: {weekProgression.sets} sets × {weekProgression.reps} reps
          {exercise?.type === 'dumbbell' ? '  (per dumbbell)' : ''}
        </Text>
        {lastWeight !== null && (
          <Text style={styles.lastWeightText}>Last: {lastWeight}lbs</Text>
        )}
        <Text style={styles.progressInfo}>
          {setsForCurrentExercise.length} / {weekProgression.sets} sets
        </Text>

        {/* Nav arrows */}
        <View style={styles.exerciseNav}>
          <TouchableOpacity
            style={[styles.navBtn, currentExerciseIndex === 0 && styles.navBtnDisabled]}
            onPress={() => {
              if (currentExerciseIndex > 0) {
                setCurrentExerciseIndex(currentExerciseIndex - 1);
                setRestTimeRemaining(0);
                setIsResting(false);
              }
            }}
            disabled={currentExerciseIndex === 0}
          >
            <MaterialCommunityIcons name="chevron-left" size={20} color={currentExerciseIndex === 0 ? colors.textMuted : colors.text} />
            <Text style={[styles.navBtnText, currentExerciseIndex === 0 && styles.navBtnTextDisabled]}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, currentExerciseIndex >= currentDay.exercises.length - 1 && styles.navBtnDisabled]}
            onPress={() => {
              if (currentExerciseIndex < currentDay.exercises.length - 1) {
                setCurrentExerciseIndex(currentExerciseIndex + 1);
                setRestTimeRemaining(0);
                setIsResting(false);
              }
            }}
            disabled={currentExerciseIndex >= currentDay.exercises.length - 1}
          >
            <Text style={[styles.navBtnText, currentExerciseIndex >= currentDay.exercises.length - 1 && styles.navBtnTextDisabled]}>Next</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={currentExerciseIndex >= currentDay.exercises.length - 1 ? colors.textMuted : colors.text} />
          </TouchableOpacity>
        </View>

        {/* Rest timer */}
        {isResting && restTimeRemaining > 0 && (
          <View style={styles.restTimer}>
            <View>
              <Text style={styles.restLabel}>Rest Time</Text>
              <Text style={styles.restValue}>
                {Math.floor(restTimeRemaining / 60)}:{(restTimeRemaining % 60).toString().padStart(2, '0')}
              </Text>
            </View>
            <TouchableOpacity style={styles.skipRestBtn} onPress={handleSkipRest}>
              <MaterialCommunityIcons name="skip-forward" size={16} color="#fff" />
              <Text style={styles.skipRestText}>Skip</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Weight + Reps inputs */}
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.inputLabel}>Reps</Text>
              <TouchableOpacity onPress={() => setRepsLocked(!repsLocked)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons
                  name={repsLocked ? 'lock' : 'lock-open-variant'}
                  size={16}
                  color={repsLocked ? colors.textMuted : colors.primary}
                />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[globalStyles.input, repsLocked && { backgroundColor: colors.background, color: colors.textMuted }]}
              value={repsInput}
              onChangeText={setRepsInput}
              keyboardType="numeric"
              returnKeyType="next"
              showSoftInputOnFocus={true}
              editable={!repsLocked}
              placeholder={weekProgression.reps.toString()}
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Weight (lbs){exercise?.type === 'dumbbell' ? ' per DB' : ''}
            </Text>
            <TextInput
              style={globalStyles.input}
              value={weightInput}
              onChangeText={setWeightInput}
              keyboardType="decimal-pad"
              returnKeyType="done"
              showSoftInputOnFocus={true}
              onSubmitEditing={handleAddSet}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Add set button */}
        <TouchableOpacity
          style={[
            styles.addSetBtn,
            allSetsComplete && styles.addSetBtnDone,
          ]}
          onPress={allSetsComplete ? undefined : handleAddSet}
          disabled={allSetsComplete}
          activeOpacity={0.7}
        >
          <Text style={styles.addSetBtnText}>
            {allSetsComplete
              ? `✓ All ${weekProgression.sets} sets complete`
              : `Add Set ${setsForCurrentExercise.length + 1} of ${weekProgression.sets}`
            }
          </Text>
        </TouchableOpacity>

        {allSetsComplete && (
          <TouchableOpacity style={styles.extraSetBtn} onPress={handleAddSet}>
            <Text style={styles.extraSetBtnText}>+ Add Extra Set</Text>
          </TouchableOpacity>
        )}

        {/* Logged sets */}
        {setsForCurrentExercise.length > 0 && (
          <View style={styles.setsSection}>
            <Text style={[globalStyles.subtitle, { fontSize: 15 }]}>Sets logged:</Text>
            {setsForCurrentExercise.map((set, idx) => {
              const globalIdx = currentSets.indexOf(set);
              const isEditing = editingSetIndex === globalIdx;
              return (
                <View key={idx} style={styles.setRow}>
                  {isEditing ? (
                    <View style={styles.editRow}>
                      <View style={styles.editInputGroup}>
                        <TextInput
                          style={styles.editInput}
                          value={editReps}
                          onChangeText={setEditReps}
                          keyboardType="numeric"
                          placeholder="Reps"
                          selectTextOnFocus
                        />
                        <Text style={styles.editX}>×</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editWeight}
                          onChangeText={setEditWeight}
                          keyboardType="decimal-pad"
                          placeholder="Wt"
                          selectTextOnFocus
                        />
                        <Text style={styles.editUnit}>lbs</Text>
                      </View>
                      <View style={styles.editActions}>
                        <TouchableOpacity onPress={handleSaveEdit}>
                          <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleCancelEdit}>
                          <MaterialCommunityIcons name="close-circle" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={globalStyles.text}>
                        Set {idx + 1}: {set.reps} reps × {set.weight}lbs
                      </Text>
                      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        <TouchableOpacity onPress={() => handleStartEdit(set, globalIdx)}>
                          <MaterialCommunityIcons name="pencil" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleRemoveSet(set)}>
                          <MaterialCommunityIcons name="close-circle-outline" size={20} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Workout summary */}
      {currentSets.length > 0 && (
        <View style={globalStyles.card}>
          <Text style={globalStyles.subtitle}>Summary ({currentSets.length} sets)</Text>
          {currentDay.exercises.map((ex, idx) => {
            const exSets = currentSets.filter(s => s.exerciseId === ex.exerciseId
              && (s.slotIndex === undefined || s.slotIndex === idx));
            if (exSets.length === 0) return null;
            const exData = EXERCISES.find(e => e.id === ex.exerciseId);
            return (
              <Text key={`${idx}-${ex.exerciseId}`} style={globalStyles.text}>
                {exData?.name}: {exSets.length}/{weekProgression.sets} sets
              </Text>
            );
          })}
        </View>
      )}

      {/* Notes */}
      <View style={globalStyles.card}>
        <Text style={styles.inputLabel}>Workout Notes</Text>
        <TextInput
          style={[globalStyles.input, { height: 80, textAlignVertical: 'top' }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="How did you feel? Any PRs?"
          placeholderTextColor={colors.textMuted}
          multiline
        />
      </View>

      <View style={{ height: spacing.xl * 2 }} />
    </ScrollView>
    {undoState && (
      <UndoToast
        message="Set removed"
        onUndo={handleUndoRemove}
        onDismiss={() => setUndoState(null)}
      />
    )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: 4,
  },
  completeBtnDisabled: {
    opacity: 0.4,
  },
  completeBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotCurrent: {
    borderColor: colors.primaryBright,
    backgroundColor: colors.primaryMuted,
  },
  dotDone: {
    borderColor: colors.success,
    backgroundColor: colors.successLight,
  },
  dotPartial: {
    borderColor: colors.warning,
    backgroundColor: colors.warningLight,
  },
  dotText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  dotTextDone: {
    color: colors.success,
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  lastWeightText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  progressInfo: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  exerciseNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: 2,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  navBtnTextDisabled: {
    color: colors.textMuted,
  },
  restTimer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  restLabel: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  restValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.warning,
  },
  skipRestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: 4,
  },
  skipRestText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  addSetBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addSetBtnDone: {
    backgroundColor: colors.success,
  },
  addSetBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  extraSetBtn: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  extraSetBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  setsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  setRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  editInput: {
    width: 56,
    height: 36,
    borderWidth: 1,
    borderColor: colors.primaryBright,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 4,
  },
  editX: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  editUnit: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginLeft: spacing.sm,
  },
});
