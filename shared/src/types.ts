// Exercise categories from the Stronger by Science program
export type ExerciseCategory = 'Compound' | 'Accessory' | 'Calves' | 'Vanity lifts';

export type WeightType = 'dumbbell' | 'barbell' | 'bodyweight' | 'machine';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  type: WeightType;
  default: boolean; // Whether it's pre-selected in setup
}

export interface WorkoutSet {
  exerciseId: string;
  slotIndex?: number; // Which exercise slot in the day this set belongs to (handles duplicate exercises)
  setNumber: number;
  reps: number;
  weight: number; // Per dumbbell if type is 'dumbbell', otherwise total
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  date: string; // ISO date
  programDay: number; // Which day of the program (1-5)
  sets: WorkoutSet[];
  completed: boolean;
  notes?: string;
}

export interface ProgressionConfig {
  startingSets: number;
  maxSets: number;
  setIncrement: number; // Usually 1
  startingReps: number;
  maxReps: number;
  repIncrement: number;
  weightIncreasePercent: number; // e.g., 0.025 for 2.5%
  weightIncreaseMin: number; // Minimum weight increase (e.g., 2.5 or 5 lbs)
}

export interface ProgramExercise {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  targetRPE?: number; // Optional RPE/intensity
  progressionConfig?: ProgressionConfig; // For dynamic progression
  currentSets?: number; // Current week's sets
  currentReps?: number; // Current week's reps
}

export interface ProgramDay {
  dayNumber: number;
  dayName: string; // "Day A", "Day B", etc.
  exercises: ProgramExercise[];
}

export interface Program {
  id: string;
  name: string; // "2-Day", "3-Day", "4-Day", "5-Day"
  days: ProgramDay[]; // Pre-configured days with exercises
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


