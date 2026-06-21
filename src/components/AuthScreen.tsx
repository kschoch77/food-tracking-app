'use client';

import React, { useState } from 'react';
import { supabase, isDemoMode } from '../lib/supabase';
import { LogIn, UserPlus, Play, AlertCircle, Lock, Mail, Eye, EyeOff } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (sessionUser: any) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isDemoMode) {
      // Mock successful login in Demo Mode
      setTimeout(() => {
        setLoading(false);
        onAuthSuccess({
          id: 'demo-user-id-999',
          email: email || 'demo@example.com',
          user_metadata: { name: 'Demo User' },
        });
      }, 600);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpErr) throw signUpErr;
        
        // Show success alert or log in directly if user is confirmed
        if (data.session) {
          onAuthSuccess(data.user);
        } else {
          setError('Signup successful! Check your email for verification link.');
        }
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr) throw signInErr;
        if (data.user) {
          onAuthSuccess(data.user);
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoModeDirect = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onAuthSuccess({
        id: 'demo-user-id-999',
        email: 'demo@macrotrack.com',
        user_metadata: { name: 'Demo Explorer' },
      });
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-sm z-10 space-y-6">
        <div className="text-center space-y-2">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-dark-border shadow-lg">
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
              FT
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            NutriFlow
          </h2>
          <p className="text-slate-400 text-xs max-w-xs mx-auto">
            Mobile-First Nutrition Tracker & Meal Planner
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-md border border-dark-border rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-dark-border/50">
            <button
              onClick={() => {
                setIsSignUp(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                !isSignUp
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsSignUp(true);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                isSignUp
                  ? 'bg-slate-800 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-400 text-xs rounded-xl flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-dark-border hover:border-slate-800 focus:border-emerald-500/80 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xxs font-bold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-dark-border hover:border-slate-800 focus:border-emerald-500/80 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-200 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-60 text-slate-950 text-xs font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {isDemoMode && (
            <div className="space-y-3 pt-3 border-t border-dark-border/40">
              <div className="text-center">
                <span className="text-slate-500 text-xxs font-medium uppercase tracking-wider">
                  Or Explore Instantly
                </span>
              </div>
              <button
                type="button"
                onClick={handleDemoModeDirect}
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 text-xs font-bold py-3 rounded-xl border border-dark-border transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                <span>Enter Demo Mode (Offline)</span>
              </button>
            </div>
          )}
        </div>

        <div className="text-center text-slate-500 text-xxs px-4">
          By signing in, you agree to our Terms of Service. In Demo Mode, all data is strictly stored in your local sandbox.
        </div>
      </div>
    </div>
  );
}
