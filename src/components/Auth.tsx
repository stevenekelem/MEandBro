import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { getApiUrl } from '../utils/api';
import { useApp } from '../context/AppContext';
import { Mail, Lock, UserPlus, LogIn, AlertCircle, CheckCircle2, X, Eye, EyeOff, KeyRound, Smartphone } from 'lucide-react';

interface AuthProps {
  onClose?: () => void;
  onAuthSuccess?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onClose, onAuthSuccess }) => {
  const { isPasswordRecovery, setIsPasswordRecovery } = useApp();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMsg('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file!');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (error) throw error;

        // Trigger welcome email on the Express backend
        if (data.user) {
          try {
            fetch(getApiUrl('/api/auth/welcome-email'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email.trim() })
            });
          } catch (mailErr) {
            console.warn('Failed to send welcome email trigger:', mailErr);
          }
        }

        if (data.user && data.session === null) {
          setSuccessMsg('Account created! Please check your inbox for a confirmation email.');
        } else {
          setSuccessMsg('Sign up successful! Logged in.');
          if (onAuthSuccess) setTimeout(onAuthSuccess, 1500);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) throw error;

        setSuccessMsg('Login successful!');
        if (onAuthSuccess) setTimeout(onAuthSuccess, 1000);
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Use production site URL for reset redirect link so mobile email links work properly
      const capacitor = (window as any).Capacitor;
      const isNative = capacitor && capacitor.isNativePlatform && capacitor.isNativePlatform();
      const redirectUrl = isNative || window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? 'https://spanglish-two.vercel.app'
        : window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl
      });

      if (error) throw error;

      setSuccessMsg('Password reset email sent! Open the link on your phone to launch the app and set your new password.');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setErrorMsg(err.message || 'Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccessMsg('Password updated successfully! You are now logged in.');
      setIsPasswordRecovery(false);
      if (onAuthSuccess) setTimeout(onAuthSuccess, 1200);
    } catch (err: any) {
      console.error('Update password error:', err);
      setErrorMsg(err.message || 'Failed to update password. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(30, 27, 75, 0.45)',
      backdropFilter: 'blur(20px)',
      border: '1px solid var(--border)',
      padding: '24px',
      borderRadius: '20px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      maxWidth: '360px',
      width: '100%',
      position: 'relative'
    }}>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '12px',
            top: '12px',
            background: 'var(--surface)',
            border: 'none',
            color: 'var(--text-muted)',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={14} />
        </button>
      )}

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'white' }}>
          {isPasswordRecovery 
            ? 'Set New Password' 
            : isResetPassword 
              ? 'Reset Password' 
              : isSignUp 
                ? 'Create Account' 
                : 'Welcome Back'}
        </h3>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
          {isPasswordRecovery
            ? 'Type your new account password below'
            : isResetPassword 
              ? 'Enter your email to receive a password reset link' 
              : isSignUp 
                ? 'Sign up to sync your dictionary and stats' 
                : 'Log in to access your cloud profile'}
        </p>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: 'var(--danger)',
          padding: '10px 12px',
          borderRadius: '10px',
          fontSize: '11.5px',
          lineHeight: '1.4'
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          background: 'var(--success-glow)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          color: 'var(--success)',
          padding: '10px 12px',
          borderRadius: '10px',
          fontSize: '11.5px',
          lineHeight: '1.4'
        }}>
          <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {isPasswordRecovery ? (
        /* Password Recovery Update Form */
        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* New Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
              New Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '10px 38px 10px 34px',
                  color: 'white',
                  fontSize: '12.5px',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
              Confirm New Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '10px 38px 10px 34px',
                  color: 'white',
                  fontSize: '12.5px',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--primary-gradient)',
              border: 'none',
              color: 'white',
              padding: '12px',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '6px',
              transition: 'all 0.2s ease',
              boxShadow: '0 8px 16px rgba(124, 58, 237, 0.2)'
            }}
          >
            {loading ? (
              <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'voicePulse 0.5s infinite' }}></div>
            ) : (
              <>
                <KeyRound size={14} />
                <span>Save New Password</span>
              </>
            )}
          </button>
        </form>
      ) : isResetPassword ? (
        /* Password Reset Form */
        <form onSubmit={handlePasswordReset} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
              Email Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                style={{
                  width: '100%',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  padding: '10px 10px 10px 34px',
                  color: 'white',
                  fontSize: '12.5px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            padding: '8px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#38bdf8'
          }}>
            <Smartphone size={14} style={{ flexShrink: 0 }} />
            <span>Note: Open the reset email link on your mobile phone to launch the app directly.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'var(--primary-gradient)',
              border: 'none',
              color: 'white',
              padding: '12px',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '6px',
              transition: 'all 0.2s ease',
              boxShadow: '0 8px 16px rgba(124, 58, 237, 0.2)'
            }}
          >
            {loading ? (
              <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'voicePulse 0.5s infinite' }}></div>
            ) : (
              <span>Send Reset Link</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setIsResetPassword(false); setErrorMsg(null); setSuccessMsg(null); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--primary)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '4px',
              textAlign: 'center'
            }}
          >
            Back to Login
          </button>
        </form>
      ) : (
        /* Regular Login / Sign Up Form */
        <>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.25)',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid var(--border)'
          }}>
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setErrorMsg(null); setSuccessMsg(null); }}
              style={{
                flex: 1,
                background: !isSignUp ? 'var(--primary-gradient)' : 'transparent',
                border: 'none',
                color: 'white',
                fontWeight: '600',
                fontSize: '12px',
                padding: '6px',
                borderRadius: '7px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setErrorMsg(null); setSuccessMsg(null); }}
              style={{
                flex: 1,
                background: isSignUp ? 'var(--primary-gradient)' : 'transparent',
                border: 'none',
                color: 'white',
                fontWeight: '600',
                fontSize: '12px',
                padding: '6px',
                borderRadius: '7px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                Email Address
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Mail size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={{
                    width: '100%',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '10px 10px 10px 34px',
                    color: 'white',
                    fontSize: '12.5px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => { setIsResetPassword(true); setErrorMsg(null); setSuccessMsg(null); }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '10px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  style={{
                    width: '100%',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '10px 38px 10px 34px',
                    color: 'white',
                    fontSize: '12.5px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'var(--primary-gradient)',
                border: 'none',
                color: 'white',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px',
                transition: 'all 0.2s ease',
                boxShadow: '0 8px 16px rgba(124, 58, 237, 0.2)'
              }}
            >
              {loading ? (
                <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'voicePulse 0.5s infinite' }}></div>
              ) : isSignUp ? (
                <>
                  <UserPlus size={14} />
                  <span>Create Account</span>
                </>
              ) : (
                <>
                  <LogIn size={14} />
                  <span>Log In</span>
                </>
              )}
            </button>
          </form>

        </>
      )}
    </div>
  );
};
