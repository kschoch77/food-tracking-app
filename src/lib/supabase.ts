import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Detect if we are using placeholders or missing values
const isConfigured = 
  supabaseUrl && 
  !supabaseUrl.includes('your-project-id') && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'your-anon-key';

export const isDemoMode = !isConfigured;

// Provide mock client endpoints if not configured, preventing initialization errors
const finalUrl = isConfigured ? supabaseUrl : 'https://placeholder-demo-project-id.supabase.co';
const finalKey = isConfigured ? supabaseAnonKey : 'placeholder-demo-anon-key-123456';

export const supabase = createClient(finalUrl, finalKey);
