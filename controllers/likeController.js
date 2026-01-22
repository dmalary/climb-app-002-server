import { supabaseForUser } from "../config/supabaseClient.js";

function getAuth(req) {
  return typeof req.auth === "function" ? req.auth() : req.auth;
}

export const likeSession = async (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;
    const token = auth?.getToken ? await auth.getToken() : auth?.token;
    const sessionId = req.params.sessionId;

    if (!userId || !token) return res.status(401).json({ error: "Unauthorized" });
    if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

    const supabase = supabaseForUser(token);

    const { error } = await supabase
      .from("session_likes")
      .insert({ session_id: sessionId, user_id: userId });

    if (error) {
      // already liked
      if (error.code === "23505") return res.json({ ok: true, liked: true });
      console.error("likeSession error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true, liked: true });
  } catch (e) {
    console.error("likeSession exception:", e);
    return res.status(500).json({ error: "Server error" });
  }
};

export const unlikeSession = async (req, res) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.userId;
    const token = auth?.getToken ? await auth.getToken() : auth?.token;
    const sessionId = req.params.sessionId;

    if (!userId || !token) return res.status(401).json({ error: "Unauthorized" });
    if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

    const supabase = supabaseForUser(token);

    const { error } = await supabase
      .from("session_likes")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", userId);

    if (error) {
      console.error("unlikeSession error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true, liked: false });
  } catch (e) {
    console.error("unlikeSession exception:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
