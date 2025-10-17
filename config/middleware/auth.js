import { clerkMiddleware, requireAuth } from '@clerk/express';
import { supabase } from "../supabaseClient.js";

export const syncUser = async (req, res, next) => {
  try {
    const { userId, sessionId } = req.auth;

    if (!userId) {
      return res.status (401).json({ error: "Unauthorized, no user id found" });
    }

    // check supabase for user
    let { data: existingUser, error: findErr } = await supabase
      .from("users")
      .select("*")
      .eq("clerk_id", userId)
      .single();


    if (findErr && findErr.code !== "PGRST116") {
      console.error("Supabase find user error:", findErr);
      return res.status(500).json({ error: "Internal error" });
    }

    if (!existingUser) {
      const { data: newUser, error: insertErr } = await supabase
        .from("users")
        .insert({ clerk_id: userId })
        .select("*")
        .single();

      if (insertErr) {
        console.error("Supabase insert user error:", insertErr);
        return res.status(500).json({ error: "Could not create user" });
      }
      existingUser = newUser;
    }

    req.user = existingUser;
    next();
  } catch (err) {
    console.log('syncUser error:', err);
    res.status(500).json({error: 'internal error' })
  }
}