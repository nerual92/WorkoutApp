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
