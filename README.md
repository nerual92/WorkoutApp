# Stronger by Science Workout Tracker

A React web + React Native Android app for tracking Stronger by Science novice hypertrophy workouts.

## 📦 Project Structure

```
WorkoutApp/
├── shared/          # Shared types and data
│   ├── src/
│   │   ├── types.ts         # TypeScript types
│   │   ├── data.ts          # Exercise and program data
│   │   └── utils.ts         # Utility functions
│   └── package.json
├── web/             # React web app
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProgramSetup.tsx
│   │   │   ├── WorkoutTracker.tsx
│   │   │   └── Analytics.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
├── mobile/          # React Native Android app
│   ├── src/
│   │   ├── screens/
│   │   │   ├── SetupScreen.tsx
│   │   │   ├── WorkoutScreen.tsx
│   │   │   └── AnalyticsScreen.tsx
│   │   ├── components/
│   │   ├── theme.ts
│   │   └── App.tsx
│   ├── app.json
│   └── package.json
└── package.json     # Root monorepo
```

## 🚀 Features

- **Program Setup**: Choose 3/4/5 day program with exercise selection
- **Exercise Database**: 105 exercises across 18 muscle groups (Compound, Accessory, Calves, Vanity)
- **Accessory Recommendations**: Smart recommendations based on program type
- **Workout Logging**: Track sets, reps, and weights per exercise
- **Weight Tracking**: Per-dumbbell weight for dumbbell exercises, total weight for others
- **Progress Analytics**: View exercise stats, volume tracking, and workout history
- **Local Storage**: All data stored locally (browser storage for web, AsyncStorage for mobile)
- **Cross-Platform**: React for web, React Native (Expo) for Android

## 💾 Exercise Database

105 exercises across 18 muscle groups, organized by the SBS Novice Hypertrophy program structure:

- **Compound, pec-dominant** (8): Bench Press, DB Bench, Incline Press, Machine Chest Press, Dips, etc.
- **Compound, shoulder-dominant** (7): Standing/Seated Shoulder Press, Push Press, etc.
- **Compound, upper back horizontal** (7): Barbell Row, DB Row, T-Bar Row, Cable Row, etc.
- **Compound, upper back vertical** (7): Pull-ups, Chin-ups, Lat Pulldowns, etc.
- **Compound, hip-dominant** (7): Deadlift, RDL, Trap Bar Deadlift, Good Morning, etc.
- **Compound, knee-dominant** (5): Squat, Front Squat, Leg Press, Hack Squat, etc.
- **Accessories** (50+): Biceps, Triceps, Chest isolation, Shoulder isolation, etc.
- **Calves** (8): Standing/Seated Calf Raises, Smith Machine, Leg Press Calf Raises
- **Vanity lifts** (40+): Curls, Pushdowns, Flyes, Lateral Raises, Face Pulls, etc.

## 📱 Web App (React + Vite)

### Setup

```bash
cd web
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Build

```bash
npm run build
```

### Features

1. **Program Setup Tab**: Choose days and exercises with a guided wizard
2. **Workout Logging**: Track sets with real-time updates and notes
3. **Analytics**: View progress charts and exercise statistics
4. **Responsive Design**: Works on desktop, tablet, and mobile browsers

## 📱 Mobile App (React Native + Expo)

### Setup

```bash
cd mobile
npm install
npm start
```

Then press:
- `a` for Android emulator
- `i` for iOS simulator
- Or scan QR code with Expo Go app

### Build for Android

```bash
npm run android
```

### Features

Same as web app, optimized for mobile:
- Bottom tab navigation
- Mobile-friendly forms
- Touch optimize interfaces

## 🛠️ Technology Stack

- **Web**: React 18, TypeScript, Vite, CSS
- **Mobile**: React Native, Expo, TypeScript
- **Storage**: 
  - Web: LocalStorage
  - Mobile: AsyncStorage
- **Shared**: TypeScript types and utilities

## 📋 Data Storage

### LocalStorage/AsyncStorage Structure

```javascript
{
  id: "unique-program-id",
  createdDate: "2024-02-22",
  program: {
    id: "program-id",
    name: "3-Day Program",
    days: [[], [], []],
    selectedAccessories: ["leg_press", "chest_fly", ...]
  },
  workoutSessions: [
    {
      id: "session-id",
      date: "2024-02-22",
      programDay: 1,
      sets: [
        {
          exerciseId: "squat",
          setNumber: 1,
          reps: 8,
          weight: 225
        }
      ],
      completed: true,
      notes: "Great workout!"
    }
  ],
  currentWeek: 1,
  currentDay: 1
}
```

## 🎯 Usage Flow

1. **First Time**: Go to Setup tab → Select training frequency (3/4/5 days)
2. **Customize**: Choose core exercises → Select accessories → Review and create
3. **Log Workouts**: Go to Workout tab → Select exercise → Enter reps/weight → Add sets
4. **Track Progress**: View Analytics tab for exercise stats and history

## 🔧 Development

### Adding New Exercises

Edit `shared/src/data.ts`:

```typescript
export const EXERCISES: Exercise[] = [
  { id: 'exercise_id', name: 'Exercise Name', category: 'Accessory', type: 'dumbbell', default: false },
  // ...
];
```

### Customizing Theme (Mobile)

Edit `mobile/src/theme.ts` to change colors, spacing, and global styles.

### Building for Production

Web:
```bash
cd web && npm run build
```

Mobile:
```bash
cd mobile && npm run build
# or deploy to EAS Build
```

## 📌 Notes

- All data is stored locally - no backend required
- Each user can have only one active program at a time
- Programs persist across app restarts
- To start a new program, use "New Program" button

## 🏆 Milestones

### v1.0 — Core Complete (Feb 23, 2026)
- Full workout tracking with 8-week SBS hypertrophy progression
- Program setup wizard with per-day exercise customization (3/4/5 day)
- Dashboard with stat cards, day picker, last workout recap
- Analytics with overview, history, trends (bar chart), and past programs tab
- Program archiving: "New Program" archives old program + sessions to history, new programs inherit last-used weights
- Program restore: restore any archived program from Past Programs tab
- Sidebar navigation persists through all flows including new program setup
- Draft workout persistence (survives navigation away mid-workout)
- Weight inheritance across program changes
- Import/export JSON with archive-safe merging
- Lucide React icons, focus-visible outlines, responsive sidebar layout

## ⚡ Quick Start

```bash
# Install all dependencies
npm install

# Start web dev server
npm run web:dev

# Start mobile dev server (separate terminal)
npm run mobile:start
```
