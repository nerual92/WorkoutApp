import type { UserProgram } from './types';
/**
 * Save user program data to Supabase.
 * Uses upsert on the user_programs table.
 */
export declare function saveUserProgram(uid: string, program: UserProgram): Promise<void>;
/**
 * Remove user program data from Supabase (when user resets).
 */
export declare function clearUserProgram(uid: string): Promise<void>;
/**
 * Subscribe to real-time updates on the user's program.
 * Returns an unsubscribe function.
 *
 * First fetches the current data, then listens for changes.
 */
export declare function subscribeToProgramChanges(uid: string, callback: (program: UserProgram | null) => void): () => void;
