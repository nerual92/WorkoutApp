import { WorkoutSession } from './types';
/**
 * Generate a unique ID
 */
export declare function generateId(): string;
/**
 * Get today's date in ISO format
 */
export declare function getTodayISO(): string;
/**
 * Calculate total volume (weight × reps × sets)
 */
export declare function calculateVolume(weight: number, reps: number, sets: number): number;
/**
 * Get the sets and reps for a given week (1-8)
 * Weeks 1-4: 3 sets with increasing reps (8, 10, 12, 15)
 * Weeks 5-8: 4 sets with increasing reps (6, 8, 10, 12)
 */
export declare function getWeekProgression(week: number): {
    sets: number;
    reps: number;
};
/**
 * Get the last weight used for a specific exercise
 */
export declare function getLastWeightForExercise(exerciseId: string, sessions: WorkoutSession[]): number | null;
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
export declare function calculateNextProgression(completedAllSets: boolean, currentSets: number, currentReps: number, currentWeight: number, config: {
    startingSets: number;
    maxSets: number;
    setIncrement?: number;
    startingReps: number;
    maxReps: number;
    repIncrement: number;
    weightIncreasePercent: number;
    weightIncreaseMin: number;
}, weightIncrement?: number): {
    sets: number;
    reps: number;
    weight: number;
};
/**
 * Get default progression config for an exercise category
 * Compound lifts have different progression than accessories
 */
export declare function getDefaultProgressionConfig(isCompound?: boolean): {
    startingSets: number;
    maxSets: number;
    setIncrement: number;
    startingReps: number;
    maxReps: number;
    repIncrement: number;
    weightIncreasePercent: number;
    weightIncreaseMin: number;
};
