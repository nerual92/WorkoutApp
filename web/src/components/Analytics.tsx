import React, { useState } from 'react';
import type { WorkoutSession, ArchivedProgram } from 'workout-shared';
import { EXERCISES } from 'workout-shared';
import { calculateVolume } from 'workout-shared';
import { ChevronUp, ChevronDown, FileText, Archive } from 'lucide-react';
import './Analytics.css';

interface AnalyticsProps {
  sessions: WorkoutSession[];
  programHistory?: ArchivedProgram[];
  currentProgramName?: string;
  onRestoreProgram?: (archiveIndex: number) => void;
}

type AnalyticsTab = 'overview' | 'history' | 'trends' | 'past-programs';

export default function Analytics({ sessions, programHistory = [], currentProgramName = 'Current Program', onRestoreProgram }: AnalyticsProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [includePastInTrends, setIncludePastInTrends] = useState(true);
  // -2 = all programs, -1 = current program, 0..n = archived program index
  const [selectedProgramIndex, setSelectedProgramIndex] = useState<number>(-1);

  // Derive which sessions to show based on selected program
  const allProgramSessions = [...programHistory.flatMap(h => h.sessions), ...sessions];
  const activeSessions = selectedProgramIndex === -2
    ? allProgramSessions
    : selectedProgramIndex === -1
      ? sessions
      : (programHistory[selectedProgramIndex]?.sessions || []);
  const activeProgramName = selectedProgramIndex === -1
    ? currentProgramName
    : (programHistory[selectedProgramIndex]?.program.name || 'Unknown Program');

  // Calculate stats by exercise
  const exerciseStats = new Map<string, {
    totalVolume: number;
    totalSets: number;
    maxWeight: number;
    sessionCount: number;
  }>();

  activeSessions.forEach(session => {
    session.sets.forEach(set => {
      const stats = exerciseStats.get(set.exerciseId) || {
        totalVolume: 0,
        totalSets: 0,
        maxWeight: 0,
        sessionCount: 0,
      };

      const volume = calculateVolume(set.weight, set.reps, 1);
      stats.totalVolume += volume;
      stats.totalSets += 1;
      stats.maxWeight = Math.max(stats.maxWeight, set.weight);

      exerciseStats.set(set.exerciseId, stats);
    });
  });

  // Mark session count
  const uniqueDates = new Set(activeSessions.map(s => s.date));
  exerciseStats.forEach((stats, exerciseId) => {
    stats.sessionCount = activeSessions.filter(s =>
      s.sets.some(set => set.exerciseId === exerciseId)
    ).length;
  });

  const sortedStats = Array.from(exerciseStats.entries())
    .sort(([, a], [, b]) => b.totalVolume - a.totalVolume);

  // Get all unique exercise IDs from history (+ archived if toggle is on)
  const allSessionsForTrends = (includePastInTrends || selectedProgramIndex === -2)
    ? allProgramSessions
    : activeSessions;
  const usedExerciseIds = Array.from(new Set(
    allSessionsForTrends.flatMap(s => s.sets.map(set => set.exerciseId))
  ));

  // Build weight trend for selected exercise
  const getWeightTrend = (exerciseId: string) => {
    const sortedSessions = [...allSessionsForTrends].sort((a, b) => a.date.localeCompare(b.date));
    
    return sortedSessions
      .filter(s => s.sets.some(set => set.exerciseId === exerciseId))
      .map(session => {
        const exerciseSets = session.sets.filter(s => s.exerciseId === exerciseId);
        const maxWeight = Math.max(...exerciseSets.map(s => s.weight));
        const avgWeight = exerciseSets.reduce((sum, s) => sum + s.weight, 0) / exerciseSets.length;
        const totalVolume = exerciseSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
        return {
          date: session.date,
          day: session.programDay,
          maxWeight,
          avgWeight: Math.round(avgWeight * 10) / 10,
          totalVolume,
          sets: exerciseSets.length,
          reps: exerciseSets[0]?.reps || 0,
        };
      });
  };

  return (
    <div className="analytics">
      <h2>Progress Analytics</h2>

      {/* Program selector — only show if there are past programs */}
      {programHistory.length > 0 && (
        <div className="analytics-program-picker">
          <label>Viewing:</label>
          <select
            value={selectedProgramIndex}
            onChange={(e) => {
              setSelectedProgramIndex(Number(e.target.value));
              setExpandedSession(null);
              setSelectedExercise('');
            }}
            className="program-picker-select"
          >
            <option value={-2}>All Programs</option>
            <option value={-1}>{currentProgramName} (current)</option>
            {[...programHistory].map((arch, idx) => {
              const formatDate = (d: string) =>
                new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
              return (
                <option key={idx} value={idx}>
                  {arch.program.name} ({formatDate(arch.startDate)} – {formatDate(arch.endDate)})
                </option>
              );
            })}
          </select>
        </div>
      )}

      <div className="analytics-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button 
          className={`tab-btn ${activeTab === 'trends' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          Trends
        </button>
        {programHistory.length > 0 && (
          <button 
            className={`tab-btn ${activeTab === 'past-programs' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('past-programs')}
          >
            Past Programs
          </button>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="stats-summary">
            <div className="stat-card">
              <div className="stat-label">Total Workouts</div>
              <div className="stat-value">{activeSessions.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Unique Days</div>
              <div className="stat-value">{uniqueDates.size}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Sets</div>
              <div className="stat-value">
                {activeSessions.reduce((sum, s) => sum + s.sets.length, 0)}
              </div>
            </div>
          </div>

          <div className="exercise-stats">
            <h3>Exercise Performance</h3>
            <div className="stats-table">
              <div className="table-header">
                <div className="col-exercise">Exercise</div>
                <div className="col-sets">Sets</div>
                <div className="col-weight">Max Weight</div>
                <div className="col-volume">Total Volume</div>
              </div>
              {sortedStats.map(([exerciseId, stats]) => (
                <div key={exerciseId} className="table-row">
                  <div className="col-exercise">
                    {EXERCISES.find(e => e.id === exerciseId)?.name || exerciseId}
                  </div>
                  <div className="col-sets">{stats.totalSets}</div>
                  <div className="col-weight">{stats.maxWeight}lbs</div>
                  <div className="col-volume">{Math.round(stats.totalVolume)}</div>
                </div>
              ))}
              {sortedStats.length === 0 && (
                <div className="empty-state">
                  <p>No workout data yet. Start logging workouts to see your progress!</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="history-section">
          {activeSessions.length === 0 ? (
            <div className="empty-state">
              <p>No workout history yet. Complete a workout to see it here!</p>
            </div>
          ) : (
            <div className="history-list">
              {[...activeSessions].reverse().map(session => {
                const isExpanded = expandedSession === session.id;
                // Group sets by exercise for display
                const exerciseGroups: Record<string, typeof session.sets> = {};
                session.sets.forEach(set => {
                  if (!exerciseGroups[set.exerciseId]) exerciseGroups[set.exerciseId] = [];
                  exerciseGroups[set.exerciseId].push(set);
                });
                
                return (
                  <div key={session.id} className={`history-card ${isExpanded ? 'history-expanded' : ''}`}>
                    <div 
                      className="history-card-header"
                      onClick={() => setExpandedSession(isExpanded ? null : session.id)}
                    >
                      <div className="history-card-left">
                        <span className="history-date">
                          {new Date(session.date + 'T00:00:00').toLocaleDateString('en-US', { 
                            weekday: 'short', month: 'short', day: 'numeric' 
                          })}
                        </span>
                        <span className="history-day">Day {session.programDay}</span>
                      </div>
                      <div className="history-card-right">
                        <span className="history-sets">{session.sets.length} sets</span>
                        <span className="history-chevron">{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="history-detail">
                        {Object.entries(exerciseGroups).map(([exId, sets]) => {
                          const ex = EXERCISES.find(e => e.id === exId);
                          return (
                            <div key={exId} className="history-exercise">
                              <div className="history-exercise-name">{ex?.name || exId}</div>
                              <div className="history-exercise-sets">
                                {sets.map((set, idx) => (
                                  <span key={idx} className="history-set-badge">
                                    {set.reps}×{set.weight}lbs
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {session.notes && (
                          <div className="history-notes"><FileText size={14} style={{display:'inline',verticalAlign:'middle',marginRight:4}} /> {session.notes}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="trends-section">
          <div className="trend-selector">
            <label>Select Exercise:</label>
            <select 
              value={selectedExercise} 
              onChange={(e) => setSelectedExercise(e.target.value)}
              className="trend-select"
            >
              <option value="">-- Choose an exercise --</option>
              {usedExerciseIds.map(id => (
                <option key={id} value={id}>
                  {EXERCISES.find(e => e.id === id)?.name || id}
                </option>
              ))}
            </select>
            {programHistory.length > 0 && (
              <label className="trend-toggle">
                <input
                  type="checkbox"
                  checked={includePastInTrends}
                  onChange={(e) => setIncludePastInTrends(e.target.checked)}
                />
                Include past programs
              </label>
            )}
          </div>

          {selectedExercise && (() => {
            const trend = getWeightTrend(selectedExercise);
            if (trend.length === 0) return <div className="empty-state"><p>No data for this exercise</p></div>;
            
            const maxWeightInTrend = Math.max(...trend.map(t => t.maxWeight));
            const minWeightInTrend = Math.min(...trend.map(t => t.maxWeight));
            const weightRange = maxWeightInTrend - minWeightInTrend;
            const allSameWeight = weightRange === 0;
            const firstWeight = trend[0].maxWeight;
            const lastWeight = trend[trend.length - 1].maxWeight;
            const change = lastWeight - firstWeight;
            
            return (
              <div className="trend-display">
                <div className="trend-summary-cards">
                  <div className="trend-card">
                    <div className="trend-card-label">Current</div>
                    <div className="trend-card-value">{lastWeight}lbs</div>
                  </div>
                  <div className="trend-card">
                    <div className="trend-card-label">Max Ever</div>
                    <div className="trend-card-value">{maxWeightInTrend}lbs</div>
                  </div>
                  <div className="trend-card">
                    <div className="trend-card-label">Progress</div>
                    <div className={`trend-card-value ${change >= 0 ? 'trend-up' : 'trend-down'}`}>
                      {change >= 0 ? '+' : ''}{change}lbs
                    </div>
                  </div>
                </div>

                {/* Simple bar chart */}
                <div className="trend-chart">
                  <h4>Weight Over Time</h4>
                  <div className="chart-bars">
                    {trend.map((point, idx) => (
                      <div key={idx} className="chart-bar-wrapper" title={`${new Date(point.date + 'T00:00:00').toLocaleDateString()}: ${point.maxWeight}lbs (${point.sets}×${point.reps})`}>
                        <div className="chart-bar-value">{point.maxWeight}</div>
                        <div 
                          className="chart-bar" 
                          style={{ 
                            height: allSameWeight
                              ? '70%'
                              : `${20 + ((point.maxWeight - minWeightInTrend) / weightRange) * 80}%`,
                          }}
                        />
                        <div className="chart-bar-label">
                          {new Date(point.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detailed session table */}
                <div className="trend-table">
                  <h4>Session Details</h4>
                  <div className="trend-table-header">
                    <span>Date</span>
                    <span>Day</span>
                    <span>Sets</span>
                    <span>Max Weight</span>
                    <span>Volume</span>
                  </div>
                  {trend.map((point, idx) => (
                    <div key={idx} className="trend-table-row">
                      <span>{new Date(point.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span>Day {point.day}</span>
                      <span>{point.sets}×{point.reps}</span>
                      <span className="trend-weight">{point.maxWeight}lbs</span>
                      <span>{point.totalVolume}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {!selectedExercise && usedExerciseIds.length > 0 && (
            <div className="empty-state">
              <p>Select an exercise above to view its weight progression over time.</p>
            </div>
          )}
          {usedExerciseIds.length === 0 && (
            <div className="empty-state">
              <p>Complete some workouts to see exercise trends here!</p>
            </div>
          )}
        </div>
      )}

      {/* Past Programs Tab */}
      {activeTab === 'past-programs' && (
        <div className="past-programs-section">
          {programHistory.length === 0 ? (
            <div className="empty-state">
              <p>No archived programs yet.</p>
            </div>
          ) : (
            <div className="past-programs-list">
              {[...programHistory].reverse().map((arch, idx) => {
                const realIdx = programHistory.length - 1 - idx;
                const totalSets = arch.sessions.reduce((sum, s) => sum + s.sets.length, 0);
                const uniqueExercises = new Set(arch.sessions.flatMap(s => s.sets.map(set => set.exerciseId)));
                const formatDate = (d: string) =>
                  new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                return (
                  <div key={realIdx} className="past-program-card">
                    <div className="past-program-header">
                      <div className="past-program-name">
                        <Archive size={16} />
                        {arch.program.name}
                      </div>
                      <span className="past-program-dates">
                        {formatDate(arch.startDate)} &ndash; {formatDate(arch.endDate)}
                      </span>
                    </div>
                    <div className="past-program-stats">
                      <span>{arch.sessions.length} workouts</span>
                      <span>{totalSets} sets</span>
                      <span>{uniqueExercises.size} exercises</span>
                    </div>
                    <div className="past-program-days">
                      {arch.program.days.map(day => (
                        <span key={day.dayNumber} className="past-program-day-badge">
                          {day.dayName}: {day.exercises.slice(0, 2).map(ex =>
                            EXERCISES.find(e => e.id === ex.exerciseId)?.name || ex.exerciseId
                          ).join(', ')}
                          {day.exercises.length > 2 ? ` +${day.exercises.length - 2}` : ''}
                        </span>
                      ))}
                    </div>
                    {onRestoreProgram && (
                      <button
                        className="past-program-restore-btn"
                        onClick={() => onRestoreProgram(realIdx)}
                      >
                        Restore Program
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
