'use client';

import React, { useState, useEffect } from 'react';
import { db, MealPlan, MealPlanItem } from '../lib/db';
import { FileSpreadsheet, Plus, Trash2, ChevronRight, X, Sparkles, ChevronLeft, Calendar, Settings, Apple } from 'lucide-react';
import SearchOverlay from './SearchOverlay';

interface MealPlannerProps {
  onNavigateToDashboard: () => void;
  onNavigateToProfile: () => void;
}

export default function MealPlanner({ onNavigateToDashboard, onNavigateToProfile }: MealPlannerProps) {
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(false);

  // Builder view states
  const [isBuilding, setIsBuilding] = useState(false);
  const [planName, setPlanName] = useState('');
  const [builderItems, setBuilderItems] = useState<Omit<MealPlanItem, 'id' | 'meal_plan_id'>[]>([]);
  const [activeAddSlot, setActiveAddSlot] = useState<string | null>(null);

  // Load plans from DB
  const loadPlans = async () => {
    setLoading(true);
    const data = await db.getMealPlans();
    setPlans(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleDeletePlan = async (id: string) => {
    const success = await db.deleteMealPlan(id);
    if (success) {
      setPlans((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // Add food item inside builder
  const handleAddFoodToBuilder = (food: {
    food_name: string;
    serving_quantity: number;
    serving_unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => {
    if (!activeAddSlot) return;

    setBuilderItems((prev) => [
      ...prev,
      {
        food_source: 'custom',
        food_id: Math.random().toString(), // local temporary unique id
        food_name: food.food_name,
        serving_quantity: food.serving_quantity,
        serving_unit: food.serving_unit,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        meal_slot: activeAddSlot as any,
      },
    ]);

    setActiveAddSlot(null);
  };

  const handleRemoveBuilderItem = (foodId: string) => {
    setBuilderItems((prev) => prev.filter((item) => item.food_id !== foodId));
  };

  // Save the complete meal plan
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) return;

    const saved = await db.addMealPlan(planName.trim(), builderItems);
    if (saved) {
      setPlanName('');
      setBuilderItems([]);
      setIsBuilding(false);
      loadPlans();
    }
  };

  // Calculation totals for the plan in-progress
  const builderTotals = builderItems.reduce(
    (sum, item) => {
      sum.calories += item.calories;
      sum.protein += item.protein;
      sum.carbs += item.carbs;
      sum.fat += item.fat;
      return sum;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const slots = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  return (
    <div className="flex-1 flex flex-col max-w-md mx-auto bg-slate-950 min-h-screen text-slate-100 pb-24 relative select-none">
      {/* ----------------------------------------------------------------------
          1. MAIN MEAL PLANS LIST VIEW
          ---------------------------------------------------------------------- */}
      {!isBuilding ? (
        <>
          <header className="px-4 py-3 bg-slate-900 border-b border-dark-border flex justify-between items-center shrink-0">
            <h1 className="font-extrabold text-sm text-slate-100">Saved Meal Plans</h1>
            <button
              onClick={() => setIsBuilding(true)}
              className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-xl cursor-pointer transition shadow-md shadow-emerald-500/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Plan</span>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar">
            {plans.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <FileSpreadsheet className="w-10 h-10 text-slate-700 mx-auto" />
                <div>
                  <h4 className="font-semibold text-slate-200 text-xs">No Meal Plans Yet</h4>
                  <p className="text-slate-500 text-[10px] max-w-xs mx-auto mt-1">
                    Design custom daily templates for different diet protocols like High Carb, Low Carb, or Rest Days.
                  </p>
                </div>
                <button
                  onClick={() => setIsBuilding(true)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs border border-dark-border/80 rounded-xl cursor-pointer transition"
                >
                  Build Custom Plan
                </button>
              </div>
            ) : (
              plans.map((plan) => {
                // Calculate plan calories/macros
                const planTotals = (plan.items || []).reduce(
                  (acc, item) => {
                    acc.calories += item.calories;
                    acc.protein += item.protein;
                    acc.carbs += item.carbs;
                    acc.fat += item.fat;
                    return acc;
                  },
                  { calories: 0, protein: 0, carbs: 0, fat: 0 }
                );

                return (
                  <div
                    key={plan.id}
                    className="p-4 bg-slate-900 border border-dark-border/60 rounded-xl space-y-3 shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          {plan.user_id === null && (
                            <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-extrabold uppercase shrink-0 tracking-wider">
                              Seed
                            </span>
                          )}
                          <h3 className="font-extrabold text-xs text-slate-200">{plan.name}</h3>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {plan.items?.length || 0} items structured
                        </p>
                      </div>

                      {plan.user_id !== null && (
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-dark-border/30 flex justify-between items-center text-xxs">
                      <div>
                        <span className="font-black text-slate-200">{Math.round(planTotals.calories)}</span>{' '}
                        <span className="text-slate-500">kcal</span>
                      </div>
                      <div className="flex gap-2.5 font-bold text-slate-400">
                        <span>P: {Math.round(planTotals.protein)}g</span>
                        <span>C: {Math.round(planTotals.carbs)}g</span>
                        <span>F: {Math.round(planTotals.fat)}g</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        /* ----------------------------------------------------------------------
           2. MEAL PLAN BUILDER INTERFACE
           ---------------------------------------------------------------------- */
        <>
          <header className="px-4 py-3 bg-slate-900 border-b border-dark-border flex justify-between items-center shrink-0">
            <button
              onClick={() => {
                setIsBuilding(false);
                setPlanName('');
                setBuilderItems([]);
              }}
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm text-slate-100">Builder Wizard</span>
            <button
              onClick={handleSavePlan}
              disabled={!planName.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl transition cursor-pointer"
            >
              Save Plan
            </button>
          </header>

          <form onSubmit={handleSavePlan} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
            {/* Input Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plan Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Cutting Protocol High Carb"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                className="w-full bg-slate-900 border border-dark-border focus:border-emerald-500/80 rounded-xl px-3.5 py-3 text-xs text-slate-200 outline-none transition"
              />
            </div>

            {/* In-progress Nutrition Summary */}
            <div className="bg-slate-900 border border-dark-border/60 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Planned Target Totals</span>
              <div className="flex justify-between items-end border-b border-dark-border/20 pb-2">
                <span className="text-xs text-slate-400 font-medium">Planned Calories</span>
                <span className="text-base font-black text-emerald-400">{Math.round(builderTotals.calories)} kcal</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xxs font-bold text-slate-400 pt-1">
                <div>
                  <span className="text-blue-400 block text-[9px]">Protein</span>
                  <span className="text-slate-200 font-extrabold">{Math.round(builderTotals.protein)}g</span>
                </div>
                <div>
                  <span className="text-yellow-400 block text-[9px]">Carbs</span>
                  <span className="text-slate-200 font-extrabold">{Math.round(builderTotals.carbs)}g</span>
                </div>
                <div>
                  <span className="text-orange-400 block text-[9px]">Fat</span>
                  <span className="text-slate-200 font-extrabold">{Math.round(builderTotals.fat)}g</span>
                </div>
              </div>
            </div>

            {/* Builder Meal Slots */}
            <div className="space-y-3">
              {slots.map((slot) => {
                const slotItems = builderItems.filter((i) => i.meal_slot === slot);
                const slotCalories = slotItems.reduce((sum, item) => sum + item.calories, 0);

                return (
                  <div key={slot} className="bg-slate-900 border border-dark-border/40 rounded-xl p-3.5 space-y-3">
                    <div className="flex justify-between items-center border-b border-dark-border/20 pb-2">
                      <span className="text-xs font-black text-slate-200">{slot}</span>
                      <span className="text-[10px] font-bold text-slate-400">{Math.round(slotCalories)} kcal</span>
                    </div>

                    {slotItems.length > 0 ? (
                      <div className="space-y-2">
                        {slotItems.map((item) => (
                          <div
                            key={item.food_id}
                            className="flex justify-between items-center gap-2 py-1.5 border-b border-dark-border/10 last:border-b-0"
                          >
                            <div className="text-left min-w-0">
                              <p className="font-semibold text-xs text-slate-200 truncate">{item.food_name}</p>
                              <p className="text-[9px] text-slate-500">
                                {item.serving_quantity} serving ({Math.round(item.calories)} kcal)
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveBuilderItem(item.food_id)}
                              className="text-slate-500 hover:text-red-400 p-1 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic py-1 text-center">No foods planned yet</p>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveAddSlot(slot)}
                      className="w-full py-2 bg-slate-950 border border-dashed border-dark-border/45 hover:border-emerald-500/50 hover:bg-slate-900 rounded-xl text-[10px] text-slate-400 hover:text-slate-200 font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Planned Food</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </form>
        </>
      )}

      {/* ======================================================================
          BUILDER SEARCH OVERLAY INTERACTION
          ====================================================================== */}
      {activeAddSlot && (
        <SearchOverlay
          mealSlot={activeAddSlot}
          onClose={() => setActiveAddSlot(null)}
          onAddFood={handleAddFoodToBuilder}
        />
      )}

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
          className="flex flex-col items-center gap-1 text-emerald-400 font-bold cursor-pointer"
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
