'use client';

import React, { useState, useEffect } from 'react';
import { supabase, isDemoMode } from '../lib/supabase';
import DemoBanner from '../components/DemoBanner';
import AuthScreen from '../components/AuthScreen';
import Dashboard from '../components/Dashboard';
import MealPlanner from '../components/MealPlanner';
import ProfileSettings from '../components/ProfileSettings';
import { Loader2 } from 'lucide-react';

type Tab = 'dashboard' | 'planner' | 'profile';

export default function Home() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    if (isDemoMode) {
      // In Demo Mode, check if we have a mocked session stored in sessionStorage or localStorage
      if (typeof window !== 'undefined') {
        const cachedUser = sessionStorage.getItem('demo_user') || localStorage.getItem('demo_user');
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch {
            setUser(null);
          }
        }
      }
      setLoading(false);
      return;
    }

    // Production Supabase Auth Listener
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('Error fetching Supabase session:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthSuccess = (sessionUser: any) => {
    setUser(sessionUser);
    if (isDemoMode && typeof window !== 'undefined') {
      sessionStorage.setItem('demo_user', JSON.stringify(sessionUser));
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    if (isDemoMode) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('demo_user');
        localStorage.removeItem('demo_user');
      }
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-300">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <span className="text-xs">Loading profile settings...</span>
      </div>
    );
  }

  // If not logged in, force authentication screen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        {isDemoMode && <DemoBanner />}
        <div className="flex-1 flex items-center justify-center">
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Show guide banner if running without Supabase credentials */}
      {isDemoMode && <DemoBanner />}

      {/* Primary tab views router */}
      <main className="flex-1 flex flex-col w-full max-w-md mx-auto relative">
        {activeTab === 'dashboard' && (
          <Dashboard
            user={user}
            onLogout={handleLogout}
            onNavigateToPlanner={() => setActiveTab('planner')}
            onNavigateToProfile={() => setActiveTab('profile')}
          />
        )}

        {activeTab === 'planner' && (
          <MealPlanner
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            onNavigateToProfile={() => setActiveTab('profile')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileSettings
            onLogout={handleLogout}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            onNavigateToPlanner={() => setActiveTab('planner')}
          />
        )}
      </main>
    </div>
  );
}
