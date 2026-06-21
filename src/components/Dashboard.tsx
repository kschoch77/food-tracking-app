'use client';

import React, { useState, useEffect } from 'react';
import { db, DailyLog, MealPlan, Profile } from '../lib/db';
import { ChevronLeft, ChevronRight, Calendar, Plus, Trash2, CheckSquare, Square, FileSpreadsheet, Sparkles, LogOut, Settings, Award, Coffee, Sun, Moon, Apple, Inbox } from 'lucide-react';
import SearchOverlay from './SearchOverlay';

interface DashboardProps {
  user: any;
  onLogout: () => void;
  onNavigateToPlanner: () => void;
  onNavigateToProfile: () => void;
}

export default function Dashboard({ user, onLogout, onNavigateToPlanner, onNavigateToProfile }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    // YYYY-MM-DD local format
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [activeAddSlot, setActiveAddSlot] = useState<string | null>(null);
  const [showSlotSelector, setShowSlotSelector] = useState(false);

  // Collapsible sections
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({
    Breakfast: true,
    Lunch: true,
    Dinner: true,
    Snack: true,
    Uncategorized: true,
  });

  // Portion edit state
  const [editingLog, setEditingLog] = useState<DailyLog | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);

  // Load profile, logs, and meal plans
  const loadData = async () => {
    const prof = await db.getProfile();
    setProfile(prof);

    const dailyLogs = await db.getDailyLogs(selectedDate);
    setLogs(dailyLogs);

    const plans = await db.getMealPlans();
    setMealPlans(plans);
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  // Handle date shifting
  const shiftDate = (days: number) => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + days);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // Toggle log checked status
  const handleToggleCheck = async (log: DailyLog) => {
    const updated = await db.updateDailyLog(log.id, { is_checked: !log.is_checked });
    if (updated) {
      setLogs((prev) => prev.map((l) => (l.id === log.id ? updated : l)));
    }
  };

  // Delete log item
  const handleDeleteLog = async (id: string) => {
    const success = await db.deleteDailyLog(id);
    if (success) {
      setLogs((prev) => prev.filter((l) => l.id !== id));
    }
  };

  // Open portion editor
  const handleOpenEdit = (log: DailyLog) => {
    setEditingLog(log);
    setEditQuantity(log.serving_quantity);
  };

  // Save edited portion
  const handleSaveEdit = async () => {
    if (!editingLog) return;
    const multiplier = editQuantity / editingLog.serving_quantity;
    const updates = {
      serving_quantity: editQuantity,
      calories: Number((editingLog.calories * multiplier).toFixed(1)),
      protein: Number((editingLog.protein * multiplier).toFixed(1)),
      carbs: Number((editingLog.carbs * multiplier).toFixed(1)),
      fat: Number((editingLog.fat * multiplier).toFixed(1)),
    };

    const updated = await db.updateDailyLog(editingLog.id, updates);
    if (updated) {
      setLogs((prev) => prev.map((l) => (l.id === editingLog.id ? updated : l)));
      setEditingLog(null);
    }
  };

  // Add food from search overlay
  const handleAddFoodFromSearch = async (food: {
    food_name: string;
    serving_quantity: number;
    serving_unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => {
    if (!activeAddSlot) return;
    
    const added = await db.addDailyLog({
      date: selectedDate,
      meal_slot: activeAddSlot as any,
      food_name: food.food_name,
      serving_quantity: food.serving_quantity,
      serving_unit: food.serving_unit,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });

    if (added) {
      setLogs((prev) => [...prev, added]);
    }
    setActiveAddSlot(null);
  };

  // Apply meal plan template
  const handleApplyMealPlan = async (planId: string) => {
    const inserted = await db.applyMealPlan(planId, selectedDate);
    if (inserted.length > 0) {
      setLogs((prev) => [...prev, ...inserted]);
    }
    setShowApplyModal(false);
  };

  // Calculations
  const targets = profile || {
    daily_calorie_target: 2000,
    protein_target: 150,
    carbs_target: 200,
    fat_target: 65,
  };

  // Eaten macro totals (only checked items count, or all items? Let's check requirements:
  // "The actual tracked food items consumed by the user... has a checkbox next to it so users can check off items as they consume them"
  // Let's count checked items as consumed for the progress summary to motivate checking them off! Yes, this aligns with the requirement "check off items as they consume them".
  const totals = logs.reduce(
    (acc, log) => {
      if (log.is_checked) {
        acc.calories += log.calories;
        acc.protein += log.protein;
        acc.carbs += log.carbs;
        acc.fat += log.fat;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const caloriesRemaining = targets.daily_calorie_target - totals.calories;

  // Meal slots list
  const slots: ('Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Uncategorized')[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Uncategorized'];

  // Group logs by slot
  const logsBySlot = logs.reduce((acc, log) => {
    if (!acc[log.meal_slot]) {
      acc[log.meal_slot] = [];
    }
    acc[log.meal_slot].push(log);
    return acc;
  }, {} as Record<string, DailyLog[]>);

  // Formatting date for reader
  const formatDateHeader = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto bg-slate-950 min-h-screen text-slate-100 pb-24 relative select-none">
      {/* Top Header Navigation */}
      <header className="px-4 py-3 bg-slate-900 border-b border-dark-border flex justify-between items-center shrink-0">
        <div className="flex items-center gap-1.5" onClick={onNavigateToProfile}>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-dark-border flex items-center justify-center cursor-pointer">
            <Settings className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-left leading-none cursor-pointer">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Targets</p>
            <p className="text-xs font-black text-emerald-400">{targets.daily_calorie_target} kcal</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-full border border-dark-border/60">
          <button onClick={() => shiftDate(-1)} className="p-0.5 text-slate-400 hover:text-slate-200">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-200 min-w-[76px] text-center">
            {formatDateHeader(selectedDate)}
          </span>
          <button onClick={() => shiftDate(1)} className="p-0.5 text-slate-400 hover:text-slate-200">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={onLogout}
          className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800/50 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Target Progress Panel (Cronometer Style - High Density) */}
      <div className="p-4 bg-slate-900 border-b border-dark-border shrink-0 space-y-4 shadow-md">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Calories Remaining</span>
            <span className={`text-2xl font-black ${caloriesRemaining >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {caloriesRemaining} <span className="text-xs font-normal text-slate-400">kcal</span>
            </span>
          </div>
          <div className="text-right text-xxs font-medium text-slate-400">
            <span>Eaten: {Math.round(totals.calories)} kcal</span>
            <span className="mx-1.5">•</span>
            <span>Goal: {targets.daily_calorie_target} kcal</span>
          </div>
        </div>

        {/* Calories Progress Bar */}
        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-dark-border/40">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${Math.min(100, (totals.calories / targets.daily_calorie_target) * 100)}%` }}
          />
        </div>

        {/* Macro Progress Bars Grid */}
        <div className="grid grid-cols-3 gap-3 pt-1">
          {/* Protein */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-blue-400 font-bold">Protein</span>
              <span className="text-slate-300 font-bold">
                {Math.round(totals.protein)}/{targets.protein_target}g
              </span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-dark-border/30">
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totals.protein / targets.protein_target) * 100)}%` }}
              />
            </div>
          </div>

          {/* Carbs */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-yellow-400 font-bold">Carbs</span>
              <span className="text-slate-300 font-bold">
                {Math.round(totals.carbs)}/{targets.carbs_target}g
              </span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-dark-border/30">
              <div
                className="bg-yellow-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totals.carbs / targets.carbs_target) * 100)}%` }}
              />
            </div>
          </div>

          {/* Fat */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-orange-400 font-bold">Fat</span>
              <span className="text-slate-300 font-bold">
                {Math.round(totals.fat)}/{targets.fat_target}g
              </span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-dark-border/30">
              <div
                className="bg-orange-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (totals.fat / targets.fat_target) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Logs View */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
        {logs.length === 0 && (
          /* Non-blocking Empty State / Tip Banner */
          <div className="py-6 px-4 bg-slate-900/40 border border-dark-border/60 rounded-2xl text-center space-y-3 shrink-0">
            <p className="text-slate-400 text-xxs max-w-xs mx-auto">
              Your log is empty for today. Tap the "+" button below or manually add food to any category.
            </p>
            <button
              onClick={() => setShowApplyModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xxs rounded-xl cursor-pointer transition shadow-md shadow-emerald-500/15 mx-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply Meal Plan Template</span>
            </button>
          </div>
        )}

        {/* Meal Slots Map */}
        {slots.map((slot) => {
          const slotLogs = logsBySlot[slot] || [];
          const expanded = expandedSlots[slot];
          const slotCalories = slotLogs.reduce((sum, l) => sum + (l.is_checked ? l.calories : 0), 0);

          return (
            <div key={slot} className="bg-slate-900/60 border border-dark-border/60 rounded-xl overflow-hidden shadow">
              {/* Collapsible header */}
              <button
                onClick={() => setExpandedSlots((prev) => ({ ...prev, [slot]: !prev[slot] }))}
                className="w-full px-3.5 py-3 bg-slate-900 flex justify-between items-center text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-slate-200">{slot}</span>
                  <span className="text-[10px] text-slate-500 font-bold">
                    ({slotLogs.length} {slotLogs.length === 1 ? 'item' : 'items'})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-300">{Math.round(slotCalories)} kcal</span>
                </div>
              </button>

              {expanded && (
                <div className="p-3.5 space-y-3 border-t border-dark-border/30">
                  {slotLogs.length > 0 ? (
                    <div className="space-y-2">
                      {slotLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex justify-between items-center gap-2 py-1.5 border-b border-dark-border/20 last:border-b-0"
                        >
                          {/* Checkbox + Title */}
                          <div className="flex items-center gap-2.5 max-w-[70%]">
                            <button
                              onClick={() => handleToggleCheck(log)}
                              className="text-slate-400 hover:text-emerald-400 transition"
                            >
                              {log.is_checked ? (
                                <CheckSquare className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-500" />
                              )}
                            </button>
                            <div className="text-left min-w-0" onClick={() => handleOpenEdit(log)}>
                              <p
                                className={`font-semibold text-xs text-slate-200 truncate ${
                                  log.is_checked ? 'strike-through text-slate-500' : ''
                                }`}
                              >
                                {log.food_name}
                              </p>
                              <p className="text-[9px] text-slate-400 truncate">
                                {log.serving_quantity} • {log.serving_unit}
                              </p>
                            </div>
                          </div>

                          {/* Macros & Delete */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right leading-tight">
                              <p className={`text-xs font-bold ${log.is_checked ? 'text-slate-500' : 'text-slate-300'}`}>
                                {Math.round(log.calories)} kcal
                              </p>
                              <p className="text-[9px] text-slate-500">
                                P: {Math.round(log.protein)}g • C: {Math.round(log.carbs)}g • F: {Math.round(log.fat)}g
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="text-slate-500 hover:text-red-400 p-1 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic py-1 text-center">No foods logged</p>
                  )}

                  {/* Add Food Button */}
                  <button
                    onClick={() => setActiveAddSlot(slot)}
                    className="w-full py-2 bg-slate-950 border border-dashed border-dark-border/60 hover:border-emerald-500/50 hover:bg-slate-900 rounded-xl text-[10px] text-slate-400 hover:text-slate-200 font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Food</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Manual Apply Button at the bottom of the list */}
        <div className="pt-2">
          <button
            onClick={() => setShowApplyModal(true)}
            className="w-full py-3 bg-slate-900 border border-dark-border/80 hover:bg-slate-850 text-slate-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition shadow"
          >
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>Apply Meal Plan Template</span>
          </button>
        </div>
      </div>

      {/* ======================================================================
          SEARCH OVERLAY ROUTER
          ====================================================================== */}
      {activeAddSlot && (
        <SearchOverlay
          mealSlot={activeAddSlot}
          onClose={() => setActiveAddSlot(null)}
          onAddFood={handleAddFoodFromSearch}
        />
      )}

      {/* ======================================================================
          APPLY MEAL PLAN MODAL
          ====================================================================== */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-dark-border w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <h4 className="font-bold text-slate-100 text-sm">Select Meal Plan</h4>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded-lg"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 max-h-60 overflow-y-auto no-scrollbar space-y-2">
              {mealPlans.length > 0 ? (
                mealPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => handleApplyMealPlan(plan.id)}
                    className="w-full p-3 bg-slate-950 hover:bg-slate-800 border border-dark-border/50 hover:border-emerald-500/40 rounded-xl text-left flex justify-between items-center group cursor-pointer transition"
                  >
                    <div>
                      <p className="font-bold text-xs text-slate-200 group-hover:text-emerald-400 truncate">
                        {plan.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {plan.items?.length || 0} items structured
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
                  </button>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-slate-400 text-xs">No meal plans built yet.</p>
                  <button
                    onClick={() => {
                      setShowApplyModal(false);
                      onNavigateToPlanner();
                    }}
                    className="mt-2 text-emerald-400 hover:underline text-xs font-semibold cursor-pointer"
                  >
                    Build your first plan
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-950 border-t border-dark-border flex justify-end">
              <button
                onClick={() => setShowApplyModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          EDIT PORTION SHEET MODAL (PORTION QUICK UPDATE)
          ====================================================================== */}
      {editingLog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-slate-900 border border-dark-border w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wide">Edit Portion</h4>
                <p className="font-black text-slate-100 text-sm truncate">{editingLog.food_name}</p>
              </div>
              <button
                onClick={() => setEditingLog(null)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded-lg"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serving size quantity</span>
                  <span className="font-bold text-emerald-400">
                    x{editQuantity.toFixed(2)} ({editingLog.serving_unit})
                  </span>
                </div>
                <div className="flex gap-3 items-center">
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.05"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(parseFloat(e.target.value))}
                    className="flex-1 accent-emerald-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    value={editQuantity}
                    step="0.1"
                    min="0.1"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val)) setEditQuantity(val);
                    }}
                    className="w-14 bg-slate-950 border border-dark-border rounded-lg text-center py-1 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Nutrition Preview */}
              <div className="p-3 bg-slate-950 border border-dark-border/40 rounded-xl space-y-2 text-xxs">
                <div className="flex justify-between font-bold text-slate-400">
                  <span>Calories Eaten:</span>
                  <span className="text-emerald-400 text-xs font-black">
                    {Math.round(editingLog.calories * (editQuantity / editingLog.serving_quantity))} kcal
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border-t border-dark-border flex gap-2">
              <button
                onClick={() => setEditingLog(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl cursor-pointer text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl cursor-pointer text-center"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setShowSlotSelector(true)}
        className="fixed bottom-20 right-4 w-12 h-12 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/25 active:scale-95 transition cursor-pointer z-40"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {/* ======================================================================
          SLOT SELECTOR SHEET/MODAL
          ====================================================================== */}
      {showSlotSelector && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-slate-900 border border-dark-border w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-dark-border flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wide">Add Food</h4>
                <p className="font-black text-slate-100 text-sm">Select meal category</p>
              </div>
              <button
                onClick={() => setShowSlotSelector(false)}
                className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded-lg"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {[
                { name: 'Breakfast', icon: Coffee, desc: 'Morning fuel and coffee' },
                { name: 'Lunch', icon: Sun, desc: 'Midday meal and proteins' },
                { name: 'Dinner', icon: Moon, desc: 'Evening meal and vegetables' },
                { name: 'Snack', icon: Apple, desc: 'Quick bites and fruits' },
                { name: 'Uncategorized', icon: Inbox, desc: 'Miscellaneous and other' },
              ].map((item) => {
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      setActiveAddSlot(item.name);
                      setShowSlotSelector(false);
                    }}
                    className="w-full p-3 bg-slate-950 hover:bg-slate-850 border border-dark-border/40 hover:border-emerald-500/40 rounded-xl text-left flex items-center gap-3 group cursor-pointer transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-dark-border/60 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-slate-200 group-hover:text-emerald-400 transition">
                        {item.name}
                      </p>
                      <p className="text-[9px] text-slate-500">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 bg-slate-950 border-t border-dark-border flex justify-end">
              <button
                onClick={() => setShowSlotSelector(false)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Footer */}
      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900 border-t border-dark-border flex justify-around py-3 shrink-0 z-30 shadow-2xl">
        <button
          className="flex flex-col items-center gap-1 text-emerald-400 font-bold cursor-pointer"
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
          onClick={onNavigateToProfile}
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px]">Settings</span>
        </button>
      </footer>
    </div>
  );
}

// Quick clean inline icon mapping
function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
