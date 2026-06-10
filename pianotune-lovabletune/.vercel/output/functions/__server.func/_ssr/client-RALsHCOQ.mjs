import { c as createClient } from "../_libs/supabase__supabase-js.mjs";
const SUPABASE_URL = "https://bamhecfjwevpczkewkze.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbWhlY2Zqd2V2cGN6a2V3a3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NDcyOTcsImV4cCI6MjA5NjMyMzI5N30.i4ovK0km8n8EGpWH03-pr-KaubXQWVhTmDy6ks-K9Pw";
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? localStorage : void 0,
    persistSession: true,
    autoRefreshToken: true
  }
});
export {
  supabase as s
};
