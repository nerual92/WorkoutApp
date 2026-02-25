import React, { useState } from 'react';
import type { UserProgram, WorkoutSet, WorkoutSession, AuthUser } from 'workout-shared';
import { EXERCISES } from 'workout-shared';
import { generateId, getTodayISO, getWeekProgression, getLastWeightForExercise, saveWorkoutSession } from 'workout-shared';
import { Check, Lock, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { useToast } from '../App';
import ConfirmModal from './ConfirmModal';
import './WorkoutTracker.css';

// Inline-editable set row
function SetItemCompact({ set, idx, onUpdateWeight, onUpdateReps, onRemove }: {
  set: WorkoutSet;
  idx: number;
  onUpdateWeight: (w: number) => void;
  onUpdateReps: (r: number) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editWeight, setEditWeight] = useState(set.weight.toString());
  const [editReps, setEditReps] = useState(set.reps.toString());

  const handleSave = () => {
    const w = parseFloat(editWeight) || 0;
    const r = parseInt(editReps) || 0;
    if (w > 0) onUpdateWeight(w);
    if (r > 0) onUpdateReps(r);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="set-item-compact set-item-editing">
        <span className="set-edit-label">Set {idx + 1}:</span>
        <input
          type="number"
          className="set-edit-input"
          value={editReps}
          onChange={e => setEditReps(e.target.value)}
          min="1"
          max="50"
        />
        <span className="set-edit-x">×</span>
        <input
          type="number"
          className="set-edit-input"
          value={editWeight}
          onChange={e => setEditWeight(e.target.value)}
          min="0"
          step="2.5"
        />
        <span className="set-edit-unit">lbs</span>
        <button className="set-edit-save" onClick={handleSave}>✓</button>
        <button className="set-edit-cancel" onClick={() => setEditing(false)}>✕</button>
      </div>
    );
  }

  return (
    <div className="set-item-compact">
      <span>Set {idx + 1}: {set.reps} reps × {set.weight}lbs</span>
      <div className="set-item-actions">
        <button onClick={() => {
          setEditWeight(set.weight.toString());
          setEditReps(set.reps.toString());
          setEditing(true);
        }} className="edit-btn-small" title="Edit set">✎</button>
        <button onClick={onRemove} className="remove-btn-small">✕</button>
      </div>
    </div>
  );
}

interface WorkoutTrackerProps {
  program: UserProgram;
  onUpdate: (program: UserProgram) => void;
  dayOverride?: number | null;
  onComplete?: () => void;
  authUser: AuthUser | null;
}

