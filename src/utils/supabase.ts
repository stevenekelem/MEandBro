import { createClient } from '@supabase/supabase-js';

// Get environment variables from Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Initialize client if credentials are provided
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to check if Supabase is fully configured
export const isSupabaseConfigured = (): boolean => {
  return (
    supabaseUrl !== '' && 
    supabaseAnonKey !== '' && 
    !supabaseUrl.includes('placeholder') && 
    !supabaseAnonKey.includes('placeholder')
  );
};
