import { supabaseForUser } from "../config/supabaseClient.js";

export const getFeed = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const token = req.auth?.token;

    if (!userId || !token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const supabase = supabaseForUser(token);

    const { data, error } = await supabase.rpc("get_feed_sessions", {
      p_user_id: userId,
      p_limit: Number(req.query.limit ?? 20),
      p_offset: Number(req.query.offset ?? 0),
    });

    if (error) {
      console.error("feed rpc error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json(data);
  } catch (e) {
    console.error("feed endpoint error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