export default function WorkoutTracker({ program, onUpdate, dayOverride, onComplete, authUser }: WorkoutTrackerProps) {
  const activeDayNumber = dayOverride ?? program.currentDay;
  const currentDay = program.program.days[activeDayNumber - 1];
  const weekProgression = getWeekProgression(program.currentWeek);

  // --- Draft persistence: restore in-progress workout from localStorage ---
  const DRAFT_KEY = 'workoutDraft';

  const loadDraft = (): { sets: WorkoutSet[]; exerciseIndex: number; notes: string } | null => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      // Only restore if it's for the same program + day
      if (draft.programId === program.id && draft.dayNumber === activeDayNumber) {
        return { sets: draft.sets, exerciseIndex: draft.exerciseIndex, notes: draft.notes || '' };
      }
    } catch { /* ignore parse errors */ }
    return null;
  };

  const savedDraft = loadDraft();

  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(savedDraft?.exerciseIndex ?? 0);
  const [currentSets, setCurrentSets] = useState<WorkoutSet[]>(savedDraft?.sets ?? []);
  const [notes, setNotes] = useState(savedDraft?.notes ?? '');
  const [weightInput, setWeightInput] = useState<string>('');
  const [restTimeRemaining, setRestTimeRemaining] = useState<number>(0);
  const [isResting, setIsResting] = useState(false);
  const [repsLocked, setRepsLocked] = useState(true);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const { showToast } = useToast();

  // Save draft on every meaningful state change
  React.useEffect(() => {
    if (currentSets.length > 0 || notes) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        programId: program.id,
        dayNumber: activeDayNumber,
        sets: currentSets,
        exerciseIndex: currentExerciseIndex,
        notes,
      }));
    }
  }, [currentSets, currentExerciseIndex, notes, program.id, activeDayNumber]);

  const clearDraft = () => localStorage.removeItem(DRAFT_KEY);
  
  const currentExercise = currentDay?.exercises[currentExerciseIndex];
  const exercise = currentExercise ? EXERCISES.find(e => e.id === currentExercise.exerciseId) : null;
  
  // Get last weight for this exercise (search current + archived sessions)
  const allSessions = React.useMemo(() => {
    const archived = (program.programHistory || []).flatMap(h => h.sessions);
    const all = [...program.workoutSessions, ...archived];
    console.log('🔍 WorkoutTracker: allSessions calculated', {
      current: program.workoutSessions.length,
      archived: archived.length,
      total: all.length
    });
    return all;
  }, [program.workoutSessions, program.programHistory]);
  
  const lastWeight = React.useMemo(() => {
    if (!currentExercise) return null;
    const weight = getLastWeightForExercise(currentExercise.exerciseId, allSessions);
    console.log('💪 Last weight for', currentExercise.exerciseId, '=', weight);
    return weight;
  }, [currentExercise?.exerciseId, allSessions]);

  const [currentSet, setCurrentSet] = useState<WorkoutSet>({
    exerciseId: currentExercise?.exerciseId || '',
    slotIndex: currentExerciseIndex,
    setNumber: 1,
    reps: currentExercise?.targetReps || 8,
    weight: 0,
  });

  // Update current set when exercise changes
  const prevExerciseIndexRef = React.useRef(currentExerciseIndex);
  const prevExerciseIdRef = React.useRef<string | null>(null);
  
  // Separate effect to populate weight input when exercise changes
  React.useEffect(() => {
    if (currentExercise) {
      const exerciseChanged = prevExerciseIndexRef.current !== currentExerciseIndex || 
                              prevExerciseIdRef.current !== currentExercise.exerciseId;
      
      if (exerciseChanged) {
        console.log('🏋️ Exercise changed to:', currentExercise.exerciseId, 'lastWeight:', lastWeight);
        if (lastWeight !== null) {
          console.log('  → Setting weight input to:', lastWeight);
          setWeightInput(lastWeight.toString());
        } else {
          console.log('  → No last weight, clearing input');
          setWeightInput('');
        }
      }
    }
  }, [currentExerciseIndex, currentExercise?.exerciseId, lastWeight]);
  
  React.useEffect(() => {
    if (currentExercise) {
      const actualReps = weekProgression.reps;
      
      prevExerciseIndexRef.current = currentExerciseIndex;
      prevExerciseIdRef.current = currentExercise.exerciseId;

      setCurrentSet({
        exerciseId: currentExercise.exerciseId,
        slotIndex: currentExerciseIndex,
        setNumber: currentSets.filter(s => s.exerciseId === currentExercise.exerciseId
          && (s.slotIndex === undefined || s.slotIndex === currentExerciseIndex)).length + 1,
        reps: actualReps,
        weight: 0,
      });
      
      setRepsLocked(true);
    }
  }, [currentExerciseIndex, currentExercise, weekProgression.reps, currentSets]);

  // Rest timer countdown
  React.useEffect(() => {
    if (restTimeRemaining > 0) {
      const timer = setTimeout(() => {
        setRestTimeRemaining(restTimeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (restTimeRemaining === 0 && isResting) {
      // Rest complete
      setIsResting(false);
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Rest Complete!', { body: 'Time for your next set' });
      }
    }
  }, [restTimeRemaining, isResting]);

  const handleAddSet = () => {
    const weight = parseFloat(weightInput) || 0;
    if (!currentSet.exerciseId || weight <= 0) {
      showToast('Please enter a valid weight', 'warning');
      return;
    }

    const setToAdd = { ...currentSet, weight };
    const newSets = [...currentSets, setToAdd];
    setCurrentSets(newSets);
    
    // Check if all sets for this exercise are complete (use week progression sets)
    const setsForExercise = newSets.filter(s => s.exerciseId === currentExercise?.exerciseId
      && (s.slotIndex === undefined || s.slotIndex === currentExerciseIndex));
    if (currentExercise && setsForExercise.length >= weekProgression.sets) {
      // Move to next exercise, stop rest timer
      setRestTimeRemaining(0);
      setIsResting(false);
      if (currentExerciseIndex < currentDay.exercises.length - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
      }
    } else {
      // Just increment set number and keep last weight
      setCurrentSet({
        ...currentSet,
        setNumber: currentSet.setNumber + 1,
      });
      // Keep the weight for next set
      
      // Start 90-second rest timer
      setRestTimeRemaining(90);
      setIsResting(true);
      
      // Request notification permission if not already granted
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  };

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1);
      setRestTimeRemaining(0);
      setIsResting(false);
    }
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < currentDay.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setRestTimeRemaining(0);
      setIsResting(false);
    }
  };

  const handleSkipRest = () => {
    setRestTimeRemaining(0);
    setIsResting(false);
  };

  const handleCompleteWorkout = () => {
    if (currentSets.length === 0) {
      showToast('Add at least one set before completing', 'warning');
      return;
    }
    setShowCompleteConfirm(true);
  };

  const confirmCompleteWorkout = () => {
    setShowCompleteConfirm(false);
    
    console.log('🏋️ WORKOUT TRACKER: Starting confirmCompleteWorkout');
    console.log('  Current sessions count:', program.workoutSessions.length);
    console.log('  Current sets to save:', currentSets.length);
    
    const session: WorkoutSession = {
      id: generateId(),
      date: getTodayISO(),
      programDay: activeDayNumber,
      sets: currentSets,
      completed: true,
      notes: notes || undefined,
    };

    // Save individual session to workout_sessions table
    if (authUser) {
      saveWorkoutSession(authUser.id, session, program.program.name)
        .then(() => console.log('💪 Individual session saved to workout_sessions table'))
        .catch(err => console.error('Failed to save individual session:', err));
    } else {
      console.warn('⚠️ Not saving individual session - user not authenticated');
    }

    // Advance the "next up" day pointer
    // If they completed the current "next" day, advance it
    let nextDay = program.currentDay;
    let nextWeek = program.currentWeek;
    if (activeDayNumber === program.currentDay) {
      const isLastDay = program.currentDay >= program.program.days.length;
      nextDay = isLastDay ? 1 : program.currentDay + 1;
      nextWeek = isLastDay && program.currentWeek < 8 ? program.currentWeek + 1 : program.currentWeek;
    }
    
    const updated = {
      ...program,
      workoutSessions: [...program.workoutSessions, session],
      currentDay: nextDay,
      currentWeek: nextWeek,
    };

    console.log('🏋️ WORKOUT TRACKER: Created updated program');
    console.log('  NEW sessions count:', updated.workoutSessions.length);
    console.log('  Calling onUpdate with new data');
    
    onUpdate(updated);
    setCurrentSets([]);
    setCurrentExerciseIndex(0);
    setNotes('');
    setRestTimeRemaining(0);
    setIsResting(false);
    clearDraft();
    
    // Show toast message
    const isLastDay = activeDayNumber >= program.program.days.length;
    if (isLastDay && program.currentWeek < 8) {
      showToast(`Week ${program.currentWeek} complete! Starting Week ${nextWeek}`, 'success');
    } else if (program.currentWeek >= 8 && isLastDay) {
      showToast('Program complete! Amazing work!', 'success');
    } else {
      showToast(`Workout logged! ${currentSets.length} sets recorded.`, 'success');
    }

    // Navigate back to dashboard
    if (onComplete) {
      onComplete();
    }
  };

  if (!currentDay) {
    return <div className="workout-tracker">Invalid day</div>;
  }

  const setsForCurrentExercise = currentSets.filter(s => s.exerciseId === currentExercise?.exerciseId
    && (s.slotIndex === undefined || s.slotIndex === currentExerciseIndex));
  const progressText = currentExercise 
    ? `${setsForCurrentExercise.length} / ${weekProgression.sets} sets`
    : '';
  
  // Calculate total workout progress
  const totalSetsNeeded = currentDay.exercises.reduce((sum, ex) => sum + weekProgression.sets, 0);
  const totalSetsComplete = currentSets.length;

  return (
    <div className="workout-tracker">
      <div className="workout-header">
        <h2>{currentDay.dayName} — Week {program.currentWeek}</h2>
        <button 
          onClick={handleCompleteWorkout} 
          className="complete-btn-top" 
          disabled={currentSets.length === 0}
        >
          <Check size={16} style={{display:'inline',verticalAlign:'middle',marginRight:4}} /> Complete Workout
        </button>
      </div>
      
      <div className="workout-progress">
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${totalSetsNeeded > 0 ? (totalSetsComplete / totalSetsNeeded) * 100 : 0}%` }}
          />
        </div>
        <div className="progress-text-row">
          <span>{totalSetsComplete}/{totalSetsNeeded} sets</span>
          <span>Week {program.currentWeek} &middot; {weekProgression.sets}&times;{weekProgression.reps}</span>
        </div>
      </div>

      {/* Exercise dot indicators */}
      <div className="exercise-dots">
        {currentDay.exercises.map((ex, idx) => {
          const exSets = currentSets.filter(s => s.exerciseId === ex.exerciseId
            && (s.slotIndex === undefined || s.slotIndex === idx));
          const isDone = exSets.length >= weekProgression.sets;
          const isCurrent = idx === currentExerciseIndex;
          const isPartial = exSets.length > 0 && !isDone;
          const exData = EXERCISES.find(e => e.id === ex.exerciseId);
          return (
            <button 
              key={idx}
              className={`exercise-dot ${isDone ? 'dot-done' : ''} ${isCurrent ? 'dot-current' : ''} ${isPartial ? 'dot-partial' : ''}`}
              onClick={() => {
                setCurrentExerciseIndex(idx);
                setRestTimeRemaining(0);
                setIsResting(false);
              }}
              title={`${exData?.name || 'Exercise'}: ${exSets.length}/${weekProgression.sets} sets`}
            >
              {isDone ? '✓' : idx + 1}
            </button>
          );
        })}
      </div>

      <div className="tracker-card">
        <div className="current-exercise-header">
          <div>
            <h3>{exercise?.name}</h3>
            <p className="target-info">
              Target: {weekProgression.sets} sets × {weekProgression.reps} reps
              {exercise?.type === 'dumbbell' && <span className="weight-note"> (per dumbbell)</span>}
              {lastWeight !== null && <span className="last-weight"> | Last: {lastWeight}lbs</span>}
            </p>
            <p className="progress-info">{progressText}</p>
          </div>
        </div>

        <div className="exercise-nav-buttons">
          <button 
            onClick={handlePreviousExercise} 
            disabled={currentExerciseIndex === 0}
            className="nav-btn"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <button 
            onClick={handleNextExercise} 
            disabled={currentExerciseIndex === currentDay.exercises.length - 1}
            className="nav-btn"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>

        {/* Rest Timer */}
        {isResting && restTimeRemaining > 0 && (
          <div className="rest-timer">
            <div className="rest-timer-display">
              <div className="rest-timer-label">Rest Time</div>
              <div className="rest-timer-value">
                {Math.floor(restTimeRemaining / 60)}:{(restTimeRemaining % 60).toString().padStart(2, '0')}
              </div>
            </div>
            <button onClick={handleSkipRest} className="skip-rest-btn">
              <SkipForward size={16} style={{display:'inline',verticalAlign:'middle',marginRight:4}} /> Skip Rest
            </button>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>
              Reps 
              {repsLocked && (
                <button 
                  onClick={() => setRepsLocked(false)} 
                  className="unlock-reps-btn"
                  type="button"
                  title="Override target reps"
                >
                  <Lock size={12} /> Edit
                </button>
              )}
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={currentSet.reps}
              onChange={(e) =>
                setCurrentSet({ ...currentSet, reps: parseInt(e.target.value) || 0 })
              }
              disabled={repsLocked}
              className={repsLocked ? 'locked-input' : ''}
            />
          </div>
          <div className="form-group">
            <label>Weight (lbs) {exercise?.type === 'dumbbell' && '(per DB)'}</label>
            <input
              type="number"
              min="0"
              step="2.5"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <button onClick={handleAddSet} className="add-set-btn" disabled={setsForCurrentExercise.length >= weekProgression.sets}>
          {setsForCurrentExercise.length >= weekProgression.sets
            ? `✓ All ${weekProgression.sets} sets complete`
            : `Add Set ${setsForCurrentExercise.length + 1} of ${weekProgression.sets}`
          }
        </button>

        {setsForCurrentExercise.length >= weekProgression.sets && (
          <button onClick={handleAddSet} className="add-extra-set-btn">
            + Add Extra Set
          </button>
        )}

        {/* Recent sets for current exercise */}
        {setsForCurrentExercise.length > 0 && (
          <div className="recent-sets">
            <h4>Sets for this exercise:</h4>
            {setsForCurrentExercise.map((set, idx) => (
              <SetItemCompact
                key={idx}
                set={set}
                idx={idx}
                onUpdateWeight={(newWeight) => {
                  setCurrentSets(prev => prev.map(s => 
                    s === set ? { ...s, weight: newWeight } : s
                  ));
                }}
                onUpdateReps={(newReps) => {
                  setCurrentSets(prev => prev.map(s => 
                    s === set ? { ...s, reps: newReps } : s
                  ));
                }}
                onRemove={() => {
                  const removedSet = set;
                  const removedIndex = currentSets.indexOf(set);
                  setCurrentSets(currentSets.filter((s) => s !== set));
                  showToast(
                    `Removed Set ${idx + 1} (${set.reps}×${set.weight}lbs)`,
                    'warning',
                    {
                      label: 'Undo',
                      onClick: () => {
                        setCurrentSets(prev => [
                          ...prev.slice(0, removedIndex),
                          removedSet,
                          ...prev.slice(removedIndex),
                        ]);
                      },
                    }
                  );
                }}
              />
            ))}
          </div>
        )}
      </div>

      {currentSets.length > 0 && (
        <div className="sets-summary">
          <h3>Workout Summary ({currentSets.length} total sets)</h3>
          
          {currentDay.exercises.map((ex, idx) => {
            const exSets = currentSets.filter(s => s.exerciseId === ex.exerciseId
              && (s.slotIndex === undefined || s.slotIndex === idx));
            if (exSets.length === 0) return null;
            
            const exData = EXERCISES.find(e => e.id === ex.exerciseId);
            return (
              <div key={`${idx}-${ex.exerciseId}`} className="exercise-summary">
                <strong>{exData?.name}</strong>: {exSets.length}/{weekProgression.sets} sets
              </div>
            );
          })}
        </div>
      )}

      <div className="form-group">
        <label>Workout Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did you feel? Any PRs?"
        />
      </div>

      {showCompleteConfirm && (
        <ConfirmModal
          title="Complete Workout?"
          message={`Log ${currentSets.length} sets for ${currentDay.dayName}?`}
          confirmText="Complete & Log"
          onConfirm={confirmCompleteWorkout}
          onCancel={() => setShowCompleteConfirm(false)}
        />
      )}
    </div>
  );
}
