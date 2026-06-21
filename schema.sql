-- ============================================================================
-- SQL SCHEMA: Mobile-First Food Tracking & Meal Planning Web App
-- ============================================================================

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    daily_calorie_target INTEGER NOT NULL DEFAULT 2000,
    protein_target INTEGER NOT NULL DEFAULT 150,
    carbs_target INTEGER NOT NULL DEFAULT 200,
    fat_target INTEGER NOT NULL DEFAULT 65
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile" 
    ON public.profiles FOR SELECT 
    TO authenticated 
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
    ON public.profiles FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = id);

-- Trigger: Automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, daily_calorie_target, protein_target, carbs_target, fat_target)
  VALUES (new.id, 2000, 150, 200, 65)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Custom Foods Table
CREATE TABLE IF NOT EXISTS public.custom_foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL allowed for global [TEST] seeded foods
    name TEXT NOT NULL,
    brand TEXT,
    barcode TEXT,
    serving_size NUMERIC NOT NULL,
    serving_unit TEXT NOT NULL,
    calories NUMERIC NOT NULL,
    protein NUMERIC NOT NULL,
    carbs NUMERIC NOT NULL,
    fat NUMERIC NOT NULL,
    micronutrients JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for custom_foods
ALTER TABLE public.custom_foods ENABLE ROW LEVEL SECURITY;

-- Custom Foods Policies
CREATE POLICY "Users can view their own custom foods or test global foods" 
    ON public.custom_foods FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own custom foods" 
    ON public.custom_foods FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom foods" 
    ON public.custom_foods FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom foods" 
    ON public.custom_foods FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);


-- 3. Meal Plans Table
CREATE TABLE IF NOT EXISTS public.meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL allowed for global [TEST] seeded meal plans
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for meal_plans
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- Meal Plans Policies
CREATE POLICY "Users can view their own or global test meal plans" 
    ON public.meal_plans FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own meal plans" 
    ON public.meal_plans FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plans" 
    ON public.meal_plans FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal plans" 
    ON public.meal_plans FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);


-- 4. Meal Plan Items Table
CREATE TABLE IF NOT EXISTS public.meal_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
    food_source TEXT NOT NULL, -- 'api' or 'custom'
    food_id TEXT NOT NULL, -- external ID or custom food UUID
    food_name TEXT NOT NULL,
    serving_quantity NUMERIC NOT NULL,
    serving_unit TEXT NOT NULL,
    calories NUMERIC NOT NULL,
    protein NUMERIC NOT NULL,
    carbs NUMERIC NOT NULL,
    fat NUMERIC NOT NULL,
    meal_slot TEXT NOT NULL, -- 'Breakfast', 'Lunch', 'Dinner', 'Snack'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for meal_plan_items
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;

-- Meal Plan Items Policies
CREATE POLICY "Users can view items in meal plans they have access to" 
    ON public.meal_plan_items FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.meal_plans 
            WHERE meal_plans.id = meal_plan_items.meal_plan_id
        )
    );

CREATE POLICY "Users can insert items in their own meal plans" 
    ON public.meal_plan_items FOR INSERT 
    TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.meal_plans 
            WHERE meal_plans.id = meal_plan_items.meal_plan_id 
              AND meal_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update items in their own meal plans" 
    ON public.meal_plan_items FOR UPDATE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.meal_plans 
            WHERE meal_plans.id = meal_plan_items.meal_plan_id 
              AND meal_plans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete items from their own meal plans" 
    ON public.meal_plan_items FOR DELETE 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.meal_plans 
            WHERE meal_plans.id = meal_plan_items.meal_plan_id 
              AND meal_plans.user_id = auth.uid()
        )
    );


-- 5. Daily Logs Table
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    meal_slot TEXT NOT NULL, -- 'Breakfast', 'Lunch', 'Dinner', 'Snack'
    food_name TEXT NOT NULL,
    serving_quantity NUMERIC NOT NULL,
    serving_unit TEXT NOT NULL,
    calories NUMERIC NOT NULL,
    protein NUMERIC NOT NULL,
    carbs NUMERIC NOT NULL,
    fat NUMERIC NOT NULL,
    is_checked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for daily_logs
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Daily Logs Policies
CREATE POLICY "Users can view their own daily logs" 
    ON public.daily_logs FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily logs" 
    ON public.daily_logs FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily logs" 
    ON public.daily_logs FOR UPDATE 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily logs" 
    ON public.daily_logs FOR DELETE 
    TO authenticated 
    USING (auth.uid() = user_id);


-- ============================================================================
-- SEED DATA FOR TESTING (Global foods and plans with user_id = NULL)
-- ============================================================================

-- Seed Custom Foods
INSERT INTO public.custom_foods 
    (id, user_id, name, brand, barcode, serving_size, serving_unit, calories, protein, carbs, fat, micronutrients)
