import React from 'react';
import type { UserProgram } from 'workout-shared';
import { EXERCISES } from 'workout-shared';
import { getWeekProgression } from 'workout-shared';
import { BarChart3, FileText, Dumbbell, Trophy, CalendarDays, Rocket } from 'lucide-react';
import './Dashboard.css';

interface DashboardProps {
  program: UserProgram;
  onStartWorkout: (dayNumber: number) => void;
  onViewAnalytics: () => void;
}

export default function Dashboard({ program, onStartWorkout, onViewAnalytics }: DashboardProps) {
  const weekProgression = getWeekProgression(program.currentWeek);
  const lastSession = program.workoutSessions.length > 0
    ? program.workoutSessions[program.workoutSessions.length - 1]
    : null;

  // Group last session's sets by exercise
  const lastSessionGroups: Record<string, typeof lastSession extends null ? never : NonNullable<typeof lastSession>['sets']> = {};
  if (lastSession) {
    lastSession.sets.forEach(set => {
      if (!lastSessionGroups[set.exerciseId]) lastSessionGroups[set.exerciseId] = [];
      lastSessionGroups[set.exerciseId].push(set);
    });
  }

  return (
    <div className="dashboard">
      <div className="dash-welcome">
        <h2>Welcome Back!</h2>
        <p className="dash-subtitle">
          Week {program.currentWeek} of 8 &middot; {program.program.name} &middot; {weekProgression.sets}&times;{weekProgression.reps}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="dash-stats">
        <div className="dash-stat-card">
          <div className="dash-stat-value">{program.workoutSessions.length}</div>
          <div className="dash-stat-label">Workouts Done</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-value">{program.currentWeek}/8</div>
          <div className="dash-stat-label">Current Week</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-value">
            {program.workoutSessions.reduce((sum, s) => sum + s.sets.length, 0)}
          </div>
          <div className="dash-stat-label">Total Sets</div>
        </div>
      </div>

      {/* Empty state prompt for brand-new users */}
      {program.workoutSessions.length === 0 && (
        <div className="dash-empty-state">
          <Rocket size={48} className="dash-empty-icon" />
          <h3>Ready to start?</h3>
          <p>You haven't logged any workouts yet. Pick a day below and crush your first session!</p>
        </div>
      )}

      {/* Choose Next Workout */}
      <div className="dash-section">
        <h3>Start a Workout</h3>
        <div className="dash-day-grid">
          {program.program.days.map((day) => {
            const isNext = day.dayNumber === program.currentDay;
            const exerciseNames = day.exercises
              .map(ex => EXERCISES.find(e => e.id === ex.exerciseId)?.name || ex.exerciseId)
              .slice(0, 3);
            const extra = day.exercises.length - 3;

            return (
              <button
                key={day.dayNumber}
                className={`dash-day-card ${isNext ? 'dash-day-next' : ''}`}
                onClick={() => onStartWorkout(day.dayNumber)}
              >
                {isNext && <span className="dash-next-badge">Up Next</span>}
                <div className="dash-day-name">{day.dayName}</div>
                <div className="dash-day-exercises">
                  {exerciseNames.map((name, i) => (
                    <span key={i} className="dash-day-exercise">{name}</span>
                  ))}
                  {extra > 0 && <span className="dash-day-more">+{extra} more</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Last Workout */}
      {lastSession && (
        <div className="dash-section">
          <h3>Last Workout</h3>
          <div className="dash-last-workout">
            <div className="dash-last-header">
              <span className="dash-last-date">
                {new Date(lastSession.date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long', month: 'short', day: 'numeric'
                })}
              </span>
              <span className="dash-last-day">
                {program.program.days[lastSession.programDay - 1]?.dayName || `Day ${lastSession.programDay}`}
              </span>
              <span className="dash-last-sets">{lastSession.sets.length} sets</span>
            </div>
            <div className="dash-last-exercises">
              {Object.entries(lastSessionGroups).map(([exId, sets]) => {
                const ex = EXERCISES.find(e => e.id === exId);
                const maxWeight = Math.max(...sets.map(s => s.weight));
                return (
                  <div key={exId} className="dash-last-exercise">
                    <span className="dash-last-ex-name">{ex?.name || exId}</span>
                    <span className="dash-last-ex-info">
                      {sets.length} sets &middot; {maxWeight}lbs
                    </span>
                  </div>
                );
              })}
            </div>
            {lastSession.notes && (
              <div className="dash-last-notes"><FileText size={14} style={{display:'inline',verticalAlign:'middle',marginRight:4}} /> {lastSession.notes}</div>
            )}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="dash-actions">
        <button className="dash-action-btn" onClick={onViewAnalytics}>
          <BarChart3 size={18} style={{display:'inline',verticalAlign:'middle',marginRight:6}} /> View Analytics
        </button>
      </div>
    </div>
  );
}
