import { supabase } from './supabase';
import type { UserProgram } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Save user program data to Supabase.
 * Uses upsert on the user_programs table.
 */
export async function saveUserProgram(uid: string, program: UserProgram): Promise<void> {
  const { error } = await supabase
    .from('user_programs')
    .upsert({
      user_id: uid,
      program_data: JSON.stringify(program),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('Failed to save program:', error);
    throw error;
  }
}

/**
 * Remove user program data from Supabase (when user resets).
 */
export async function clearUserProgram(uid: string): Promise<void> {
  const { error } = await supabase
    .from('user_programs')
    .upsert({
      user_id: uid,
      program_data: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('Failed to clear program:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time updates on the user's program.
 * Returns an unsubscribe function.
 *
 * First fetches the current data, then listens for changes.
 */
export function subscribeToProgramChanges(
  uid: string,
  callback: (program: UserProgram | null) => void
): () => void {
  // Fetch current data immediately
  supabase
    .from('user_programs')
    .select('program_data')
    .eq('user_id', uid)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        console.error('Failed to fetch program:', error);
        return;
      }
      if (data?.program_data) {
        try {
          callback(JSON.parse(data.program_data));
        } catch {
          callback(null);
        }
      } else {
        callback(null);
      }
    });

  // Subscribe to real-time changes
  const channel: RealtimeChannel = supabase
    .channel(`user_programs:${uid}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_programs',
        filter: `user_id=eq.${uid}`,
      },
      (payload: any) => {
        const newData = payload.new;
        if (newData?.program_data) {
          try {
            callback(JSON.parse(newData.program_data));
          } catch {
            callback(null);
          }
        } else {
          callback(null);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