VALUES
    ('c0000000-0000-0000-0000-000000000001', NULL, '[TEST] Egg (Large)', 'Seeded Farms', '0000000000001', 50, 'g', 70, 6, 0.6, 5, '{"sodium": 70, "fiber": 0, "potassium": 69}'),
    ('c0000000-0000-0000-0000-000000000002', NULL, '[TEST] Grilled Chicken Breast', 'Seeded Farms', '0000000000002', 100, 'g', 165, 31, 0, 3.6, '{"sodium": 74, "fiber": 0, "potassium": 256}'),
    ('c0000000-0000-0000-0000-000000000003', NULL, '[TEST] Brown Rice (Cooked)', 'Seeded Farms', '0000000000003', 100, 'g', 111, 2.6, 23, 0.9, '{"sodium": 5, "fiber": 1.8, "potassium": 43}'),
    ('c0000000-0000-0000-0000-000000000004', NULL, '[TEST] Whey Protein Powder', 'Seeded Nutrition', '0000000000004', 30, 'g', 120, 24, 3, 1.5, '{"sodium": 150, "fiber": 0, "potassium": 160}'),
    ('c0000000-0000-0000-0000-000000000005', NULL, '[TEST] Peanut Butter (Creamy)', 'Seeded Farms', '0000000000005', 32, 'g', 188, 8, 6, 16, '{"sodium": 140, "fiber": 1.9, "potassium": 189}'),
    ('c0000000-0000-0000-0000-000000000006', NULL, '[TEST] Rolled Oats', 'Seeded Farms', '0000000000006', 40, 'g', 150, 5, 27, 2.5, '{"sodium": 0, "fiber": 4, "potassium": 150}'),
    ('c0000000-0000-0000-0000-000000000007', NULL, '[TEST] Banana (Medium)', 'Fresh Fruit', '0000000000007', 118, 'g', 105, 1.3, 27, 0.3, '{"sodium": 1, "fiber": 3.1, "potassium": 422}')
ON CONFLICT (id) DO NOTHING;

-- Seed Meal Plans
INSERT INTO public.meal_plans (id, user_id, name)
VALUES 
    ('d0000000-0000-0000-0000-000000000001', NULL, '[TEST] High Protein Day'),
    ('d0000000-0000-0000-0000-000000000002', NULL, '[TEST] Low Carb Diet')
ON CONFLICT (id) DO NOTHING;

-- Seed Meal Plan Items for [TEST] High Protein Day
INSERT INTO public.meal_plan_items
    (id, meal_plan_id, food_source, food_id, food_name, serving_quantity, serving_unit, calories, protein, carbs, fat, meal_slot)
VALUES
    -- Breakfast
    (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000001', 'custom', 'c0000000-0000-0000-0000-000000000006', '[TEST] Rolled Oats', 1, '40g serving', 150, 5, 27, 2.5, 'Breakfast'),
    (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000001', 'custom', 'c0000000-0000-0000-0000-000000000004', '[TEST] Whey Protein Powder', 1, '30g scoop', 120, 24, 3, 1.5, 'Breakfast'),
    (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000001', 'custom', 'c0000000-0000-0000-0000-000000000007', '[TEST] Banana (Medium)', 1, '118g piece', 105, 1.3, 27, 0.3, 'Breakfast'),
    -- Lunch
    (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000001', 'custom', 'c0000000-0000-0000-0000-000000000002', '[TEST] Grilled Chicken Breast', 1.5, '150g serving', 247.5, 46.5, 0, 5.4, 'Lunch'),
    (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000001', 'custom', 'c0000000-0000-0000-0000-000000000003', '[TEST] Brown Rice (Cooked)', 1.5, '150g serving', 166.5, 3.9, 34.5, 1.35, 'Lunch'),
    -- Snack
    (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000001', 'custom', 'c0000000-0000-0000-0000-000000000005', '[TEST] Peanut Butter (Creamy)', 1, '32g serving', 188, 8, 6, 16, 'Snack'),
    -- Dinner
    (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000001', 'custom', 'c0000000-0000-0000-0000-000000000002', '[TEST] Grilled Chicken Breast', 1, '100g serving', 165, 31, 0, 3.6, 'Dinner'),
    (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000001', 'custom', 'c0000000-0000-0000-0000-000000000001', '[TEST] Egg (Large)', 2, '50g piece', 140, 12, 1.2, 10, 'Dinner')
ON CONFLICT (id) DO NOTHING;

-- Seed Meal Plan Items for [TEST] Low Carb Diet
INSERT INTO public.meal_plan_items
    (id, meal_plan_id, food_source, food_id, food_name, serving_quantity, serving_unit, calories, protein, carbs, fat, meal_slot)
VALUES
    -- Breakfast
    (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000002', 'custom', 'c0000000-0000-0000-0000-000000000001', '[TEST] Egg (Large)', 3, '50g piece', 210, 18, 1.8, 15, 'Breakfast'),
    -- Lunch
    (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000002', 'custom', 'c0000000-0000-0000-0000-000000000002', '[TEST] Grilled Chicken Breast', 2, '200g serving', 330, 62, 0, 7.2, 'Lunch'),
    -- Snack
    (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000002', 'custom', 'c0000000-0000-0000-0000-000000000005', '[TEST] Peanut Butter (Creamy)', 1.5, '48g serving', 282, 12, 9, 24, 'Snack'),
    -- Dinner
    (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000002', 'custom', 'c0000000-0000-0000-0000-000000000002', '[TEST] Grilled Chicken Breast', 1.5, '150g serving', 247.5, 46.5, 0, 5.4, 'Dinner'),
    (gen_random_uuid(), 'd0000000-0000-0000-0000-000000000002', 'custom', 'c0000000-0000-0000-0000-000000000001', '[TEST] Egg (Large)', 1, '50g piece', 70, 6, 0.6, 5, 'Dinner')
ON CONFLICT (id) DO NOTHING;
