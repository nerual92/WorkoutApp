import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PROGRAM_DAY_TEMPLATES, MUSCLE_GROUPS, EXERCISES } from 'workout-shared';
import type { UserProgram, ProgramDay, ArchivedProgram } from 'workout-shared';
import { generateId, getTodayISO } from 'workout-shared';
import { useAppContext } from '../AppContext';
import { colors, spacing, globalStyles } from '../theme';

type SetupStep = 'select' | 'customize' | 'review';

export default function SetupScreen() {
  const { userProgram, setUserProgram, showToast, handleLogout } = useAppContext();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [step, setStep] = useState<SetupStep>('select');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('3-day');
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(0);
  const [dayExerciseSelections, setDayExerciseSelections] = useState<Record<number, Record<number, string>>>({});
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Allow other screens to deep-link into new-program flow via route params
  React.useEffect(() => {
    if (route.params?.startNew) {
      // Clear the param so it doesn't re-trigger on re-render
      navigation.setParams({ startNew: undefined });
      handleNewProgram();
    }
  }, [route.params?.startNew]);

  const initializeDefaultsForDay = (programId: string, dayIndex: number) => {
    const dayTemplates = PROGRAM_DAY_TEMPLATES[programId];
    if (!dayTemplates || !dayTemplates[dayIndex]) return {};

    const defaults: Record<number, string> = {};
    dayTemplates[dayIndex].muscleGroups.forEach((mg, slotIndex) => {
      if (mg.optional) {
        defaults[slotIndex] = 'skip';
        return;
      }
      const muscleGroup = MUSCLE_GROUPS.find(g => g.id === mg.muscleGroupId);
      if (muscleGroup) {
        const defaultExercise = EXERCISES.find(ex => ex.default && muscleGroup.exerciseIds.includes(ex.id));
        if (defaultExercise) {
          defaults[slotIndex] = defaultExercise.id;
        } else if (muscleGroup.exerciseIds.length > 0) {
          defaults[slotIndex] = muscleGroup.exerciseIds[0];
        }
      }
    });
    return defaults;
  };

  const handleProgramSelect = (programId: string) => {
    setSelectedProgramId(programId);
    setCurrentDayIndex(0);

    const dayTemplates = PROGRAM_DAY_TEMPLATES[programId];
    if (dayTemplates) {
      const allDefaults: Record<number, Record<number, string>> = {};
      dayTemplates.forEach((_, index) => {
        allDefaults[index] = initializeDefaultsForDay(programId, index);
      });
      setDayExerciseSelections(allDefaults);
    }
    setStep('customize');
  };

  const handleExerciseChange = (slotIndex: number, exerciseId: string) => {
    setDayExerciseSelections(prev => ({
      ...prev,
      [currentDayIndex]: {
        ...prev[currentDayIndex],
        [slotIndex]: exerciseId,
      }
    }));
  };

  const handleNextDay = () => {
    const dayTemplates = PROGRAM_DAY_TEMPLATES[selectedProgramId];
    if (dayTemplates && currentDayIndex < dayTemplates.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
    } else {
      setStep('review');
    }
  };

  const handlePrevDay = () => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    } else {
      setStep('select');
    }
  };

  const handleEditDay = (dayIndex: number) => {
    setCurrentDayIndex(dayIndex);
    setStep('customize');
  };

  const handleCreateProgram = () => {
    const dayTemplates = PROGRAM_DAY_TEMPLATES[selectedProgramId];
    if (!dayTemplates) return;

    const programDays: ProgramDay[] = dayTemplates.map((dayTemplate, dayIndex) => {
      const filteredExercises: { exerciseId: string; targetSets: number; targetReps: number }[] = [];
      dayTemplate.muscleGroups.forEach((mg, slotIndex) => {
        const exerciseId = dayExerciseSelections[dayIndex]?.[slotIndex];
        if (mg.optional && (!exerciseId || exerciseId === 'skip')) return;
        filteredExercises.push({
          exerciseId: exerciseId || '',
          targetSets: mg.targetSets,
          targetReps: mg.targetReps,
        });
      });
      return {
        dayNumber: dayTemplate.dayNumber,
        dayName: dayTemplate.dayName,
        exercises: filteredExercises,
      };
    });

    // Archive current program if it has sessions
    let programHistory: ArchivedProgram[] | undefined;
    if (userProgram && userProgram.workoutSessions.length > 0) {
      const sessionDates = userProgram.workoutSessions.map(s => s.date).sort();
      const archived: ArchivedProgram = {
        program: userProgram.program,
        sessions: userProgram.workoutSessions,
        startDate: userProgram.createdDate,
        endDate: sessionDates[sessionDates.length - 1],
      };
      programHistory = [...(userProgram.programHistory || []), archived];
    } else if (userProgram?.programHistory?.length) {
      programHistory = userProgram.programHistory;
    }

    const newProgram: UserProgram = {
      id: generateId(),
      createdDate: getTodayISO(),
      program: {
        id: selectedProgramId,
        name: `${dayTemplates.length}-Day Program`,
        days: programDays,
      },
      workoutSessions: [],
      currentWeek: 1,
      currentDay: 1,
      programHistory,
    };

    setUserProgram(newProgram);
    setStep('select');
    setIsCreatingNew(false);
    showToast('Program created! Go to the Home tab to start.');

    // Navigation will update automatically when userProgram changes
    // and the Tab.Navigator re-renders with the Home screen
    setTimeout(() => {
      try { navigation.navigate('Home'); } catch {}
    }, 100);
  };

  const handleNewProgram = () => {
    if (!userProgram) {
      setIsCreatingNew(true);
      setStep('select');
      return;
    }
    Alert.alert(
      'Start New Program?',
      'Your current program and workout history will be archived.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive & Start New', onPress: () => {
            setIsCreatingNew(true);
            setStep('select');
          }
        },
      ]
    );
  };

  const handleCancelSetup = () => {
    setIsCreatingNew(false);
    setStep('select');
    setCurrentDayIndex(0);
    setDayExerciseSelections({});
  };

  const handleExportData = async () => {
    if (!userProgram) return;
    try {
      const json = JSON.stringify(userProgram, null, 2);
      const date = new Date().toISOString().split('T')[0];
      const fileName = `sbs-workout-data-${date}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, json);
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Export Workout Data',
      });
      showToast('Data exported successfully!', 'success');
    } catch (e) {
      console.error('Export failed:', e);
      showToast('Export failed. Please try again.', 'error');
    }
  };

  const handleImportData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri);
      const imported = JSON.parse(content) as UserProgram;

      // Validate required fields
      if (!imported.id || !imported.program || !imported.workoutSessions || !imported.currentWeek || !imported.program.days) {
        showToast('Invalid backup file. Missing required fields.', 'error');
        return;
      }

      const doImport = () => {
        // Archive current program if it has sessions
        let history = imported.programHistory || [];
        if (userProgram && userProgram.workoutSessions.length > 0) {
          const sessionDates = userProgram.workoutSessions.map(s => s.date).sort();
          const archived: ArchivedProgram = {
            program: userProgram.program,
            sessions: userProgram.workoutSessions,
            startDate: userProgram.createdDate,
            endDate: sessionDates[sessionDates.length - 1],
          };
          history = [...(userProgram.programHistory || []), archived, ...history];
        } else if (userProgram?.programHistory) {
          history = [...userProgram.programHistory, ...history];
        }
        const merged = { ...imported, programHistory: history.length > 0 ? history : undefined };
        setUserProgram(merged);
        showToast(`Imported! ${imported.workoutSessions.length} sessions loaded.`, 'success');
      };

      if (userProgram) {
        Alert.alert(
          'Import Data?',
          'This will replace your current program. Your existing data will be archived.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Import', onPress: doImport },
          ]
        );
      } else {
        doImport();
      }
    } catch (e) {
      console.error('Import failed:', e);
      showToast('Import failed. File may be corrupted.', 'error');
    }
  };

  const dayTemplates = PROGRAM_DAY_TEMPLATES[selectedProgramId];
  const currentDayTemplate = dayTemplates?.[currentDayIndex];
  const totalDays = dayTemplates?.length || 0;

  // Settings view when a program already exists and we're on the default step
  if (userProgram && step === 'select' && !isCreatingNew) {
    return (
      <ScrollView style={globalStyles.scrollContainer}>
        <Text style={globalStyles.title}>Settings</Text>

        <View style={globalStyles.card}>
          <Text style={globalStyles.subtitle}>Current Program</Text>
          <Text style={globalStyles.text}>{userProgram.program.name}</Text>
          <Text style={globalStyles.textSecondary}>
            Week {userProgram.currentWeek} · {userProgram.workoutSessions.length} workouts logged
          </Text>
        </View>

        <TouchableOpacity
          style={[globalStyles.button, globalStyles.buttonPrimary, { marginBottom: spacing.md }]}
          onPress={handleNewProgram}
        >
          <Text style={globalStyles.buttonText}>Start New Program</Text>
        </TouchableOpacity>

        {/* Data Management */}
        <View style={globalStyles.card}>
          <Text style={globalStyles.subtitle}>Data Management</Text>

          <TouchableOpacity
            style={[styles.settingsBtn, { marginBottom: spacing.sm }]}
            onPress={handleExportData}
          >
            <MaterialCommunityIcons name="download" size={20} color={colors.primary} />
            <Text style={styles.settingsBtnText}>Export Data (JSON Backup)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsBtn, { marginBottom: spacing.sm }]}
            onPress={handleImportData}
          >
            <MaterialCommunityIcons name="upload" size={20} color={colors.primary} />
            <Text style={styles.settingsBtnText}>Import Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => {
              Alert.alert(
                'Reset All Data?',
                'This will permanently delete your program, workout history, and all settings. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete Everything',
                    style: 'destructive',
                    onPress: () => {
                      setUserProgram(null);
                      showToast('All data has been reset.', 'info');
                    },
                  },
                ]
              );
            }}
          >
            <MaterialCommunityIcons name="delete-outline" size={20} color={colors.danger} />
            <Text style={[styles.settingsBtnText, { color: colors.danger }]}>Reset All Data</Text>
          </TouchableOpacity>
        </View>

        {/* Account */}
        <View style={[globalStyles.card, { marginTop: spacing.md }]}>
          <Text style={globalStyles.subtitle}>Account</Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => {
              Alert.alert(
                'Sign Out?',
                'Your data is synced to the cloud. You can sign back in anytime.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign Out',
                    onPress: handleLogout,
                  },
                ]
              );
            }}
          >
            <MaterialCommunityIcons name="logout" size={20} color={colors.primary} />
            <Text style={styles.settingsBtnText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={globalStyles.scrollContainer}>
      {/* Step 1: Select Program */}
      {step === 'select' && (
        <View>
          <Text style={globalStyles.title}>Select Your Program</Text>
          <Text style={[globalStyles.textSecondary, { marginBottom: spacing.md }]}>
            Choose how many days per week you want to train
          </Text>

          <View style={styles.programGrid}>
            {Object.entries(PROGRAM_DAY_TEMPLATES).map(([id, days]) => (
              <TouchableOpacity
                key={id}
                style={styles.programCard}
                onPress={() => handleProgramSelect(id)}
                activeOpacity={0.7}
              >
                <Text style={styles.programDays}>{days.length}</Text>
                <Text style={styles.programName}>{days.length}-Day Program</Text>
                <Text style={styles.programSubtitle}>{days.length} days per week</Text>
              </TouchableOpacity>
            ))}
          </View>

          {isCreatingNew && userProgram && (
            <TouchableOpacity
              style={[globalStyles.button, { marginTop: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
              onPress={handleCancelSetup}
            >
              <Text style={[globalStyles.buttonText, { color: colors.text }]}>← Cancel & Return to Settings</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Step 2: Customize Day */}
      {step === 'customize' && currentDayTemplate && (
        <View>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              Day {currentDayIndex + 1} of {totalDays}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentDayIndex + 1) / totalDays) * 100}%` },
              ]}
            />
          </View>

          <Text style={[globalStyles.subtitle, { marginTop: spacing.md }]}>
            {currentDayTemplate.dayName}
          </Text>
          <Text style={[globalStyles.textSecondary, { marginBottom: spacing.md }]}>
            Choose exercises for this workout day
          </Text>

          {/* Required exercises */}
          {currentDayTemplate.muscleGroups
            .map((mg, slotIndex) => ({ mg, slotIndex }))
            .filter(({ mg }) => !mg.optional)
            .map(({ mg, slotIndex }) => {
              const muscleGroup = MUSCLE_GROUPS.find(g => g.id === mg.muscleGroupId);
              if (!muscleGroup) return null;
              const selectedExerciseId = dayExerciseSelections[currentDayIndex]?.[slotIndex];
              const availableExercises = EXERCISES.filter(ex =>
                muscleGroup.exerciseIds.includes(ex.id)
              );

              return (
                <View key={`slot-${slotIndex}`} style={styles.exerciseCard}>
                  <View style={styles.exerciseCardHeader}>
                    <Text style={styles.muscleGroupName}>{muscleGroup.name}</Text>
                    <Text style={styles.targetText}>{mg.targetSets} × {mg.targetReps}</Text>
                  </View>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={selectedExerciseId || ''}
                      onValueChange={(val) => handleExerciseChange(slotIndex, val)}
                      style={styles.picker}
                    >
                      {availableExercises.map((ex) => (
                        <Picker.Item key={ex.id} label={ex.name} value={ex.id} />
                      ))}
                    </Picker>
                  </View>
                </View>
              );
            })}

          {/* Optional exercises */}
          {currentDayTemplate.muscleGroups.some(mg => mg.optional) && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={globalStyles.subtitle}>Optional Accessories</Text>
              <Text style={[globalStyles.textSecondary, { marginBottom: spacing.sm }]}>
                Add extra exercises to target specific muscles
              </Text>

              {currentDayTemplate.muscleGroups
                .map((mg, slotIndex) => ({ mg, slotIndex }))
                .filter(({ mg }) => mg.optional)
                .map(({ mg, slotIndex }) => {
                  const muscleGroup = MUSCLE_GROUPS.find(g => g.id === mg.muscleGroupId);
                  if (!muscleGroup) return null;
                  const selectedExerciseId = dayExerciseSelections[currentDayIndex]?.[slotIndex];
                  const availableExercises = EXERCISES.filter(ex =>
                    muscleGroup.exerciseIds.includes(ex.id)
                  );

                  return (
                    <View key={`slot-${slotIndex}-opt`} style={[styles.exerciseCard, styles.optionalCard]}>
                      <View style={styles.exerciseCardHeader}>
                        <Text style={[styles.muscleGroupName, { color: colors.textSecondary }]}>
                          {muscleGroup.name}
                        </Text>
                        <Text style={styles.targetText}>{mg.targetSets} × {mg.targetReps}</Text>
                      </View>
                      <View style={styles.pickerWrapper}>
                        <Picker
                          selectedValue={selectedExerciseId || 'skip'}
                          onValueChange={(val) => handleExerciseChange(slotIndex, val)}
                          style={styles.picker}
                        >
                          <Picker.Item label="-- Skip this accessory --" value="skip" />
                          {availableExercises.map((ex) => (
                            <Picker.Item key={ex.id} label={ex.name} value={ex.id} />
                          ))}
                        </Picker>
                      </View>
                    </View>
                  );
                })}
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[globalStyles.button, globalStyles.buttonOutline, { flex: 1, marginRight: spacing.sm }]}
              onPress={handlePrevDay}
            >
              <Text style={globalStyles.buttonTextOutline}>
                ← {currentDayIndex === 0 ? 'Programs' : 'Previous'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[globalStyles.button, globalStyles.buttonPrimary, { flex: 1 }]}
              onPress={handleNextDay}
            >
              <Text style={globalStyles.buttonText}>
                {currentDayIndex === totalDays - 1 ? 'Review →' : 'Next Day →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 3: Review */}
      {step === 'review' && dayTemplates && (
        <View>
          <Text style={globalStyles.title}>Review Your Program</Text>
          <Text style={[globalStyles.textSecondary, { marginBottom: spacing.md }]}>
            Review your exercise selections before starting
          </Text>

          {dayTemplates.map((dayTemplate, dayIndex) => (
            <View key={dayIndex} style={globalStyles.card}>
              <View style={styles.reviewDayHeader}>
                <Text style={globalStyles.subtitle}>{dayTemplate.dayName}</Text>
                <TouchableOpacity onPress={() => handleEditDay(dayIndex)}>
                  <Text style={styles.editLink}>Edit</Text>
                </TouchableOpacity>
              </View>
              {dayTemplate.muscleGroups.map((mg, slotIndex) => {
                const exerciseId = dayExerciseSelections[dayIndex]?.[slotIndex];
                if (mg.optional && (!exerciseId || exerciseId === 'skip')) return null;
                const exercise = EXERCISES.find(e => e.id === exerciseId);
                return (
                  <View key={`slot-${slotIndex}`} style={styles.reviewExerciseRow}>
                    <Text style={globalStyles.text}>
                      {exercise?.name || 'Not selected'}
                    </Text>
                    <Text style={globalStyles.textSecondary}>
                      {mg.targetSets} × {mg.targetReps}
                      {mg.optional ? '  (optional)' : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[globalStyles.button, globalStyles.buttonOutline, { flex: 1, marginRight: spacing.sm }]}
              onPress={() => setStep('customize')}
            >
              <Text style={globalStyles.buttonTextOutline}>← Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[globalStyles.button, { flex: 1, backgroundColor: colors.success }]}
              onPress={handleCreateProgram}
            >
              <Text style={globalStyles.buttonText}>Start Program</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={{ height: spacing.xl * 2 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  programGrid: {
    gap: spacing.md,
  },
  programCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  programDays: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
  },
  programName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  programSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressRow: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionalCard: {
    borderStyle: 'dashed',
    opacity: 0.85,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  muscleGroupName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  targetText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  pickerWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 2,
  },
  picker: {
    height: 48,
    color: colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  reviewDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editLink: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  reviewExerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  settingsBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});
