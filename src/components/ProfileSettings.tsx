'use client';

import React, { useState, useEffect } from 'react';
import { db, Profile } from '../lib/db';
import { Settings, Save, Sparkles, ChevronLeft, Calendar, FileSpreadsheet, LogOut, Award, User, RefreshCw } from 'lucide-react';

interface ProfileSettingsProps {
  onLogout: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToPlanner: () => void;
}

export default function ProfileSettings({ onLogout, onNavigateToDashboard, onNavigateToPlanner }: ProfileSettingsProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [calories, setCalories] = useState(2000);
  const [protein, setProtein] = useState(150);
  const [carbs, setCarbs] = useState(200);
  const [fat, setFat] = useState(65);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch current targets
  useEffect(() => {
    const fetchProfile = async () => {
      const prof = await db.getProfile();
      if (prof) {
        setProfile(prof);
        setCalories(prof.daily_calorie_target);
        setProtein(prof.protein_target);
        setCarbs(prof.carbs_target);
        setFat(prof.fat_target);
      }
    };
    fetchProfile();
  }, []);

  // Save profile targets
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);

    const updated = await db.updateProfile({
      daily_calorie_target: calories,
      protein_target: protein,
      carbs_target: carbs,
      fat_target: fat,
    });

    setLoading(false);
    if (updated) {
      setSuccessMsg('Nutrition goals saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Helper preset: balanced zone (40% carbs, 30% protein, 30% fat)
  const applyPresetBalanced = () => {
    // 1g Protein = 4 kcal
    // 1g Carb = 4 kcal
    // 1g Fat = 9 kcal
    const pTarget = Math.round((calories * 0.30) / 4);
    const cTarget = Math.round((calories * 0.40) / 4);
    const fTarget = Math.round((calories * 0.30) / 9);

    setProtein(pTarget);
    setCarbs(cTarget);
    setFat(fTarget);
  };

  // Helper preset: low carb / keto zone (5% carbs, 25% protein, 70% fat)
  const applyPresetKeto = () => {
    const pTarget = Math.round((calories * 0.25) / 4);
    const cTarget = Math.round((calories * 0.05) / 4);
    const fTarget = Math.round((calories * 0.70) / 9);

    setProtein(pTarget);
    setCarbs(cTarget);
    setFat(fTarget);
  };

  // Helper preset: high protein / building zone (40% protein, 40% carbs, 20% fat)
  const applyPresetHighProtein = () => {
    const pTarget = Math.round((calories * 0.40) / 4);
    const cTarget = Math.round((calories * 0.40) / 4);
    const fTarget = Math.round((calories * 0.20) / 9);

    setProtein(pTarget);
    setCarbs(cTarget);
    setFat(fTarget);
  };

  // Calculate percentage splits dynamically for visual preview
  const totalKcalAllocated = (protein * 4) + (carbs * 4) + (fat * 9);
  const pPct = totalKcalAllocated > 0 ? Math.round(((protein * 4) / totalKcalAllocated) * 100) : 0;
  const cPct = totalKcalAllocated > 0 ? Math.round(((carbs * 4) / totalKcalAllocated) * 100) : 0;
  const fPct = totalKcalAllocated > 0 ? Math.round(((fat * 9) / totalKcalAllocated) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto bg-slate-950 min-h-screen text-slate-100 pb-24 relative select-none">
      <header className="px-4 py-3 bg-slate-900 border-b border-dark-border flex justify-between items-center shrink-0">
        <h1 className="font-extrabold text-sm text-slate-100">Nutrition Goals</h1>
        <button
          onClick={onLogout}
          className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/40 shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {successMsg && (
          <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex gap-2 items-center animate-pulse">
            <Award className="w-4.5 h-4.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Calorie slider/input */}
        <div className="bg-slate-900 border border-dark-border/40 rounded-xl p-4 space-y-3 shadow">
          <div className="flex justify-between items-center text-xs">
            <label className="font-bold text-slate-400 uppercase tracking-wider">Daily Calorie Target</label>
            <span className="font-black text-emerald-400 text-sm">{calories} kcal</span>
          </div>
          <div className="flex gap-3 items-center">
            <input
              type="range"
              min="1000"
              max="5000"
              step="50"
              value={calories}
              onChange={(e) => setCalories(parseInt(e.target.value))}
              className="flex-1 accent-emerald-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
            />
            <input
              type="number"
              value={calories}
              step="50"
              min="1000"
              max="5000"
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) setCalories(val);
              }}
              className="w-16 bg-slate-950 border border-dark-border rounded-lg text-center py-1.5 text-xs text-slate-200 focus:outline-none"
            />
          </div>
        </div>

        {/* Macros split adjustment */}
        <div className="bg-slate-900 border border-dark-border/40 rounded-xl p-4 space-y-4 shadow">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Macronutrients</span>
          
          {/* Protein */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <label className="font-bold text-blue-400">Protein Goal</label>
              <span className="font-bold text-slate-200">{protein}g ({pPct}%)</span>
            </div>
            <div className="flex gap-3 items-center">
              <input
                type="range"
                min="20"
                max="300"
                step="5"
                value={protein}
                onChange={(e) => setProtein(parseInt(e.target.value))}
                className="flex-1 accent-blue-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
              <input
                type="number"
                value={protein}
                min="20"
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) setProtein(val);
                }}
                className="w-14 bg-slate-950 border border-dark-border rounded-lg text-center py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <label className="font-bold text-yellow-400">Carbohydrates Goal</label>
              <span className="font-bold text-slate-200">{carbs}g ({cPct}%)</span>
            </div>
            <div className="flex gap-3 items-center">
              <input
                type="range"
                min="10"
                max="500"
                step="5"
                value={carbs}
                onChange={(e) => setCarbs(parseInt(e.target.value))}
                className="flex-1 accent-yellow-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
              <input
                type="number"
                value={carbs}
                min="10"
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) setCarbs(val);
                }}
                className="w-14 bg-slate-950 border border-dark-border rounded-lg text-center py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Fat */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <label className="font-bold text-orange-400">Fat Goal</label>
              <span className="font-bold text-slate-200">{fat}g ({fPct}%)</span>
            </div>
            <div className="flex gap-3 items-center">
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={fat}
                onChange={(e) => setFat(parseInt(e.target.value))}
                className="flex-1 accent-orange-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
              <input
                type="number"
                value={fat}
                min="10"
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) setFat(val);
                }}
                className="w-14 bg-slate-950 border border-dark-border rounded-lg text-center py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-dark-border/20 text-xxs text-slate-400 text-center flex justify-between font-medium">
            <span>Macro Calorie Sum: {totalKcalAllocated} kcal</span>
            <span className={Math.abs(totalKcalAllocated - calories) > 100 ? 'text-orange-400' : 'text-slate-500'}>
              Δ: {totalKcalAllocated - calories} kcal
            </span>
          </div>
        </div>

        {/* Preset Macro Calculators */}
        <div className="bg-slate-900 border border-dark-border/40 rounded-xl p-4 space-y-3 shadow">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Auto Preset Splits</span>
          
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={applyPresetBalanced}
              className="py-2.5 bg-slate-950 border border-dark-border hover:border-emerald-500/40 rounded-xl text-[10px] font-bold text-slate-200 text-center cursor-pointer transition"
            >
              Balanced<br /><span className="text-[9px] text-slate-500 font-medium">30p/40c/30f</span>
            </button>
            <button
              type="button"
              onClick={applyPresetKeto}
              className="py-2.5 bg-slate-950 border border-dark-border hover:border-emerald-500/40 rounded-xl text-[10px] font-bold text-slate-200 text-center cursor-pointer transition"
            >
              Keto Diet<br /><span className="text-[9px] text-slate-500 font-medium">25p/5c/70f</span>
            </button>
            <button
              type="button"
              onClick={applyPresetHighProtein}
              className="py-2.5 bg-slate-950 border border-dark-border hover:border-emerald-500/40 rounded-xl text-[10px] font-bold text-slate-200 text-center cursor-pointer transition"
            >
              High Prot<br /><span className="text-[9px] text-slate-500 font-medium">40p/40c/20f</span>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-60 text-slate-950 text-xs font-extrabold py-3.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/10"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Goals & Targets</span>
            </>
          )}
        </button>
      </form>

      {/* Navigation Footer */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900 border-t border-dark-border flex justify-around py-3 shrink-0 z-30 shadow-2xl">
        <button
          onClick={onNavigateToDashboard}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[9px]">Dashboard</span>
        </button>
        <button
          onClick={onNavigateToPlanner}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <FileSpreadsheet className="w-5 h-5" />
          <span className="text-[9px]">Meal Plans</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 text-emerald-400 font-bold cursor-pointer"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px]">Settings</span>
        </button>
      </footer>
    </div>
  );
}
