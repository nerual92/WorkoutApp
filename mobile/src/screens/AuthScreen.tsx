import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { login, register, resetPassword } from 'workout-shared';
import { colors, spacing } from '../theme';

type AuthMode = 'login' | 'register' | 'reset';

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const getPasswordStrength = (pw: string): { label: string; color: string; width: number } => {
    if (pw.length === 0) return { label: '', color: colors.border, width: 0 };
    if (pw.length < 6) return { label: 'Too short', color: colors.danger, width: 0.2 };
    if (pw.length < 8) return { label: 'Weak', color: colors.warning, width: 0.4 };
    const hasUpper = /[A-Z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    const hasSpecial = /[^A-Za-z0-9]/.test(pw);
    const score = [hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score >= 2 && pw.length >= 10) return { label: 'Strong', color: colors.success, width: 1 };
    if (score >= 1) return { label: 'Fair', color: colors.warning, width: 0.6 };
    return { label: 'Weak', color: colors.warning, width: 0.4 };
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      if (mode === 'register') {
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        await register(email.trim(), password);
        // With email verification disabled, user is auto-logged in
      } else if (mode === 'login') {
        await login(email.trim(), password);
      } else if (mode === 'reset') {
        await resetPassword(email.trim());
        setResetSent(true);
        setLoading(false);
        return;
      }
      // Auth state change will be picked up by the listener in App.tsx
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('invalid login') || msg.includes('invalid email or password')) {
        setError('Invalid email or password');
      } else if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (msg.includes('password') && msg.includes('6')) {
        setError('Password must be at least 6 characters');
      } else if (msg.includes('valid email') || msg.includes('invalid email')) {
        setError('Please enter a valid email address');
      } else if (msg.includes('rate') || msg.includes('too many')) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err.message || 'An error occurred');
      }
    }
    setLoading(false);
  };

  if (mode === 'reset' && resetSent) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <MaterialCommunityIcons name="email-check-outline" size={48} color={colors.primary} />
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            Password reset email sent to {email}. Follow the link to reset your password.
          </Text>
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => { setMode('login'); setResetSent(false); }}
          >
            <MaterialCommunityIcons name="arrow-left" size={16} color={colors.primary} />
            <Text style={styles.linkText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <MaterialCommunityIcons name="dumbbell" size={48} color={colors.primary} />
          <Text style={styles.title}>SBS Workout Tracker</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' && 'Sign in to sync your workouts'}
            {mode === 'register' && 'Create an account to get started'}
            {mode === 'reset' && 'Reset your password'}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="email-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          {mode !== 'reset' && (
            <>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
              {mode === 'register' && password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBar}>
                    <View style={[styles.strengthFill, { flex: getPasswordStrength(password).width, backgroundColor: getPasswordStrength(password).color }]} />
                  </View>
                  <Text style={[styles.strengthLabel, { color: getPasswordStrength(password).color }]}>
                    {getPasswordStrength(password).label}
                  </Text>
                </View>
              )}
            </>
          )}

          {mode === 'register' && (
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-check-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name={mode === 'login' ? 'login' : mode === 'register' ? 'account-plus' : 'email-fast-outline'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.submitText}>
                  {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            {mode === 'login' && (
              <>
                <TouchableOpacity style={styles.linkBtn} onPress={() => switchMode('register')}>
                  <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkBold}>Sign up</Text></Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkBtn} onPress={() => switchMode('reset')}>
                  <Text style={styles.linkText}>Forgot password?</Text>
                </TouchableOpacity>
              </>
            )}
            {mode === 'register' && (
              <TouchableOpacity style={styles.linkBtn} onPress={() => switchMode('login')}>
                <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
              </TouchableOpacity>
            )}
            {mode === 'reset' && (
              <TouchableOpacity style={styles.linkBtn} onPress={() => switchMode('login')}>
                <MaterialCommunityIcons name="arrow-left" size={16} color={colors.primary} />
                <Text style={styles.linkText}>Back to sign in</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: spacing.sm,
    width: '100%',
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.sm,
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 15,
    color: colors.text,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.md,
    gap: 8,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  linkText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  linkBold: {
    color: colors.primaryBright,
    fontWeight: '600',
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    marginTop: -4,
    marginBottom: spacing.sm,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});
