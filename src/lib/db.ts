import { supabase, isDemoMode } from './supabase';

export interface Profile {
  id: string;
  daily_calorie_target: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
  updated_at?: string;
}

export interface CustomFood {
  id: string;
  user_id: string | null;
  name: string;
  brand?: string;
  barcode?: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrients?: {
    sodium?: number;
    fiber?: number;
    potassium?: number;
    [key: string]: any;
  };
  created_at?: string;
}

export interface MealPlanItem {
  id: string;
  meal_plan_id: string;
  food_source: 'api' | 'custom';
  food_id: string;
  food_name: string;
  serving_quantity: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_slot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
}

export interface MealPlan {
  id: string;
  user_id: string | null;
  name: string;
  created_at?: string;
  items?: MealPlanItem[];
}

export interface DailyLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  meal_slot: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  food_name: string;
  serving_quantity: number;
  serving_unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  is_checked: boolean;
  created_at?: string;
}

const DEMO_USER_ID = 'demo-user-id-999';

const DEFAULT_TEST_FOODS: CustomFood[] = [
  { id: 'c1', user_id: null, name: '[TEST] Egg (Large)', brand: 'Seeded Farms', barcode: '0000000000001', calories: 70, protein: 6, carbs: 0.6, fat: 5, serving_size: 50, serving_unit: 'g', micronutrients: { sodium: 70, fiber: 0, potassium: 69 } },
  { id: 'c2', user_id: null, name: '[TEST] Grilled Chicken Breast', brand: 'Seeded Farms', barcode: '0000000000002', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving_size: 100, serving_unit: 'g', micronutrients: { sodium: 74, fiber: 0, potassium: 256 } },
  { id: 'c3', user_id: null, name: '[TEST] Brown Rice (Cooked)', brand: 'Seeded Farms', barcode: '0000000000003', calories: 111, protein: 2.6, carbs: 23, fat: 0.9, serving_size: 100, serving_unit: 'g', micronutrients: { sodium: 5, fiber: 1.8, potassium: 43 } },
  { id: 'c4', user_id: null, name: '[TEST] Whey Protein Powder', brand: 'Seeded Nutrition', barcode: '0000000000004', calories: 120, protein: 24, carbs: 3, fat: 1.5, serving_size: 30, serving_unit: 'g', micronutrients: { sodium: 150, fiber: 0, potassium: 160 } },
  { id: 'c5', user_id: null, name: '[TEST] Peanut Butter (Creamy)', brand: 'Seeded Farms', barcode: '0000000000005', calories: 188, protein: 8, carbs: 6, fat: 16, serving_size: 32, serving_unit: 'g', micronutrients: { sodium: 140, fiber: 1.9, potassium: 189 } },
  { id: 'c6', user_id: null, name: '[TEST] Rolled Oats', brand: 'Seeded Farms', barcode: '0000000000006', calories: 150, protein: 5, carbs: 27, fat: 2.5, serving_size: 40, serving_unit: 'g', micronutrients: { sodium: 0, fiber: 4, potassium: 150 } },
  { id: 'c7', user_id: null, name: '[TEST] Banana (Medium)', brand: 'Fresh Fruit', barcode: '0000000000007', calories: 105, protein: 1.3, carbs: 27, fat: 0.3, serving_size: 118, serving_unit: 'g', micronutrients: { sodium: 1, fiber: 3.1, potassium: 422 } },
];

