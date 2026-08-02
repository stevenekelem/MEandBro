import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get environment variables from Vite
const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Fallback to placeholder valid URL if env variables are missing on Vercel to prevent top-level crash
const supabaseUrl = (rawUrl && rawUrl.startsWith('http')) 
  ? rawUrl 
  : 'https://placeholder-project.supabase.co';

const supabaseAnonKey = rawKey || 'placeholder-anon-key';

// Initialize client safely
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Helper to check if Supabase is fully configured
export const isSupabaseConfigured = (): boolean => {
  return (
    rawUrl !== '' && 
    rawKey !== '' && 
    !rawUrl.includes('placeholder') && 
    !rawKey.includes('placeholder') &&
    rawUrl.startsWith('http')
  );
};
