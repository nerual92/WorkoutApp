import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cukurnwgxpotgnzqhosk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1a3VybndneHBvdGduenFob3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4ODU4ODksImV4cCI6MjA4NzQ2MTg4OX0.Eaa9TX-qtTRl3TGTv4nTXkpkRHnlAUfALqpX-qSvk_M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
