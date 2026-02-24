import React, { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import { Home, BarChart3, Download, Upload, RefreshCw, Dumbbell, ChevronLeft, ChevronRight, Menu, X, LogOut } from 'lucide-react';
import './App.css';
import ProgramSetup from './components/ProgramSetup';
import Dashboard from './components/Dashboard';
import WorkoutTracker from './components/WorkoutTracker';
import Analytics from './components/Analytics';
import Toast, { ToastMessage } from './components/Toast';
import ConfirmModal from './components/ConfirmModal';
import AuthScreen from './components/AuthScreen';
import type { UserProgram, ArchivedProgram } from 'workout-shared';
import { generateId, onAuthChange, logout, getCurrentUser, saveUserProgram, clearUserProgram, subscribeToProgramChanges } from 'workout-shared';
import type { AuthUser } from 'workout-shared';

type AppView = 'setup' | 'home' | 'workout' | 'analytics';

// Toast context so child components can show toasts
interface ToastContextType {
  showToast: (text: string, type?: ToastMessage['type'], action?: ToastMessage['action']) => void;
}
export const ToastContext = createContext<ToastContextType>({ showToast: () => {} });
export const useToast = () => useContext(ToastContext);

function App() {
  const [currentView, setCurrentView] = useState<AppView>('setup');
  const [userProgram, setUserProgram] = useState<UserProgram | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  // Auth state
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);
  // Track whether we're currently processing a remote update to avoid re-saving
  const isRemoteUpdate = useRef(false);

  const showToast = useCallback((text: string, type: ToastMessage['type'] = 'success', action?: ToastMessage['action']) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev, { id, text, type, action }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const [workoutDayOverride, setWorkoutDayOverride] = useState<number | null>(null);

  // Listen to auth state
  useEffect(() => {
    const unsub = onAuthChange((user) => {
      setAuthUser(user);
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  // Subscribe to Firestore when authenticated
  useEffect(() => {
    if (!authUser) {
      // Cleanup Firestore subscription
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
      return;
    }

    // Subscribe to real-time program changes
    firestoreUnsubRef.current = subscribeToProgramChanges(authUser.uid, (program) => {
      isRemoteUpdate.current = true;
      if (program) {
        setUserProgram(program);
        setCurrentView(prev => prev === 'setup' ? 'home' : prev);
        localStorage.setItem('userProgram', JSON.stringify(program));
      }
      isRemoteUpdate.current = false;
    });

    return () => {
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
    };
  }, [authUser]);

  // Load program from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('userProgram');
    if (saved) {
      setUserProgram(JSON.parse(saved));
      setCurrentView('home');
    } else {
      // Clean up orphaned pendingArchive if user refreshed mid-setup
      localStorage.removeItem('pendingArchive');
    }
  }, []);

  // Save program to localStorage and Firestore whenever it changes
  useEffect(() => {
    if (userProgram) {
      localStorage.setItem('userProgram', JSON.stringify(userProgram));
      // Sync to Firestore if authenticated and this isn't a remote update
      if (authUser && !isRemoteUpdate.current) {
        saveUserProgram(authUser.uid, userProgram).catch(console.error);
      }
    }
  }, [userProgram, authUser]);

  const handleCancelSetup = () => {
    // Restore the old program from pendingArchive
    const pendingRaw = localStorage.getItem('pendingArchive');
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw);
        const history = pending.history || [];
        if (history.length > 0) {
          // The last entry in history is the program we just archived — restore it
          const lastArchived = history[history.length - 1];
          const olderHistory = history.slice(0, -1);
          const restored: UserProgram = {
            id: generateId(),
            createdDate: lastArchived.startDate,
            program: lastArchived.program,
            workoutSessions: lastArchived.sessions,
            currentWeek: 1,
            currentDay: 1,
            programHistory: olderHistory.length > 0 ? olderHistory : undefined,
          };
          setUserProgram(restored);
          setCurrentView('home');
          localStorage.removeItem('pendingArchive');
          showToast('Returned to your program.', 'info');
          return;
        }
      } catch { /* ignore */ }
    }
    localStorage.removeItem('pendingArchive');
    setCurrentView('home');
  };

  const handleProgramCreated = (program: UserProgram) => {
    // Check for archived data from a previous program
    const pendingRaw = localStorage.getItem('pendingArchive');
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw);
        // Carry forward program history (not sessions — those stay archived)
        program.programHistory = pending.history || [];
      } catch {
        // Ignore corrupt data
      }
      localStorage.removeItem('pendingArchive');
    }
    setUserProgram(program);
    setCurrentView('home');
    showToast('Program created! Let\'s get started.', 'success');
  };

  const handleStartWorkout = (dayNumber: number) => {
    setWorkoutDayOverride(dayNumber);
    setCurrentView('workout');
    setMobileMenuOpen(false);
  };

  const handleWorkoutComplete = () => {
    setWorkoutDayOverride(null);
    setCurrentView('home');
  };

  // Helper: archive the current program into localStorage pendingArchive
  const archiveCurrentProgram = () => {
    if (userProgram && userProgram.workoutSessions.length > 0) {
      const sessionDates = userProgram.workoutSessions.map(s => s.date).sort();
      const archived: ArchivedProgram = {
        program: userProgram.program,
        sessions: userProgram.workoutSessions,
        startDate: userProgram.createdDate,
        endDate: sessionDates[sessionDates.length - 1],
      };
      const existingHistory = userProgram.programHistory || [];
      localStorage.setItem('pendingArchive', JSON.stringify({
        history: [...existingHistory, archived],
      }));
    } else if (userProgram?.programHistory?.length) {
      // No sessions in current program, but carry forward older history
      localStorage.setItem('pendingArchive', JSON.stringify({
        history: userProgram.programHistory,
      }));
    }
  };

  const handleNewProgram = () => {
    setConfirmModal({
      title: 'Start New Program?',
      message: 'Your current program and workout history will be archived. Any matching exercises in the new program will inherit your last-used weights.',
      confirmText: 'Archive & Start New',
      danger: false,
      onConfirm: () => {
        archiveCurrentProgram();
        setCurrentView('setup');
        setConfirmModal(null);
        showToast('Program archived. Choose a new program.', 'info');
      },
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (!imported.id || !imported.program || !imported.workoutSessions || !imported.currentWeek) {
          showToast('Invalid file: missing required fields', 'error');
          return;
        }
        if (!imported.program.days || !Array.isArray(imported.workoutSessions)) {
          showToast('Invalid file: corrupted program data', 'error');
          return;
        }

        const doImport = () => {
          // Archive current program before importing (if it has sessions)
          archiveCurrentProgram();
          const importedProgram = imported as UserProgram;
          // Attach any accumulated history to the imported program
          const pendingRaw = localStorage.getItem('pendingArchive');
          if (pendingRaw) {
            try {
              const pending = JSON.parse(pendingRaw);
              importedProgram.programHistory = [
                ...(pending.history || []),
                ...(importedProgram.programHistory || []),
              ];
            } catch { /* ignore */ }
            localStorage.removeItem('pendingArchive');
          }
          setUserProgram(importedProgram);
          setCurrentView('home');
          showToast(`Imported! ${imported.workoutSessions.length} sessions loaded.`, 'success');
        };

        if (userProgram) {
          setConfirmModal({
            title: 'Import Data?',
            message: `Your current program (${userProgram.workoutSessions.length} sessions) will be archived and replaced with the imported data (${imported.workoutSessions.length} sessions).`,
            confirmText: 'Archive & Import',
            danger: false,
            onConfirm: () => {
              doImport();
              setConfirmModal(null);
            },
          });
        } else {
          doImport();
        }
      } catch {
        showToast('Failed to parse file. Make sure it\'s a valid JSON export.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportData = () => {
    if (!userProgram) return;
    const data = JSON.stringify(userProgram, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sbs-workout-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Data exported successfully!', 'success');
  };

  const handleRestoreProgram = (archiveIndex: number) => {
    if (!userProgram) return;
    const history = userProgram.programHistory || [];
    const toRestore = history[archiveIndex];
    if (!toRestore) return;

    setConfirmModal({
      title: 'Restore Program?',
      message: `This will archive your current program and restore "${toRestore.program.name}" (${toRestore.sessions.length} sessions). Your weights and history will be preserved.`,
      confirmText: 'Restore',
      danger: false,
      onConfirm: () => {
        // Build new history: remove the restored entry, add current program
        const newHistory = history.filter((_, i) => i !== archiveIndex);

        // Archive current program (if it has sessions)
        if (userProgram.workoutSessions.length > 0) {
          const sessionDates = userProgram.workoutSessions.map(s => s.date).sort();
          newHistory.push({
            program: userProgram.program,
            sessions: userProgram.workoutSessions,
            startDate: userProgram.createdDate,
            endDate: sessionDates[sessionDates.length - 1],
          });
        }

        const restored: UserProgram = {
          id: generateId(),
          createdDate: toRestore.startDate,
          program: toRestore.program,
          workoutSessions: toRestore.sessions,
          currentWeek: 1,
          currentDay: 1,
          programHistory: newHistory.length > 0 ? newHistory : undefined,
        };

        setUserProgram(restored);
        setCurrentView('home');
        setConfirmModal(null);
        showToast(`Restored ${toRestore.program.name}!`, 'success');
      },
    });
  };

  const navigateTo = (view: AppView) => {
    // If leaving setup without creating a program, clean up the pending archive
    if (currentView === 'setup' && view !== 'setup') {
      localStorage.removeItem('pendingArchive');
    }
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    setUserProgram(null);
    setCurrentView('setup');
    localStorage.removeItem('userProgram');
    localStorage.removeItem('pendingArchive');
  };

  // Show nothing while checking auth
  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#090B0A' }}>
        <Dumbbell size={48} style={{ color: '#1A7A42', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // Show auth screen if not logged in
  if (!authUser) {
    return (
      <ToastContext.Provider value={{ showToast }}>
        <AuthScreen onAuthenticated={() => {}} />
        <Toast toasts={toasts} onRemove={removeToast} />
      </ToastContext.Provider>
    );
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      <div className={`app ${userProgram ? 'has-sidebar' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Left Sidebar — only shown when a program exists */}
        {userProgram && (
          <>
            {/* Mobile top bar */}
            <div className="mobile-topbar">
              <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
              <span className="mobile-title">
                <Dumbbell size={18} /> SBS Tracker
              </span>
            </div>

            {/* Sidebar overlay on mobile */}
            {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />}

            <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
              <div className="sidebar-brand">
                <Dumbbell size={24} className="sidebar-logo" />
                {!sidebarCollapsed && <span className="sidebar-title">SBS Tracker</span>}
              </div>

              <nav className="sidebar-nav">
                <button
                  className={`sidebar-link ${currentView === 'home' ? 'active' : ''}`}
                  onClick={() => navigateTo('home')}
                >
                  <Home size={20} />
                  {!sidebarCollapsed && <span>Home</span>}
                </button>
                <button
                  className={`sidebar-link ${currentView === 'analytics' ? 'active' : ''}`}
                  onClick={() => navigateTo('analytics')}
                >
                  <BarChart3 size={20} />
                  {!sidebarCollapsed && <span>Analytics</span>}
                </button>
              </nav>

              <div className="sidebar-divider" />

              <nav className="sidebar-nav sidebar-secondary">
                <button className="sidebar-link" onClick={handleExportData}>
                  <Download size={20} />
                  {!sidebarCollapsed && <span>Export Data</span>}
                </button>
                <button className="sidebar-link" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={20} />
                  {!sidebarCollapsed && <span>Import Data</span>}
                </button>
                <button className="sidebar-link" onClick={handleNewProgram}>
                  <RefreshCw size={20} />
                  {!sidebarCollapsed && <span>New Program</span>}
                </button>
                <button className="sidebar-link" onClick={handleLogout}>
                  <LogOut size={20} />
                  {!sidebarCollapsed && <span>Sign Out</span>}
                </button>
              </nav>

              <button
                className="sidebar-collapse-btn"
                onClick={() => setSidebarCollapsed(c => !c)}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            </aside>
          </>
        )}

        <main className="app-content">
          {currentView === 'setup' && (
            <ProgramSetup
              onProgramCreated={handleProgramCreated}
            />
          )}
          {currentView === 'home' && userProgram && (
            <Dashboard
              program={userProgram}
              onStartWorkout={handleStartWorkout}
              onViewAnalytics={() => navigateTo('analytics')}
            />
          )}
          {currentView === 'workout' && userProgram && (
            <WorkoutTracker
              program={userProgram}
              onUpdate={setUserProgram}
              dayOverride={workoutDayOverride}
              onComplete={handleWorkoutComplete}
            />
          )}
          {currentView === 'analytics' && userProgram && (
            <Analytics
              sessions={userProgram.workoutSessions}
              programHistory={userProgram.programHistory}
              currentProgramName={userProgram.program.name}
              onRestoreProgram={handleRestoreProgram}
            />
          )}
        </main>

        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          onChange={handleImportData}
          style={{ display: 'none' }}
        />
        <Toast toasts={toasts} onRemove={removeToast} />
        {confirmModal && (
          <ConfirmModal
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText={confirmModal.confirmText}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(null)}
            danger={confirmModal.danger}
          />
        )}
      </div>
    </ToastContext.Provider>
  );
}

export default App;
