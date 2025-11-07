import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config()

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Service Role Key not set in environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
