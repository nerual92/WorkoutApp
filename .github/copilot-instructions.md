# Stronger by Science Workout Tracker

A React web + React Native Android app for tracking Stronger by Science novice hypertrophy workouts.

## Project Structure

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
│   │   ├── pages/
│   │   ├── components/
│   │   └── App.tsx
│   └── package.json
├── mobile/          # React Native Android app
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   └── App.tsx
│   └── package.json
└── package.json     # Root monorepo
```

## Setup Progress

- [x] Create project structure
- [x] Install dependencies
- [x] Build shared data types
- [x] Create web React app
- [x] Create mobile React Native app
- [x] Implement program setup
- [x] Implement workout logging
- [x] Add analytics

## Key Features

1. **Program Setup**: Choose 3/4/5 day program and select exercises
2. **Exercise Customization**: Pick accessories and configure dumbbell vs total weight
3. **Workout Logging**: Track sets, reps, weights per exercise
4. **Weight Tracking**: Per-dumbbell weight for dumbbell exercises, total weight for others
5. **Progress Analytics**: Track progression over time
6. **Local Storage**: All data stored locally on device

## Technology Stack

- **Web**: React 18, TypeScript, Vite
- **Mobile**: React Native / Expo, TypeScript
- **Storage**: LocalStorage (web) / AsyncStorage (mobile)
- **Shared**: TypeScript types and utilities
