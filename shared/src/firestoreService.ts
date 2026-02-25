import { supabase } from './supabase';
import type { UserProgram, WorkoutSession } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Save individual workout session to workout_sessions table
 */
export async function saveWorkoutSession(
  uid: string, 
  session: WorkoutSession, 
  programName: string
): Promise<void> {
  console.log('💪 saveWorkoutSession called:', {
    uid,
    sessionId: session.id,
    date: session.date,
    programDay: session.programDay,
    setsCount: session.sets.length
  });

  const { error } = await supabase
    .from('workout_sessions')
    .upsert({
      id: session.id,
      user_id: uid,
      date: session.date,
      program_name: programName,
      program_day: session.programDay,
      sets: session.sets,
      completed: session.completed,
      notes: session.notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    console.error('Failed to save workout session:', error);
    throw error;
  }

  console.log('💪 saveWorkoutSession success');
}

/**
 * Save user program data to Supabase.
 * Uses upsert on the user_programs table.
 */
export async function saveUserProgram(uid: string, program: UserProgram): Promise<void> {
  console.log('🗄️ saveUserProgram called:', {
    uid,
    sessionsCount: program.workoutSessions.length,
    currentDay: program.currentDay,
    currentWeek: program.currentWeek
  });
  
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
  
  console.log('🗄️ saveUserProgram success');
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
          const program = JSON.parse(data.program_data);
          console.log('📥 Fetched initial program from Supabase:', {
            sessionsCount: program.workoutSessions?.length || 0,
            currentDay: program.currentDay,
            currentWeek: program.currentWeek
          });
          callback(program);
        } catch (err) {
          console.error('Failed to parse program data:', err);
          callback(null);
        }
      } else {
        console.log('📥 No program data in Supabase');
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
        console.log('📡 Real-time update from Supabase:', payload.eventType);
        const newData = payload.new;
        if (newData?.program_data) {
          try {
            const program = JSON.parse(newData.program_data);
            console.log('📡 Received program update:', {
              sessionsCount: program.workoutSessions?.length || 0,
              currentDay: program.currentDay,
              currentWeek: program.currentWeek
            });
            callback(program);
          } catch (err) {
            console.error('Failed to parse real-time program data:', err);
            callback(null);
          }
        } else {
          console.log('📡 Real-time update with no program data');
          callback(null);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
