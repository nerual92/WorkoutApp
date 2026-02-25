-- Create workout_sessions table for storing individual workout data
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  program_name TEXT NOT NULL,
  program_day INTEGER NOT NULL,
  sets JSONB NOT NULL,
  completed BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);

-- Add index on date for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date DESC);

-- Add composite index for user + date queries
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own workout sessions
CREATE POLICY "Users can view own workout sessions"
  ON workout_sessions
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own workout sessions
CREATE POLICY "Users can insert own workout sessions"
  ON workout_sessions
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can update their own workout sessions
CREATE POLICY "Users can update own workout sessions"
  ON workout_sessions
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Policy: Users can delete their own workout sessions
CREATE POLICY "Users can delete own workout sessions"
  ON workout_sessions
  FOR DELETE
  USING (auth.uid()::text = user_id);
