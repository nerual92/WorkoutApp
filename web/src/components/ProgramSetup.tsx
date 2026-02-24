import React, { useState } from 'react';
import { PROGRAM_DAY_TEMPLATES, MUSCLE_GROUPS, EXERCISES } from 'workout-shared';
import type { UserProgram, ProgramDay } from 'workout-shared';
import { generateId, getTodayISO } from 'workout-shared';
import './ProgramSetup.css';

interface ProgramSetupProps {
  onProgramCreated: (program: UserProgram) => void;
}

type SetupStep = 'select' | 'customize' | 'review';

export default function ProgramSetup({ onProgramCreated }: ProgramSetupProps) {
  const [step, setStep] = useState<SetupStep>('select');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('3-day');
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(0);
  
  // Store exercise selections per day and slot index (position in muscleGroups array)
  // Format: { dayIndex: { slotIndex: exerciseId } }
  const [dayExerciseSelections, setDayExerciseSelections] = useState<Record<number, Record<number, string>>>({});

  const initializeDefaultsForDay = (programId: string, dayIndex: number) => {
    const dayTemplates = PROGRAM_DAY_TEMPLATES[programId];
    if (!dayTemplates || !dayTemplates[dayIndex]) return {};
    
    const defaults: Record<number, string> = {};
    dayTemplates[dayIndex].muscleGroups.forEach((mg, slotIndex) => {
      // Skip optional accessories by default
      if (mg.optional) {
        defaults[slotIndex] = 'skip';
        return;
      }
      
      const muscleGroup = MUSCLE_GROUPS.find(g => g.id === mg.muscleGroupId);
      if (muscleGroup) {
        const defaultExercise = EXERCISES.find(ex => ex.default && muscleGroup.exerciseIds.includes(ex.id));
        if (defaultExercise) {
          defaults[slotIndex] = defaultExercise.id;
        } else if (muscleGroup.exerciseIds.length > 0) {
          defaults[slotIndex] = muscleGroup.exerciseIds[0];
        }
      }
    });
    return defaults;
  };

  const handleProgramSelect = (programId: string) => {
    setSelectedProgramId(programId);
    setCurrentDayIndex(0);
    
    // Initialize all days with defaults using the passed programId (not stale state)
    const dayTemplates = PROGRAM_DAY_TEMPLATES[programId];
    if (dayTemplates) {
      const allDefaults: Record<number, Record<string, string>> = {};
      dayTemplates.forEach((_, index) => {
        allDefaults[index] = initializeDefaultsForDay(programId, index);
      });
      setDayExerciseSelections(allDefaults);
    }
    
    setStep('customize');
  };

  const handleExerciseChange = (slotIndex: number, exerciseId: string) => {
    setDayExerciseSelections(prev => ({
      ...prev,
      [currentDayIndex]: {
        ...prev[currentDayIndex],
        [slotIndex]: exerciseId,
      }
    }));
  };

  const handleNextDay = () => {
    const dayTemplates = PROGRAM_DAY_TEMPLATES[selectedProgramId];
    if (dayTemplates && currentDayIndex < dayTemplates.length - 1) {
      setCurrentDayIndex(currentDayIndex + 1);
    } else {
      setStep('review');
    }
  };

  const handlePrevDay = () => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    } else {
      setStep('select');
    }
  };

  const handleEditDay = (dayIndex: number) => {
    setCurrentDayIndex(dayIndex);
    setStep('customize');
  };

  const handleCreateProgram = () => {
    const dayTemplates = PROGRAM_DAY_TEMPLATES[selectedProgramId];
    if (!dayTemplates) return;

    // Build program days from day-by-day selections
    const programDays: ProgramDay[] = dayTemplates.map((dayTemplate, dayIndex) => {
      // Track which slots survive filtering so we can map back to slot indices
      const filteredExercises: { exerciseId: string; targetSets: number; targetReps: number }[] = [];
      dayTemplate.muscleGroups.forEach((mg, slotIndex) => {
        const exerciseId = dayExerciseSelections[dayIndex]?.[slotIndex];
        if (mg.optional && (!exerciseId || exerciseId === 'skip')) return;
        filteredExercises.push({
          exerciseId: exerciseId || '',
          targetSets: mg.targetSets,
          targetReps: mg.targetReps,
        });
      });
      return {
        dayNumber: dayTemplate.dayNumber,
        dayName: dayTemplate.dayName,
        exercises: filteredExercises,
      };
    });

    const userProgram: UserProgram = {
      id: generateId(),
      createdDate: getTodayISO(),
      program: {
        id: selectedProgramId,
        name: `${dayTemplates.length}-Day Program`,
        days: programDays,
      },
      workoutSessions: [],
      currentWeek: 1,
      currentDay: 1,
    };

    onProgramCreated(userProgram);
  };

  const dayTemplates = PROGRAM_DAY_TEMPLATES[selectedProgramId];
  const currentDayTemplate = dayTemplates?.[currentDayIndex];
  const totalDays = dayTemplates?.length || 0;

  return (
    <div className="program-setup">
      <h2>Setup Your Workout Program</h2>

      {step === 'select' && (
        <div className="setup-section">
          <h3>Select Your Program</h3>
          <p>Choose how many days per week you want to train</p>
          <div className="program-grid">
            {Object.entries(PROGRAM_DAY_TEMPLATES).map(([id, days]) => (
              <button
                key={id}
                onClick={() => handleProgramSelect(id)}
                className="program-card"
              >
                <span className="program-days">{days.length}</span>
                <span className="program-name">{days.length}-Day Program</span>
                <span className="program-subtitle">{days.length} days per week</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'customize' && currentDayTemplate && (
        <div className="setup-section">
          {/* Progress indicator */}
          <div className="progress-indicator">
            <span className="progress-text">Day {currentDayIndex + 1} of {totalDays}</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentDayIndex + 1) / totalDays) * 100}%` }}
              />
            </div>
          </div>

          <h3>{currentDayTemplate.dayName}</h3>
          <p>Choose exercises for this workout day</p>
          
          <div className="muscle-group-selection">
            {/* Required exercises */}
            <table className="exercise-table">
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th>Muscle Group</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {currentDayTemplate.muscleGroups
                  .map((mg, slotIndex) => ({ mg, slotIndex }))
                  .filter(({ mg }) => !mg.optional)
                  .map(({ mg, slotIndex }) => {
                    const muscleGroup = MUSCLE_GROUPS.find(g => g.id === mg.muscleGroupId);
                    if (!muscleGroup) return null;

                    const selectedExerciseId = dayExerciseSelections[currentDayIndex]?.[slotIndex];
                    const availableExercises = EXERCISES.filter(ex => 
                      muscleGroup.exerciseIds.includes(ex.id)
                    );

                    return (
                      <tr key={`slot-${slotIndex}`}>
                        <td>
                          <select
                            value={selectedExerciseId || ''}
                            onChange={(e) => handleExerciseChange(slotIndex, e.target.value)}
                            className="exercise-select"
                          >
                            {availableExercises.map((ex) => (
                              <option key={ex.id} value={ex.id}>
                                {ex.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="muscle-group-name">{muscleGroup.name}</td>
                        <td className="target-info">{mg.targetSets} × {mg.targetReps}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>

            {/* Optional accessories */}
            {currentDayTemplate.muscleGroups.some(mg => mg.optional) && (
              <>
                <div className="optional-section-header">
                  <h4>Optional Accessories</h4>
                  <p>Add 2-3 additional exercises to target specific muscles</p>
                </div>
                <table className="exercise-table optional-table">
                  <thead>
                    <tr>
                      <th>Exercise</th>
                      <th>Muscle Group</th>
                      <th>Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentDayTemplate.muscleGroups
                      .map((mg, slotIndex) => ({ mg, slotIndex }))
                      .filter(({ mg }) => mg.optional)
                      .map(({ mg, slotIndex }) => {
                        const muscleGroup = MUSCLE_GROUPS.find(g => g.id === mg.muscleGroupId);
                        if (!muscleGroup) return null;

                        const selectedExerciseId = dayExerciseSelections[currentDayIndex]?.[slotIndex];
                        const availableExercises = EXERCISES.filter(ex => 
                          muscleGroup.exerciseIds.includes(ex.id)
                        );

                        return (
                          <tr key={`slot-${slotIndex}-optional`}>
                            <td>
                              <select
                                value={selectedExerciseId || 'skip'}
                                onChange={(e) => handleExerciseChange(slotIndex, e.target.value)}
                                className="exercise-select optional-select"
                              >
                                <option value="skip">-- Skip this accessory --</option>
                                {availableExercises.map((ex) => (
                                  <option key={ex.id} value={ex.id}>
                                    {ex.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="muscle-group-name optional-label">{muscleGroup.name}</td>
                            <td className="target-info">{mg.targetSets} × {mg.targetReps}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </>
            )}
          </div>

          <div className="button-group">
            <button onClick={handlePrevDay} className="back-button">
              ← {currentDayIndex === 0 ? 'Back to Programs' : 'Previous Day'}
            </button>
            <button onClick={handleNextDay} className="next-button">
              {currentDayIndex === totalDays - 1 ? 'Review Program →' : 'Next Day →'}
            </button>
          </div>
        </div>
      )}

      {step === 'review' && dayTemplates && (
        <div className="setup-section">
          <h3>Review Your Program</h3>
          <p>Review your exercise selections before starting</p>
          
          <div className="program-days-list">
            {dayTemplates.map((dayTemplate, dayIndex) => (
              <div key={dayIndex} className="day-card">
                <div className="day-header">
                  <h4>{dayTemplate.dayName}</h4>
                  <button 
                    onClick={() => handleEditDay(dayIndex)} 
                    className="edit-button"
                  >
                    Edit
                  </button>
                </div>
                <ul className="exercise-list">
                  {dayTemplate.muscleGroups.map((mg, slotIndex) => {
                    const exerciseId = dayExerciseSelections[dayIndex]?.[slotIndex];
                    // Skip optional exercises that were not selected
                    if (mg.optional && (!exerciseId || exerciseId === 'skip')) {
                      return null;
                    }
                    const exercise = EXERCISES.find(e => e.id === exerciseId);
                    return (
                      <li key={`slot-${slotIndex}`}>
                        <strong>{exercise?.name || 'Not selected'}</strong>: {mg.targetSets} × {mg.targetReps}
                        {mg.optional && <span className="optional-badge">Optional</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="button-group">
            <button onClick={() => setStep('customize')} className="back-button">
              ← Back to Edit
            </button>
            <button onClick={handleCreateProgram} className="create-button">
              Start This Program
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
