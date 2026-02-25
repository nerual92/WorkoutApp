import { supabase } from './supabase';
/**
 * Register a new user with email and password
 */
export async function register(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error)
        throw error;
    if (!data.user)
        throw new Error('Registration failed');
    return data.user;
}
/**
 * Sign in with email and password
 */
export async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error)
        throw error;
    if (!data.user)
        throw new Error('Login failed');
    return data.user;
}
/**
 * Sign out
 */
export async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error)
        throw error;
}
/**
 * Send password reset email
 */
export async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error)
        throw error;
}
/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthChange(callback) {
    // Check current session first
    supabase.auth.getSession().then(({ data: { session } }) => {
        callback(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
}
/**
 * Get current user (may be null if not signed in)
 */
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}
