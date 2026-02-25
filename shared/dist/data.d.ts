import { Exercise } from './types';
export declare const EXERCISES: Exercise[];
export interface MuscleGroup {
    id: string;
    name: string;
    exerciseIds: string[];
}
export declare const MUSCLE_GROUPS: MuscleGroup[];
export interface ProgramDayTemplate {
    dayNumber: number;
    dayName: string;
    muscleGroups: Array<{
        muscleGroupId: string;
        targetSets: number;
        targetReps: number;
        optional?: boolean;
    }>;
}
export declare const PROGRAM_DAY_TEMPLATES: Record<string, ProgramDayTemplate[]>;
