import type { User } from '@supabase/supabase-js';
export type AuthUser = User;
/**
 * Register a new user with email and password
 */
export declare function register(email: string, password: string): Promise<User>;
/**
 * Sign in with email and password
 */
export declare function login(email: string, password: string): Promise<User>;
/**
 * Sign out
 */
export declare function logout(): Promise<void>;
/**
 * Send password reset email
 */
export declare function resetPassword(email: string): Promise<void>;
/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export declare function onAuthChange(callback: (user: User | null) => void): () => void;
/**
 * Get current user (may be null if not signed in)
 */
export declare function getCurrentUser(): Promise<User | null>;
