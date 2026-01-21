import { supabase } from "../supabaseClient.js";
import { clerkClient } from "@clerk/express";

export const ensureUser = async (req, res, next) => {
  try {
    const { userId } = req.auth || {};
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const clerkUser = await clerkClient.users.getUser(userId);

    const email = clerkUser.emailAddresses?.[0]?.emailAddress || null;
    const username =
      clerkUser.username ||
      clerkUser.firstName ||
      `user_${userId.slice(0, 6)}`;

    // Find
    const { data: existingUser, error: findErr } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (findErr) {
      console.error("Supabase find user error:", findErr);
      return res.status(500).json({ error: "Database error" });
    }

    // Insert or update
    if (!existingUser) {
      const { data: newUser, error: insertErr } = await supabase
        .from("users")
        .insert({
          id: userId,
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
      return next();
    }

    await supabase
      .from("users")
      .update({ email, username })
      .eq("id", userId);

    req.user = existingUser;
    next();
  } catch (err) {
    console.error("ensureUser error:", err);
    res.status(500).json({ error: "Auth sync failed" });
  }
};









// import { supabase } from "../supabaseClient.js";
// import { clerkClient } from "@clerk/express";
// import axios from "axios";
// import { buildAndUploadClimbImages } from "../../services/buildClimbImages.js";

// export const ensureUser = async (req, res, next) => {
//   try {
//     const { userId } = req.auth;

//     if (!userId) {
//       return res.status(401).json({ error: "Unauthorized" });
//     }

//     // 🔑 Fetch full user from Clerk
//     const clerkUser = await clerkClient.users.getUser(userId);

//     const email =
//       clerkUser.emailAddresses?.[0]?.emailAddress || null;

//     const username =
//       clerkUser.username ||
//       clerkUser.firstName ||
//       `user_${userId.slice(0, 6)}`;

//     // ---------------------------------------
//     // Check Supabase
//     // ---------------------------------------
//     const { data: existingUser, error: findErr } = await supabase
//       .from("users")
//       .select("*")
//       .eq("id", userId)
//       .maybeSingle();

//     if (findErr) {
//       console.error("Supabase find user error:", findErr);
//       return res.status(500).json({ error: "Database error" });
//     }

//     // ---------------------------------------
//     // Insert if missing
//     // ---------------------------------------
//     let userRecord;
//     if (!existingUser) {
//       const { data: newUser, error: insertErr } = await supabase
//         .from("users")
//         .insert({
//           id: userId,       // Clerk user ID
//           email,
//           username,
//           created_at: new Date().toISOString(),
//         })
//         .select("*")
//         .single();

//       if (insertErr) {
//         console.error("Supabase insert user error:", insertErr);
//         return res.status(500).json({ error: "User creation failed" });
//       }

//       // req.user = newUser;
//       userRecord = newUser;
//     } else {
//       // Keep Supabase in sync
//       await supabase
//         .from("users")
//         .update({ email, username })
//         .eq("id", userId);

//       // req.user = existingUser;
//       userRecord = existingUser;
//     }

//     req.user = userRecord;

//     // ---------------------------------------
//     // Trigger public board fetch (every login)
//     // ---------------------------------------
//     const boardsToSync = ["kilter", "decoy", "tension"]; // change this to board present in database
//     for (const board of boardsToSync) {
//       try {
//         // 1️⃣ Sync public climbs via FastAPI
//         const pyRes = await axios.post(`${process.env.PY_LIB_URL}/sync-public-data`, { board });
//         const climbs = pyRes.data.climbs || [];
//         console.log(`✅ Public board ${board} synced: ${climbs.length} climbs`);

//         // 2️⃣ Build & upload images for these climbs
//         if (climbs.length) {
//           await buildAndUploadClimbImages(board, climbs);
//         }
//       } catch (err) {
//         console.error(`❌ Failed to sync/build images for board ${board}:`, err.message);
//       }
//     }

//     next();
//   } catch (err) {
//     console.error("ensureUser error:", err);
//     res.status(500).json({ error: "Auth sync failed" });
//   }
// };
