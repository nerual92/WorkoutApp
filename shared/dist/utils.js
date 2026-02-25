/**
 * Generate a unique ID
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Get today's date in ISO format
 */
export function getTodayISO() {
    return new Date().toISOString().split('T')[0];
}
/**
 * Calculate total volume (weight × reps × sets)
 */
export function calculateVolume(weight, reps, sets) {
    return weight * reps * sets;
}
/**
 * Get the sets and reps for a given week (1-8)
 * Weeks 1-4: 3 sets with increasing reps (8, 10, 12, 15)
 * Weeks 5-8: 4 sets with increasing reps (6, 8, 10, 12)
 */
export function getWeekProgression(week) {
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
export function getLastWeightForExercise(exerciseId, sessions) {
    // Sort sessions by date descending to get most recent first
    const sortedSessions = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
    for (const session of sortedSessions) {
        const exerciseSets = session.sets.filter(s => s.exerciseId === exerciseId);
        if (exerciseSets.length > 0) {
            // Return the max weight from the most recent session with this exercise
            return Math.max(...exerciseSets.map(s => s.weight));
        }
    }
    return null;
}
