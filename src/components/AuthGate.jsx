import React, { useState, useRef, useMemo } from 'react';
import {
  Mail,
  KeyRound,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Headphones,
} from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail, isFirebaseConfigured } from '../firebase';
import { APP_LOGO_URL } from '../config/env';

export default function AuthGate({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const [touched, setTouched] = useState({
    displayName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const errorSummaryRef = useRef(null);
  const emailInputRef = useRef(null);
  const nameInputRef = useRef(null);

  // Field-level inline validation on blur
  const fieldErrors = useMemo(() => {
    const errs = {};
    if (mode === 'signup' && touched.displayName && !displayName.trim()) {
      errs.displayName = 'Please enter your name.';
    }
    if (touched.email) {
      if (!email.trim()) {
        errs.email = 'Email address is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        errs.email = 'Enter a valid email address (e.g. name@domain.com).';
      }
    }
    if (touched.password) {
      if (!password) {
        errs.password = 'Password is required.';
      } else if (mode === 'signup' && password.length < 6) {
        errs.password = 'Use at least 6 characters.';
      }
    }
    if (mode === 'signup' && touched.confirmPassword) {
      if (!confirmPassword) {
        errs.confirmPassword = 'Please confirm your password.';
      } else if (password && confirmPassword !== password) {
        errs.confirmPassword = 'Passwords do not match.';
      }
    }
    return errs;
  }, [mode, touched, displayName, email, password, confirmPassword]);

  // Progressive password strength meter for signup
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: 'Minimum 6 characters', color: 'bg-white/10' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak password', color: 'bg-amber-400' };
    if (score === 2) return { score: 2, label: 'Good password', color: 'bg-cyan-400' };
    if (score === 3) return { score: 3, label: 'Strong password', color: 'bg-emerald-400' };
    return { score: 4, label: 'Very strong password', color: 'bg-[var(--primary)]' };
  }, [password]);

  const handleModeSwitch = (nextMode) => {
    setMode(nextMode);
    setError('');
    setInfoMessage('');
    setTouched({
      displayName: false,
      email: false,
      password: false,
      confirmPassword: false,
    });
  };

  const handleEnterGuestSession = () => {
    if (onAuthSuccess) {
      onAuthSuccess({
        uid: 'guest-' + Date.now(),
        displayName: displayName.trim() || 'Guest Listener',
        email: email.trim() || 'guest@azaad.local',
        isAnonymous: true,
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setInfoMessage('');
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle();
      if (onAuthSuccess) onAuthSuccess(user);
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in window closed. Please try again.');
      } else if (err.code === 'auth/not-configured' || err.code === 'auth/invalid-api-key') {
        setError('Firebase is not configured in .env. Please configure .env or continue as Guest.');
      } else {
        setError(err.message || 'Unable to sign in with Google.');
      }
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    setTouched({
      displayName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (mode === 'signup' && !displayName.trim()) {
      setError('Please enter your name.');
      nameInputRef.current?.focus();
      return;
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      emailInputRef.current?.focus();
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const user = await signUpWithEmail(
          email.trim(),
          password,
          displayName.trim() || 'Music Lover'
        );
        setInfoMessage('Account created! Welcome to Azaad Music.');
        if (onAuthSuccess) onAuthSuccess(user);
      } else {
        const user = await signInWithEmail(email.trim(), password);
        if (onAuthSuccess) onAuthSuccess(user);
      }
    } catch (err) {
      let msg = err.message || 'Authentication failed.';
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        msg = 'Invalid email or password. Please try again.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Use at least 6 characters.';
      } else if (err.code === 'auth/not-configured' || err.code === 'auth/invalid-api-key') {
        msg = 'Firebase is not configured in .env. Please configure .env or continue as Guest.';
      }
      setError(msg);
      setTimeout(() => errorSummaryRef.current?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const isBusy = loading || googleLoading;

  return (
    <main
      className="min-h-dvh app-bg text-[var(--text)] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden selection:bg-[var(--primary)] selection:text-[#090d12]"
      id="auth-gate"
    >
      {/* Subtle Ambient Background Illumination */}
      <div
        aria-hidden="true"
        className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full bg-[var(--primary)]/[0.07] blur-[120px] pointer-events-none"
      />

      <div className="w-full max-w-[420px] relative z-10 space-y-6">
        {/* Logo Only — No Border, No Side Text */}
        <div className="flex justify-center">
          <img
            src={APP_LOGO_URL}
            alt="Azaad Music"
            className="h-16 w-auto object-contain select-none"
          />
        </div>

        {/* Authentication Console */}
        <div className="w-full rounded-3xl bg-[#101622]/90 backdrop-blur-xl p-6 sm:p-8 shadow-[0_24px_60px_rgba(0,0,0,0.55)] space-y-5">
          {/* Segmented Mode Switcher */}
          <div
            role="tablist"
            aria-label="Authentication mode"
            className="grid grid-cols-2 p-1 rounded-2xl bg-[#090d14]"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => handleModeSwitch('login')}
              className={`min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-150 whitespace-nowrap cursor-pointer touch-manipulation ${
                mode === 'login'
                  ? 'bg-[var(--primary)] text-[#090d12] font-bold shadow-sm'
                  : 'text-[var(--text-light)] hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => handleModeSwitch('signup')}
              className={`min-h-[44px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-150 whitespace-nowrap cursor-pointer touch-manipulation ${
                mode === 'signup'
                  ? 'bg-[var(--primary)] text-[#090d12] font-bold shadow-sm'
                  : 'text-[var(--text-light)] hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Accessible Error Summary */}
          {error && (
            <div
              ref={errorSummaryRef}
              tabIndex={-1}
              role="alert"
              aria-live="assertive"
              className="p-3.5 rounded-2xl bg-rose-500/12 text-rose-200 text-xs space-y-2.5 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span className="leading-relaxed flex-1">{error}</span>
              </div>
              {(!isFirebaseConfigured || error.includes('Guest')) && (
                <button
                  type="button"
                  onClick={handleEnterGuestSession}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Continue as Guest</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {/* Success Message */}
          {infoMessage && (
            <div
              role="status"
              aria-live="polite"
              className="p-3.5 rounded-2xl bg-emerald-500/12 text-emerald-200 text-xs flex items-center gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
              <span className="leading-relaxed flex-1">{infoMessage}</span>
            </div>
          )}

          {/* 1-Click Google Sign-In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isBusy}
            id="btn-google-auth"
            className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-900 font-semibold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all duration-150 shadow-md disabled:opacity-50 cursor-pointer touch-manipulation"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-900" aria-hidden="true" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span className="whitespace-nowrap">
              {googleLoading ? 'Signing in...' : 'Continue with Google'}
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-xs text-[var(--text-light)]">or</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleEmailSubmit} noValidate className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-display-name"
                  className="block text-xs font-semibold text-white"
                >
                  Display Name
                </label>
                <div className="relative">
                  <User
                    className="w-4 h-4 text-[var(--text-light)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    ref={nameInputRef}
                    id="auth-display-name"
                    name="name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, displayName: true }))}
                    placeholder="Your name"
                    autoComplete="name"
                    aria-invalid={Boolean(fieldErrors.displayName)}
                    aria-describedby={fieldErrors.displayName ? 'err-display-name' : undefined}
                    className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl bg-[#090d14] text-sm text-white placeholder:text-[var(--text-light)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                    required
                  />
                </div>
                {fieldErrors.displayName && (
                  <p id="err-display-name" className="text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{fieldErrors.displayName}</span>
                  </p>
                )}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="auth-email" className="block text-xs font-semibold text-white">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="w-4 h-4 text-[var(--text-light)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  ref={emailInputRef}
                  id="auth-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  placeholder="name@example.com"
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'err-email' : undefined}
                  className="w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl bg-[#090d14] text-sm text-white placeholder:text-[var(--text-light)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  required
                />
              </div>
              {fieldErrors.email && (
                <p id="err-email" className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{fieldErrors.email}</span>
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="auth-password" className="block text-xs font-semibold text-white">
                  Password
                </label>
                {mode === 'signup' && (
                  <span className="text-[11px] font-mono tabular-nums text-[var(--text-light)]">
                    {password.length}/6+
                  </span>
                )}
              </div>
              <div className="relative">
                <KeyRound
                  className="w-4 h-4 text-[var(--text-light)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={
                    fieldErrors.password
                      ? 'err-password'
                      : mode === 'signup'
                      ? 'hint-password-strength'
                      : undefined
                  }
                  className="w-full min-h-[46px] pl-10 pr-12 py-2.5 rounded-xl bg-[#090d14] text-sm text-white placeholder:text-[var(--text-light)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="min-w-[44px] min-h-[44px] absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-[var(--text-light)] hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              {fieldErrors.password && (
                <p id="err-password" className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{fieldErrors.password}</span>
                </p>
              )}

              {mode === 'signup' && password.length > 0 && (
                <div id="hint-password-strength" className="pt-1 space-y-1">
                  <div className="grid grid-cols-4 gap-1.5 h-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`rounded-full transition-colors duration-200 ${
                          passwordStrength.score >= level ? passwordStrength.color : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-[var(--text-light)]">{passwordStrength.label}</p>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-xs font-semibold text-white"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound
                    className="w-4 h-4 text-[var(--text-light)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    aria-describedby={fieldErrors.confirmPassword ? 'err-confirm-password' : undefined}
                    className="w-full min-h-[46px] pl-10 pr-12 py-2.5 rounded-xl bg-[#090d14] text-sm text-white placeholder:text-[var(--text-light)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    aria-pressed={showConfirmPassword}
                    className="min-w-[44px] min-h-[44px] absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-[var(--text-light)] hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p id="err-confirm-password" className="text-xs text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{fieldErrors.confirmPassword}</span>
                  </p>
                )}
              </div>
            )}

            {/* Primary Submit CTA */}
            <button
              type="submit"
              disabled={isBusy}
              className="w-full min-h-[48px] py-3 px-5 rounded-2xl bg-[var(--primary)] hover:brightness-110 active:scale-[0.99] text-[#090d12] font-bold text-xs sm:text-sm transition-all duration-150 glow-primary flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer touch-manipulation"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#090d12]" aria-hidden="true" />
                  <span>{mode === 'login' ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>

            {/* Guest Access Button */}
            <button
              type="button"
              onClick={handleEnterGuestSession}
              disabled={isBusy}
              className="w-full min-h-[46px] py-2.5 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] active:scale-[0.99] text-xs sm:text-sm font-medium text-[var(--text-light)] hover:text-white transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <Headphones className="w-4 h-4 text-[var(--primary)]" aria-hidden="true" />
              <span>Continue as Guest</span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
