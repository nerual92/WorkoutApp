import { createContext, useContext } from 'react';
import type { UserProgram } from 'workout-shared';
import type { AuthUser } from 'workout-shared';
import type { ToastType } from './components/AppToast';

export interface AppContextType {
  userProgram: UserProgram | null;
  setUserProgram: (p: UserProgram | null) => void;
  workoutDayOverride: number | null;
  setWorkoutDayOverride: (d: number | null) => void;
  showToast: (msg: string, type?: ToastType) => void;
  authUser: AuthUser | null;
  handleLogout: () => Promise<void>;
}

export const AppContext = createContext<AppContextType>({
  userProgram: null,
  setUserProgram: () => {},
  workoutDayOverride: null,
  setWorkoutDayOverride: () => {},
  showToast: () => {},
  authUser: null,
  handleLogout: async () => {},
});

export const useAppContext = () => useContext(AppContext);