const DEFAULT_TEST_MEAL_PLANS: MealPlan[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    user_id: null,
    name: '[TEST] High Protein Day',
    items: [
      { id: 'mpi1', meal_plan_id: 'd0000000-0000-0000-0000-000000000001', food_source: 'custom', food_id: 'c6', food_name: '[TEST] Rolled Oats', serving_quantity: 1, serving_unit: '40g serving', calories: 150, protein: 5, carbs: 27, fat: 2.5, meal_slot: 'Breakfast' },
      { id: 'mpi2', meal_plan_id: 'd0000000-0000-0000-0000-000000000001', food_source: 'custom', food_id: 'c4', food_name: '[TEST] Whey Protein Powder', serving_quantity: 1, serving_unit: '30g scoop', calories: 120, protein: 24, carbs: 3, fat: 1.5, meal_slot: 'Breakfast' },
      { id: 'mpi3', meal_plan_id: 'd0000000-0000-0000-0000-000000000001', food_source: 'custom', food_id: 'c7', food_name: '[TEST] Banana (Medium)', serving_quantity: 1, serving_unit: '118g piece', calories: 105, protein: 1.3, carbs: 27, fat: 0.3, meal_slot: 'Breakfast' },
      { id: 'mpi4', meal_plan_id: 'd0000000-0000-0000-0000-000000000001', food_source: 'custom', food_id: 'c2', food_name: '[TEST] Grilled Chicken Breast', serving_quantity: 1.5, serving_unit: '150g serving', calories: 247.5, protein: 46.5, carbs: 0, fat: 5.4, meal_slot: 'Lunch' },
      { id: 'mpi5', meal_plan_id: 'd0000000-0000-0000-0000-000000000001', food_source: 'custom', food_id: 'c3', food_name: '[TEST] Brown Rice (Cooked)', serving_quantity: 1.5, serving_unit: '150g serving', calories: 166.5, protein: 3.9, carbs: 34.5, fat: 1.35, meal_slot: 'Lunch' },
      { id: 'mpi6', meal_plan_id: 'd0000000-0000-0000-0000-000000000001', food_source: 'custom', food_id: 'c5', food_name: '[TEST] Peanut Butter (Creamy)', serving_quantity: 1, serving_unit: '32g serving', calories: 188, protein: 8, carbs: 6, fat: 16, meal_slot: 'Snack' },
      { id: 'mpi7', meal_plan_id: 'd0000000-0000-0000-0000-000000000001', food_source: 'custom', food_id: 'c2', food_name: '[TEST] Grilled Chicken Breast', serving_quantity: 1, serving_unit: '100g serving', calories: 165, protein: 31, carbs: 0, fat: 3.6, meal_slot: 'Dinner' },
      { id: 'mpi8', meal_plan_id: 'd0000000-0000-0000-0000-000000000001', food_source: 'custom', food_id: 'c1', food_name: '[TEST] Egg (Large)', serving_quantity: 2, serving_unit: '50g piece', calories: 140, protein: 12, carbs: 1.2, fat: 10, meal_slot: 'Dinner' }
    ]
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    user_id: null,
    name: '[TEST] Low Carb Diet',
    items: [
      { id: 'mpi9', meal_plan_id: 'd0000000-0000-0000-0000-000000000002', food_source: 'custom', food_id: 'c1', food_name: '[TEST] Egg (Large)', serving_quantity: 3, serving_unit: '50g piece', calories: 210, protein: 18, carbs: 1.8, fat: 15, meal_slot: 'Breakfast' },
      { id: 'mpi10', meal_plan_id: 'd0000000-0000-0000-0000-000000000002', food_source: 'custom', food_id: 'c2', food_name: '[TEST] Grilled Chicken Breast', serving_quantity: 2, serving_unit: '200g serving', calories: 330, protein: 62, carbs: 0, fat: 7.2, meal_slot: 'Lunch' },
      { id: 'mpi11', meal_plan_id: 'd0000000-0000-0000-0000-000000000002', food_source: 'custom', food_id: 'c5', food_name: '[TEST] Peanut Butter (Creamy)', serving_quantity: 1.5, serving_unit: '48g serving', calories: 282, protein: 12, carbs: 9, fat: 24, meal_slot: 'Snack' },
      { id: 'mpi12', meal_plan_id: 'd0000000-0000-0000-0000-000000000002', food_source: 'custom', food_id: 'c2', food_name: '[TEST] Grilled Chicken Breast', serving_quantity: 1.5, serving_unit: '150g serving', calories: 247.5, protein: 46.5, carbs: 0, fat: 5.4, meal_slot: 'Dinner' },
      { id: 'mpi13', meal_plan_id: 'd0000000-0000-0000-0000-000000000002', food_source: 'custom', food_id: 'c1', food_name: '[TEST] Egg (Large)', serving_quantity: 1, serving_unit: '50g piece', calories: 70, protein: 6, carbs: 0.6, fat: 5, meal_slot: 'Dinner' }
    ]
  }
];

// Helper to check/initialize browser storage
function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

