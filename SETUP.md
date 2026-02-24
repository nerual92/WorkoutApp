# Stronger by Science Workout Tracker - Setup & Getting Started

## ✅ Project Status

Your React + React Native monorepo is ready! Here's what's been set up:

### Installed
- ✅ Node.js & npm
- ✅ Web app (React 18 + Vite)
- ✅ Mobile app (React Native + Expo)
- ✅ Shared library (TypeScript types & utilities)
- ✅ All 105 exercises across 18 muscle groups from the SBS novice hypertrophy program
- ✅ Core features: Setup, Workout Logging, Analytics

## 🚀 Quick Start

### Start Web App

**Windows:**
```cmd
# From WorkoutApp folder
start-web.bat
```

Then open: `http://localhost:5173` in your browser

**For development:**
The web app runs on Vite dev server with Hot Module Replacement (HMR).

### Start Mobile App

**Windows:**
```cmd
cd mobile
npm start
```

Then:
- Press `a` to open Android emulator
- Or scan QR code with Expo Go app (download from Play Store)

## 📁 Project Structure

```
WorkoutApp/
├── shared/                 # Shared TypeScript code
│   └── src/
│       ├── types.ts       # All TypeScript interfaces
│       ├── data.ts        # Exercise database (105 exercises)
│       ├── utils.ts       # Utility functions
│       └── index.ts       # Exports
│
├── web/                   # React web app (Vite)
│   ├── src/
│   │   ├── App.tsx       # Main app
│   │   ├── main.tsx      # Vite entry point
│   │   ├── App.css       # Main styles
│   │   └── components/
│   │       ├── ProgramSetup.tsx      # Setup wizard
│   │       ├── WorkoutTracker.tsx    # Logging interface
│   │       └── Analytics.tsx         # Progress tracking
│   └── vite.config.ts
│
├── mobile/                # React Native app (Expo)
│   ├── src/
│   │   ├── App.tsx       # Navigation setup
│   │   ├── theme.ts      # Design system
│   │   ├── screens/
│   │   │   ├── SetupScreen.tsx
│   │   │   ├── WorkoutScreen.tsx
│   │   │   └── AnalyticsScreen.tsx
│   │   └── components/
│   │       └── CheckboxItem.tsx
│   └── app.json
│
├── npm.bat                # npm wrapper with PATH fix
├── start-web.bat         # Quick start script
└── setup.bat             # Installation script
```

## 💪 Features

### Program Setup
1. Choose training frequency (3/4/5 days)
2. Select core exercises (Squat, Bench, Deadlift, etc.)
3. Pick accessories from recommendations
4. Save program to local storage

### Workout Logging
1. Select exercise from dropdown
2. Enter reps and weight
3. Add multiple sets
4. Optional notes (how you felt, PRs, etc.)
5. Logs saved to device

### Analytics & Progress
- Total workouts logged
- Unique training days
- Exercise performance (max weight, total volume)
- Recent workout history

## 🗄️ Exercise Database

105 exercises across 18 muscle groups from SBS Novice Hypertrophy:

**Compound Lifts (41):**
- Pec-dominant (8): Bench Press, DB Bench, Incline Press, Dips, etc.
- Shoulder-dominant (7): Standing/Seated Shoulder Press, Push Press, etc.
- Upper back horizontal (7): Barbell Row, DB Row, T-Bar Row, Cable Row, etc.
- Upper back vertical (7): Pull-ups, Chin-ups, Lat Pulldowns, etc.
- Hip-dominant (7): Deadlift, RDL, Trap Bar Deadlift, Good Morning, etc.
- Knee-dominant (5): Squat, Front Squat, Leg Press, Hack Squat, etc.

**Accessories (24):**
- Hip accessories (7): Hamstring curls, Hip thrusts, Back raises, etc.
- Quad accessories (5): Knee extensions, Step-ups, Lunges, Split squats
- Upper body accessories (12): Mixed bicep/tricep/chest/shoulder options

**Calves (8):**
- Standing, Seated, Smith Machine, Leg Press calf raises

**Vanity Lifts (32):**
- Biceps (8): Curls (Preacher, DB, Hammer, Cable, EZ-Bar, etc.)
- Triceps (20): Pushdowns, Extensions, Skullcrushers, etc.
- Chest isolation (8): Flyes, Pec Deck, Cable Flyes
- Shoulder isolation (8): Lateral Raises, Face Pulls, Rear Delt Flyes

## 💾 Data Storage

### Web App
- **Browser LocalStorage** - persists across sessions
- No backend required
- All data is local to your machine

### Mobile App
- **AsyncStorage** - React Native equivalent
- Syncs to device
- Optional: Can add cloud sync later

## 🔧 Troubleshooting

### npm command not found?
The batch files (`npm.bat`, `start-web.bat`) automatically add Node.js to PATH. If running commands manually, use:
```cmd
cmd /c "c:\Users\vince\OneDrive\Documents\WorkoutApp\npm.bat" install
```

### Port 5173 already in use?
Edit `web/vite.config.ts`:
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174  // Use a different port
  }
})
```

### Module resolution errors?
- Clear node_modules: `rmdir /s node_modules`
- Reinstall: `npm install`
- Restart dev server

## 📝 Customization

### Add New Exercise
Edit `shared/src/data.ts`:
```typescript
export const EXERCISES: Exercise[] = [
  {
    id: 'leg_press',
    name: 'Leg Press',
    category: 'Accessory',
    type: 'machine',
    default: false
  },
  // Add yours here...
];
```

### Change App Colors
Edit:
- **Web:** `web/src/components/*.css` (update color variables)
- **Mobile:** `mobile/src/theme.ts` (update `colors` object)

### Add New Feature
1. Add types to `shared/src/types.ts`
2. Add logic to `shared/src/utils.ts`
3. Create components in `web/src/components/` or `mobile/src/screens/`

## 🌐 Deploy

### Web App
```bash
cd web
npm run build
# Upload 'dist' folder to any static hosting (Vercel, Netlify, GitHub Pages)
```

### Mobile App
```bash
cd mobile
# Use Expo CLI or EAS Build for Android APK
```

## ⚙️ Next Steps

1. **Test the setup:**
   - Run web app with `start-web.bat`
   - Try creating a 3-day program
   - Log a workout
   - View analytics

2. **Customize exercises:**
   - Modify `shared/src/data.ts` if needed
   - Add your own exercises

3. **Extend features:**
   - Add weight progression tracking
   - Export workout data
   - Dark mode
   - Cloud sync (Firebase/Supabase)

4. **Build for production:**
   - Web: `npm run web:build`
   - Mobile: Use Expo for Android/iOS builds

## 📚 Tech Stack Reference

| Part | Technology | Version |
|------|-----------|---------|
| Shared | TypeScript | 5.0+ |
| Web | React | 18.2 |
| Web Build | Vite | 4.3 |
| Mobile | React Native | 0.72 |
| Mobile Runner | Expo | 49.0 |
| Storage | LocalStorage/AsyncStorage | - |

## 🆘 Support

If you encounter issues:
1. Check error messages in dev server terminal
2. Verify Node.js is installed: `node --version`
3. Clear cache & reinstall: `npm install --force`
4. Restart dev server

---

**Happy lifting! 💪**
