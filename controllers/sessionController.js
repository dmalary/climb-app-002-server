import { supabase } from "../config/supabaseClient.js";

// GET all users
export const getAllSessions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;

    return res.status(200).json(data || []);
  } catch (err) {
    console.error("Error fetching sessions:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

export const getUserSessions = async (req, res) => {
  try {
    // Clerk user from middleware
    const { userId } = req.auth;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: No user ID found" });
    }

    // Optional: Supabase DB user added via syncUser middleware
    const supaUser = req.user; // if you add syncUser middleware earlier

    // Get data scoped to the logged in user
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("user_id", userId) // user_id must match Clerk userId
      .order("date", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Error fetching sessions" });
    }

    return res.status(200).json(data || []);
  } catch (err) {
    console.error("Error fetching sessions:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getSession = async (req, res) => {
  try {
    // 🔐 Clerk auth
    const { userId } = req.auth;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 🧭 Route param (THIS is the session ID you want)
    const { sessionId } = req.params;
    console.log('sessionId', sessionId)

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)   // 🔒 scope to owner
      .single();               // ✅ return one row

    if (error) {
      console.error("Supabase error:", error);
      return res.status(404).json({ error: "Session not found" });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching session:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


// app.get('/api/user/sessions/:id', (req, res) => {
//   const userId = parseInt(req.params.id);
//   const session = db.sessions.filter(u => u.userId === userId);

//   if (session) {
//     res.status(200).json(session);
//   } else {
//     res.status(404).json({ message: 'Sessions not found' });
//   }
// });