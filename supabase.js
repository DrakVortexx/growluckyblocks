const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const hasSupabaseConfig = !!(supabaseUrl && supabaseServiceKey);

// Create Supabase client with service role key (bypasses RLS)
const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseServiceKey) : null;

module.exports = {
  supabase,
  hasSupabaseConfig,
  supabaseUrl
};
