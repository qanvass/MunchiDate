import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if credentials are fully configured
export const isDbMocked = !(supabaseUrl && supabaseAnonKey);

export const supabase = isDbMocked 
  ? null 
  : createClient(supabaseUrl, supabaseAnonKey);

// Log database operating parameters
if (isDbMocked) {
  console.warn("⚠️ Supabase credentials not found in environment. SpecialsApp is operating in robust local-mock database persistence mode!");
} else {
  console.log("⚡ Supabase database connection successfully initialized!");
}
