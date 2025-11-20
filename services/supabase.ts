import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials as provided by user request. 
// In a production environment, these should be environment variables (import.meta.env.VITE_SUPABASE_URL, etc.)
const supabaseUrl = 'https://nhvuwtmlftrdtpdolstg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5odnV3dG1sZnRyZHRwZG9sc3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNDYwNjksImV4cCI6MjA3ODkyMjA2OX0.R02jwfweyL6LD_ftB5m1DtnmH5TbUddqtXZxhLh8Ulg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);