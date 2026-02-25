export type ExerciseCategory = 'Compound' | 'Accessory' | 'Calves' | 'Vanity lifts';
export type WeightType = 'dumbbell' | 'barbell' | 'bodyweight' | 'machine';
export interface Exercise {
    id: string;
    name: string;
    category: ExerciseCategory;
    type: WeightType;
    default: boolean;
}
export interface WorkoutSet {
    exerciseId: string;
    slotIndex?: number;
    setNumber: number;
    reps: number;
    weight: number;
    notes?: string;
}
export interface WorkoutSession {
    id: string;
    date: string;
    programDay: number;
    sets: WorkoutSet[];
    completed: boolean;
    notes?: string;
}
export interface ProgressionConfig {
    startingSets: number;
    maxSets: number;
    setIncrement: number;
    startingReps: number;
    maxReps: number;
    repIncrement: number;
    weightIncreasePercent: number;
    weightIncreaseMin: number;
}
export interface ProgramExercise {
    exerciseId: string;
    targetSets: number;
    targetReps: number;
    targetRPE?: number;
    progressionConfig?: ProgressionConfig;
    currentSets?: number;
    currentReps?: number;
}
export interface ProgramDay {
    dayNumber: number;
    dayName: string;
    exercises: ProgramExercise[];
}
export interface Program {
    id: string;
    name: string;
    days: ProgramDay[];
}
export interface ArchivedProgram {
    program: Program;
    sessions: WorkoutSession[];
    startDate: string;
    endDate: string;
}
export interface UserProgram {
    id: string;
    createdDate: string;
    program: Program;
    workoutSessions: WorkoutSession[];
    currentWeek: number;
    currentDay: number;
    programHistory?: ArchivedProgram[];
}
