import { supabase } from "../config/supabaseClient.js";

// GET all users
export const getAllAttempts = async (req, res) => {
  try {
    const { data, error } = await supabase.from("attempts").select("*");

    if (error) throw error;

    console.log("data", data.length > 1);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

export const getUserSessionAttempts = async (req, res) => {
  const { sessionId } = req.params;

  try {
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const { data, error } = await supabase.from("attempts").select('*').eq('session_id', sessionId);

    if (error) throw error;

    console.log("data", data.length > 1);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    return res.status(500).json({ error: err.message });
  }
};