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

export const getUserSessions = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const { data, error } = await supabase.from("sessions").select('*').eq('user_id', userId);

    if (error) throw error;

    console.log("data", data.length > 1);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    return res.status(500).json({ error: err.message });
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