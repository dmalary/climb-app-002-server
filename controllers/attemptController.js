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

export const getSessionAttempts = async (req, res) => {
  const { sessionId } = req.params;

  try {
    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const { data, error } = await supabase
      .from("attempts")
      .select("*")
      .eq("session_id", sessionId)
      .order("date", { ascending: false });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching attempts:", err.message);
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

export const getUserAttempts = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    // 1️⃣ Fetch all sessions for this user
    const { data: sessions, error: sessionError } = await supabase
      .from("sessions")
      .select("id")
      .eq("user_id", userId);

    if (sessionError) throw sessionError;

    if (!sessions || sessions.length === 0) {
      return res.status(200).json([]);
    }

    const sessionIds = sessions.map(s => s.id);

    // 2️⃣ Fetch attempts for these sessions
    const { data: attempts, error: attemptsError } = await supabase
      .from("attempts")
      .select("*")
      .in("session_id", sessionIds)
      .order("date", { ascending: false });

    if (attemptsError) throw attemptsError;

    return res.status(200).json(attempts);
  } catch (err) {
    console.error("Error fetching attempts:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
