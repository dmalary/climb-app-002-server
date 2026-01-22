import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config()

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL or Service Role Key not set in environment variables");
}

if (!anonKey) {
  throw new Error("Missing PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseKey, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export function supabaseForUser(token) {
  if (!token) throw new Error("supabaseForUser: missing user token");

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}