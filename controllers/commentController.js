import { supabaseForUser } from "../config/supabaseClient.js";

const MAX_COMMENT_LEN = 500;

export const listSessionComments = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const token = req.auth?.token;
    const sessionId = req.params.sessionId;
    const limit = Math.min(Number(req.query.limit ?? 50), 100);
    const offset = Number(req.query.offset ?? 0);

    if (!userId || !token) return res.status(401).json({ error: "Unauthorized" });
    if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

    const supabase = supabaseForUser(token);

    // If you want usernames in one query, add a FK relationship users(id) in Supabase dashboard
    // then you can select: "id, session_id, user_id, body, created_at, users(username)"
    const { data, error } = await supabase
      .from("session_comments")
      .select("id, session_id, user_id, body, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("listSessionComments error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json(data ?? []);
  } catch (e) {
    console.error("listSessionComments exception:", e);
    return res.status(500).json({ error: "Server error" });
  }
};

export const addSessionComment = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const token = req.auth?.token;
    const sessionId = req.params.sessionId;

    const body = (req.body?.body ?? "").trim();

    if (!userId || !token) return res.status(401).json({ error: "Unauthorized" });
    if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });
    if (!body) return res.status(400).json({ error: "Comment body required" });
    if (body.length > MAX_COMMENT_LEN) {
      return res.status(400).json({ error: `Comment too long (max ${MAX_COMMENT_LEN})` });
    }

    const supabase = supabaseForUser(token);

    const { data, error } = await supabase
      .from("session_comments")
      .insert({
        session_id: sessionId,
        user_id: userId,
        body,
      })
      .select("id, session_id, user_id, body, created_at")
      .single();

    if (error) {
      console.error("addSessionComment error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  } catch (e) {
    console.error("addSessionComment exception:", e);
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteSessionComment = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    const token = req.auth?.token;
    const commentId = req.params.commentId;

    if (!userId || !token) return res.status(401).json({ error: "Unauthorized" });
    if (!commentId) return res.status(400).json({ error: "Missing commentId" });

    const supabase = supabaseForUser(token);

    const { error } = await supabase
      .from("session_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", userId); // extra safety; RLS also enforces

    if (error) {
      console.error("deleteSessionComment error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("deleteSessionComment exception:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
