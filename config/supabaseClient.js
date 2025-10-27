import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config()

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
// const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabase = createClient(supabaseUrl, supabaseKey, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// export const createClerkSupabaseClient = function(clerkSupaSession) {
//   createClient(
//     supabaseUrl, supabaseKey,
//     {
//       async accessToken() {
//         return clerkSupaSession?.getToken() ?? null
//       }
//     }
//   );
// };