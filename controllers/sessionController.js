import { supabase } from "../config/supabaseClient.js";

// GET all users
export const getAllSessions = async (req, res) => {
  try {
    const { data, error } = await supabase.from("sessions").select("*");

    if (error) throw error;

    console.log("data", data.length > 1);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// export const getUserSessions = async (req, res) => {
//   const { userId } = req.params;

//   try {
//     if (!userId) {
//       return res.status(400).json({ error: "Missing userId" });
//     }

//     const { data, error } = await supabase.from("sessions").select('*').eq('user_id', userId);

//     if (error) throw error;

//     console.log("data", data.length > 1);
//     return res.status(200).json(data);
//   } catch (err) {
//     console.error("Error fetching users:", err.message);
//     return res.status(500).json({ error: err.message });
//   }
// };
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

// app.get('/api/user/sessions/:id', (req, res) => {
//   const userId = parseInt(req.params.id);
//   const session = db.sessions.filter(u => u.userId === userId);

//   if (session) {
//     res.status(200).json(session);
//   } else {
//     res.status(404).json({ message: 'Sessions not found' });
//   }
// });