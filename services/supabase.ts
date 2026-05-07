import { createClient } from '@supabase/supabase-js';

// Usando variáveis de ambiente para maior flexibilidade e segurança
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing in .env file!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);