// Data service layer
export const db = {
  async getUserId(): Promise<string | null> {
    if (isDemoMode) return DEMO_USER_ID;
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  },

  // --------------------------------------------------------------------------
  // PROFILE SERVICE
  // --------------------------------------------------------------------------
  async getProfile(): Promise<Profile | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    if (isDemoMode) {
      const profiles = getStorageItem<Profile[]>('demo_profiles', []);
      let profile = profiles.find((p) => p.id === userId);
      if (!profile) {
        profile = {
          id: userId,
          daily_calorie_target: 2000,
          protein_target: 150,
          carbs_target: 200,
          fat_target: 65,
        };
        profiles.push(profile);
        setStorageItem('demo_profiles', profiles);
      }
      return profile;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // If profile not found, try to create it (fallback if trigger lagged)
      const newProfile = {
        id: userId,
        daily_calorie_target: 2000,
        protein_target: 150,
        carbs_target: 200,
        fat_target: 65,
      };
      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select('*')
        .single();

      if (insertError) {
        console.error('Error inserting profile:', insertError);
        return newProfile;
      }
      return inserted;
    } else if (error) {
      console.error('Error getting profile:', error);
      return null;
    }
    return data;
  },

  async updateProfile(updates: Partial<Omit<Profile, 'id'>>): Promise<Profile | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    if (isDemoMode) {
      const profiles = getStorageItem<Profile[]>('demo_profiles', []);
      const index = profiles.findIndex((p) => p.id === userId);
      let profile: Profile;
      if (index === -1) {
        profile = {
          id: userId,
          daily_calorie_target: updates.daily_calorie_target ?? 2000,
          protein_target: updates.protein_target ?? 150,
          carbs_target: updates.carbs_target ?? 200,
          fat_target: updates.fat_target ?? 65,
        };
        profiles.push(profile);
      } else {
        profile = { ...profiles[index], ...updates };
        profiles[index] = profile;
      }
      setStorageItem('demo_profiles', profiles);
      return profile;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return null;
    }
    return data;
  },

  // --------------------------------------------------------------------------
  // DAILY LOG SERVICE
  // --------------------------------------------------------------------------
  async getDailyLogs(date: string): Promise<DailyLog[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    if (isDemoMode) {
      const logs = getStorageItem<DailyLog[]>('demo_daily_logs', []);
      return logs.filter((log) => log.user_id === userId && log.date === date);
    }

    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting daily logs:', error);
      return [];
    }
    return data || [];
  },

  async addDailyLog(log: Omit<DailyLog, 'id' | 'user_id' | 'is_checked'>): Promise<DailyLog | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    const newLog = {
      ...log,
      user_id: userId,
      is_checked: false,
    };

    if (isDemoMode) {
      const logs = getStorageItem<DailyLog[]>('demo_daily_logs', []);
      const createdLog: DailyLog = {
        ...newLog,
        id: Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
      };
      logs.push(createdLog);
      setStorageItem('demo_daily_logs', logs);
      return createdLog;
    }

    const { data, error } = await supabase
      .from('daily_logs')
      .insert(newLog)
      .select('*')
      .single();

    if (error) {
      console.error('Error adding daily log:', error);
      return null;
    }
    return data;
  },

  async updateDailyLog(id: string, updates: Partial<Omit<DailyLog, 'id' | 'user_id'>>): Promise<DailyLog | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    if (isDemoMode) {
      const logs = getStorageItem<DailyLog[]>('demo_daily_logs', []);
      const index = logs.findIndex((log) => log.id === id && log.user_id === userId);
      if (index === -1) return null;

      const updated = { ...logs[index], ...updates };
      logs[index] = updated;
      setStorageItem('demo_daily_logs', logs);
      return updated;
    }

    const { data, error } = await supabase
      .from('daily_logs')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating daily log:', error);
      return null;
    }
    return data;
  },

  async deleteDailyLog(id: string): Promise<boolean> {
    const userId = await this.getUserId();
    if (!userId) return false;

    if (isDemoMode) {
      const logs = getStorageItem<DailyLog[]>('demo_daily_logs', []);
      const filtered = logs.filter((log) => !(log.id === id && log.user_id === userId));
      setStorageItem('demo_daily_logs', filtered);
      return true;
    }

    const { error } = await supabase
      .from('daily_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting daily log:', error);
      return false;
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // CUSTOM FOODS SERVICE
  // --------------------------------------------------------------------------
  async getCustomFoods(): Promise<CustomFood[]> {
    const userId = await this.getUserId();
    
    if (isDemoMode) {
      const custom = getStorageItem<CustomFood[]>('demo_custom_foods', DEFAULT_TEST_FOODS);
      // Returns global seeded foods (user_id is null) OR custom foods belonging to the user
      return custom.filter((f) => f.user_id === userId || f.user_id === null);
    }

    const { data, error } = await supabase
      .from('custom_foods')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting custom foods:', error);
      return [];
    }
    return data || [];
  },

  async addCustomFood(food: Omit<CustomFood, 'id' | 'user_id'>): Promise<CustomFood | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    const newFood = {
      ...food,
      user_id: userId,
    };

    if (isDemoMode) {
      const foods = getStorageItem<CustomFood[]>('demo_custom_foods', DEFAULT_TEST_FOODS);
      const createdFood: CustomFood = {
        ...newFood,
        id: Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
      };
      foods.unshift(createdFood);
      setStorageItem('demo_custom_foods', foods);
      return createdFood;
    }

    const { data, error } = await supabase
      .from('custom_foods')
      .insert(newFood)
      .select('*')
      .single();

    if (error) {
      console.error('Error adding custom food:', error);
      return null;
    }
    return data;
  },

  // --------------------------------------------------------------------------
  // MEAL PLAN SERVICE
  // --------------------------------------------------------------------------
  async getMealPlans(): Promise<MealPlan[]> {
    const userId = await this.getUserId();

    if (isDemoMode) {
      const plans = getStorageItem<MealPlan[]>('demo_meal_plans', DEFAULT_TEST_MEAL_PLANS);
      return plans.filter((p) => p.user_id === userId || p.user_id === null);
    }

    // Fetch meal plans and their inner items
    const { data: plans, error: planError } = await supabase
      .from('meal_plans')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`);

    if (planError) {
      console.error('Error getting meal plans:', planError);
      return [];
    }

    if (!plans || plans.length === 0) return [];

    const planIds = plans.map((p) => p.id);
    const { data: items, error: itemError } = await supabase
      .from('meal_plan_items')
      .select('*')
      .in('meal_plan_id', planIds);

    if (itemError) {
      console.error('Error getting meal plan items:', itemError);
      return plans.map((p) => ({ ...p, items: [] }));
    }

    return plans.map((plan) => ({
      ...plan,
      items: (items || []).filter((item) => item.meal_plan_id === plan.id),
    }));
  },

  async addMealPlan(name: string, items: Omit<MealPlanItem, 'id' | 'meal_plan_id'>[]): Promise<MealPlan | null> {
    const userId = await this.getUserId();
    if (!userId) return null;

    if (isDemoMode) {
      const plans = getStorageItem<MealPlan[]>('demo_meal_plans', DEFAULT_TEST_MEAL_PLANS);
      const planId = Math.random().toString(36).substring(2, 9);
      
      const newItems: MealPlanItem[] = items.map((item, idx) => ({
        ...item,
        id: `mpi-new-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        meal_plan_id: planId,
      }));

      const newPlan: MealPlan = {
        id: planId,
        user_id: userId,
        name,
        created_at: new Date().toISOString(),
        items: newItems,
      };

      plans.push(newPlan);
      setStorageItem('demo_meal_plans', plans);
      return newPlan;
    }

    // Supabase transactions/series writes
    const { data: plan, error: planError } = await supabase
      .from('meal_plans')
      .insert({ name, user_id: userId })
      .select('*')
      .single();

    if (planError || !plan) {
      console.error('Error adding meal plan:', planError);
      return null;
    }

    const itemsToInsert = items.map((item) => ({
      ...item,
      meal_plan_id: plan.id,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from('meal_plan_items')
      .insert(itemsToInsert)
      .select('*');

    if (itemsError) {
      console.error('Error adding meal plan items:', itemsError);
      // Clean up orphaned plan
      await supabase.from('meal_plans').delete().eq('id', plan.id);
      return null;
    }

    return {
      ...plan,
      items: insertedItems || [],
    };
  },

  async deleteMealPlan(id: string): Promise<boolean> {
    const userId = await this.getUserId();
    if (!userId) return false;

    if (isDemoMode) {
      const plans = getStorageItem<MealPlan[]>('demo_meal_plans', DEFAULT_TEST_MEAL_PLANS);
      const filtered = plans.filter((p) => !(p.id === id && (p.user_id === userId || p.user_id === null)));
      setStorageItem('demo_meal_plans', filtered);
      return true;
    }

    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting meal plan:', error);
      return false;
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // APPLY MEAL PLAN TO TODAY SERVICE
  // --------------------------------------------------------------------------
  async applyMealPlan(planId: string, date: string): Promise<DailyLog[]> {
    const userId = await this.getUserId();
    if (!userId) return [];

    let itemsToClone: MealPlanItem[] = [];

    if (isDemoMode) {
      const plans = getStorageItem<MealPlan[]>('demo_meal_plans', DEFAULT_TEST_MEAL_PLANS);
      const plan = plans.find((p) => p.id === planId);
      if (plan && plan.items) {
        itemsToClone = plan.items;
      }
    } else {
      const { data, error } = await supabase
        .from('meal_plan_items')
        .select('*')
        .eq('meal_plan_id', planId);

      if (error) {
        console.error('Error getting meal plan items to clone:', error);
        return [];
      }
      itemsToClone = data || [];
    }

    if (itemsToClone.length === 0) return [];

    const logsToInsert = itemsToClone.map((item) => ({
      user_id: userId,
      date,
      meal_slot: item.meal_slot,
      food_name: item.food_name,
      serving_quantity: item.serving_quantity,
      serving_unit: item.serving_unit,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      is_checked: false,
    }));

    if (isDemoMode) {
      const logs = getStorageItem<DailyLog[]>('demo_daily_logs', []);
      const inserted: DailyLog[] = logsToInsert.map((log) => ({
        ...log,
        id: Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
      }));
      logs.push(...inserted);
      setStorageItem('demo_daily_logs', logs);
      return inserted;
    }

    const { data: inserted, error: insertError } = await supabase
      .from('daily_logs')
      .insert(logsToInsert)
      .select('*');

    if (insertError) {
      console.error('Error cloning meal plan items to daily logs:', insertError);
      return [];
    }

    return inserted || [];
  }
};
