import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config()

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);