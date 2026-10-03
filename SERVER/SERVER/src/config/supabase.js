const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
console.log("SUPABASE URL:", process.env.SUPABASE_URL);
console.log("SUPABASE KEY:", process.env.SUPABASE_KEY);

module.exports = supabase;
