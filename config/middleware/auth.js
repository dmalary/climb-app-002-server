import { supabase } from "../supabaseClient.js";
import { clerkClient } from "@clerk/express";

export const syncUser = async (req, res, next) => {
  try {
    const { userId } = req.auth;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 🔑 Fetch full user from Clerk
    const clerkUser = await clerkClient.users.getUser(userId);

    const email =
      clerkUser.emailAddresses?.[0]?.emailAddress || null;

    const username =
      clerkUser.username ||
      clerkUser.firstName ||
      `user_${userId.slice(0, 6)}`;

    // ---------------------------------------
    // Check Supabase
    // ---------------------------------------
    const { data: existingUser, error: findErr } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (findErr) {
      console.error("Supabase find user error:", findErr);
      return res.status(500).json({ error: "Database error" });
    }

    // ---------------------------------------
    // Insert if missing
    // ---------------------------------------
    if (!existingUser) {
      const { data: newUser, error: insertErr } = await supabase
        .from("users")
        .insert({
          id: userId,       // Clerk user ID
          email,
          username,
          created_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (insertErr) {
        console.error("Supabase insert user error:", insertErr);
        return res.status(500).json({ error: "User creation failed" });
      }

      req.user = newUser;
    } else {
      // Keep Supabase in sync
      await supabase
        .from("users")
        .update({ email, username })
        .eq("id", userId);

      req.user = existingUser;
    }

    next();
  } catch (err) {
    console.error("syncUser error:", err);
    res.status(500).json({ error: "Auth sync failed" });
  }
};
