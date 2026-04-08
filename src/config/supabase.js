import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const errorMessage = 'Error: Supabase environment variables are not set. ' +
    'Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file ' +
    'or your deployment environment variables.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
