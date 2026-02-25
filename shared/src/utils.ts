import { WorkoutSession } from './types';

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get today's date in ISO format
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Calculate total volume (weight × reps × sets)
 */
export function calculateVolume(weight: number, reps: number, sets: number): number {
  return weight * reps * sets;
}

/**
 * Get the sets and reps for a given week (1-8)
 * Weeks 1-4: 3 sets with increasing reps (8, 10, 12, 15)
 * Weeks 5-8: 4 sets with increasing reps (6, 8, 10, 12)
 */
export function getWeekProgression(week: number): { sets: number; reps: number } {
  const weekProgressions = [
    { week: 1, sets: 3, reps: 8 },
    { week: 2, sets: 3, reps: 10 },
    { week: 3, sets: 3, reps: 12 },
    { week: 4, sets: 3, reps: 15 },
    { week: 5, sets: 4, reps: 6 },
    { week: 6, sets: 4, reps: 8 },
    { week: 7, sets: 4, reps: 10 },
    { week: 8, sets: 4, reps: 12 },
  ];
  
  const progression = weekProgressions.find(p => p.week === week);
  return progression || { sets: 3, reps: 8 }; // Default to week 1
}

/**
 * Get the last weight used for a specific exercise
 */
export function getLastWeightForExercise(
  exerciseId: string,
  sessions: WorkoutSession[]
): number | null {
  console.log('🔎 getLastWeightForExercise:', exerciseId, 'in', sessions.length, 'sessions');
  
  // Sort sessions by date descending to get most recent first
  const sortedSessions = [...sessions].sort((a, b) => 
    b.date.localeCompare(a.date)
  );
  
  for (const session of sortedSessions) {
    const exerciseSets = session.sets.filter(s => s.exerciseId === exerciseId);
    if (exerciseSets.length > 0) {
      // Return the max weight from the most recent session with this exercise
      const maxWeight = Math.max(...exerciseSets.map(s => s.weight));
      console.log('  ✅ Found weight:', maxWeight, 'from session on', session.date, 'with', exerciseSets.length, 'sets');
      return maxWeight;
    }
  }
  
  console.log('  ❌ No previous weight found for', exerciseId);
  return null;
}

/**
 * Calculate next week's progression based on workout completion
 * Implements the Stronger by Science double-progression system:
 * 1. First, add sets (volume)
 * 2. Then, add reps (intensity)  
 * 3. Finally, add weight (load)
 * 
 * @param completedAllSets - Whether all prescribed sets were completed successfully
 * @param currentSets - Current number of sets
 * @param currentReps - Current number of reps
 * @param currentWeight - Current weight
 * @param config - Progression configuration
 * @param weightIncrement - The weight increment to round to (e.g., 2.5 or 5)
 * @returns The next week's sets, reps, and weight
 */
export function calculateNextProgression(
  completedAllSets: boolean,
  currentSets: number,
  currentReps: number,
  currentWeight: number,
  config: {
    startingSets: number;
    maxSets: number;
    setIncrement?: number;
    startingReps: number;
    maxReps: number;
    repIncrement: number;
    weightIncreasePercent: number;
    weightIncreaseMin: number;
  },
  weightIncrement: number = 2.5
): { sets: number; reps: number; weight: number } {
  
  // If workout NOT completed successfully, keep everything the same
  if (!completedAllSets) {
    console.log('⚠️ Not all sets completed - no progression');
    return { sets: currentSets, reps: currentReps, weight: currentWeight };
  }

  const setInc = config.setIncrement || 1;
  
  // Case 1: Not at max sets yet - increase sets by increment
  if (currentSets < config.maxSets) {
    const nextSets = currentSets + setInc;
    console.log(`📈 SETS PROGRESSION: ${currentSets} → ${nextSets} sets (max: ${config.maxSets})`);
    return { 
      sets: nextSets, 
      reps: currentReps, 
      weight: currentWeight 
    };
  }
  
  // Case 2: At max sets, but not at max reps yet - increase reps
  if (currentSets === config.maxSets && currentReps < config.maxReps) {
    const nextReps = currentReps + config.repIncrement;
    console.log(`📈 REPS PROGRESSION: ${currentReps} → ${nextReps} reps (max: ${config.maxReps})`);
    return { 
      sets: currentSets, 
      reps: nextReps, 
      weight: currentWeight 
    };
  }
  
  // Case 3: At max sets AND max reps - increase weight and reset to starting sets/reps
  if (currentSets === config.maxSets && currentReps >= config.maxReps) {
    // Calculate percentage increase
    const percentIncrease = currentWeight * (1 + config.weightIncreasePercent);
    
    // Calculate minimum increment increase
    const incrementIncrease = currentWeight + config.weightIncreaseMin;
    
    // Use the larger of the two, rounded to nearest weightIncrement (usually 2.5 or 5 lbs)
    const nextWeightUnrounded = Math.max(percentIncrease, incrementIncrease);
    const nextWeight = Math.round(nextWeightUnrounded / weightIncrement) * weightIncrement;
    
    console.log(`🏋️ WEIGHT PROGRESSION: ${currentWeight} → ${nextWeight} lbs (reset to ${config.startingSets} sets × ${config.startingReps} reps)`);
    
    return { 
      sets: config.startingSets, 
      reps: config.startingReps, 
      weight: nextWeight 
    };
  }
  
  // Fallback (shouldn't reach here)
  console.log('⚠️ Unexpected progression state - no change');
  return { sets: currentSets, reps: currentReps, weight: currentWeight };
}

/**
 * Get default progression config for an exercise category
 * Compound lifts have different progression than accessories
 */
export function getDefaultProgressionConfig(isCompound: boolean = true): {
  startingSets: number;
  maxSets: number;
  setIncrement: number;
  startingReps: number;
  maxReps: number;
  repIncrement: number;
  weightIncreasePercent: number;
  weightIncreaseMin: number;
} {
  if (isCompound) {
    // Main compound lifts: 3 sets → 5 sets, 6 reps → 12 reps
    return {
      startingSets: 3,
      maxSets: 5,
      setIncrement: 1,
      startingReps: 6,
      maxReps: 12,
      repIncrement: 1,
      weightIncreasePercent: 0.025, // 2.5% increase
      weightIncreaseMin: 5, // Minimum 5 lbs increase
    };
  } else {
    // Accessories: 3 sets → 4 sets, 8 reps → 15 reps
    return {
      startingSets: 3,
      maxSets: 4,
      setIncrement: 1,
      startingReps: 8,
      maxReps: 15,
      repIncrement: 1,
      weightIncreasePercent: 0.05, // 5% increase for accessories
      weightIncreaseMin: 2.5, // Minimum 2.5 lbs increase
    };
  }
}
