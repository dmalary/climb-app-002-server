import axios from "axios";
import { supabase } from "../config/supabaseClient.js";
import { ensureLocalBoardDB } from "../services/boardDatabaseService.js";

export const getUserBoardData = async (req, res) => {
  console.log("🛰️ Express: /api/import-user-board-data hit");

  try {
    const { board, username, password } = req.body;

    if (!board || !username || !password) {
      return res.status(400).json({
        error: "Missing required fields: board, username, password",
      });
    }

    // ----------------------------------------------------
    // Ensure local cached DB exists
    // Node no longer builds DB — FastAPI handles it
    // ----------------------------------------------------
    const localDbPath = await ensureLocalBoardDB(board);

    // ----------------------------------------------------
    // Verify FastAPI service URL
    // ----------------------------------------------------
    const PY_LIB_URL = process.env.PY_LIB_URL;
    if (!PY_LIB_URL) throw new Error("PY_LIB_URL not set");

    // ----------------------------------------------------
    // Request user logbook from FastAPI
    // ----------------------------------------------------
    console.log("📡 Requesting user logbook from FastAPI…");

    const logRes = await axios.post(`${PY_LIB_URL}/fetch-user-board-data`, {
      board,
      username,
      password,
      database_path: localDbPath,
    });

    const attempts = logRes.data?.logbook;
    if (!Array.isArray(attempts) || !attempts.length) {
      throw new Error("No session data returned from FastAPI");
    }

    console.log("🧠 Sesh length:", attempts.length);
    console.log("🧠 Session Sample:", attempts.slice(0, 3));

    const userId = req.auth?.userId || null;

    // ----------------------------------------------------
    // Ensure board exists in Supabase
    // ----------------------------------------------------
    let { data: existingBoards } = await supabase
      .from("boards")
      .select("id")
      .eq("name", board);

    let boardId;
    if (existingBoards?.length) {
      boardId = existingBoards[0].id;
    } else {
      const { data: newBoard, error: boardError } = await supabase
        .from("boards")
        .insert([{ name: board }])
        .select("id")
        .single();
      if (boardError) throw new Error(boardError.message);
      boardId = newBoard.id;
    }

    // ----------------------------------------------------
    // Group attempts by board + date (YYYY-MM-DD)
    // ----------------------------------------------------
    const sessionsMap = new Map();

    attempts.forEach((a) => {
      const dateOnly = a.date.split(" ")[0]; // '2023-07-31'
      const key = `${board}_${dateOnly}`;

      if (!sessionsMap.has(key)) {
        sessionsMap.set(key, {
          board,
          date: new Date(dateOnly + "T00:00:00Z"), // ensure Date object
          attempts: [],
        });
      }

      sessionsMap.get(key).attempts.push(a);
    });

    // ----------------------------------------------------
    // Insert sessions into Supabase
    // ----------------------------------------------------
    const sessionRows = Array.from(sessionsMap.values()).map((s) => ({
      user_id: userId,
      board_id: boardId,
      date: s.date,
    }));

    const { data: insertedSessions, error: sessionError } = await supabase
      .from("sessions")
      .insert(sessionRows)
      .select("id, date");

    if (sessionError) throw new Error(sessionError.message);

    // Map YYYY-MM-DD => sessionId
    const sessionIdMap = new Map();
    insertedSessions.forEach((s) => {
      const dateKey = new Date(s.date).toISOString().split("T")[0]; // convert to YYYY-MM-DD
      const key = `${board}_${dateKey}`;
      sessionIdMap.set(key, s.id);
    });

    // ----------------------------------------------------
    // Insert attempts with correct session ID
    // ----------------------------------------------------
    let attemptCount = 0;

    for (const [key, s] of sessionsMap.entries()) {
      const sessionId = sessionIdMap.get(key);
      if (!sessionId) continue;

      const attemptRows = s.attempts.map((a) => ({
        session_id: sessionId,
        board: a.board,
        angle: parseInt(a.angle, 10),
        climb_name: a.climb_name,
        date: new Date(a.date),
        logged_grade: a.logged_grade || null,
        displayed_grade: a.displayed_grade || null,
        is_benchmark: a.is_benchmark === "True",
        tries: parseInt(a.tries, 10) || 1,
        is_mirror: a.is_mirror === "True",
        sessions_count: parseInt(a.sessions_count, 10) || 1,
        tries_total: parseInt(a.tries_total, 10) || 1,
        is_repeat: a.is_repeat === "True",
        is_ascent: a.is_ascent === "True",
        comment: a.comment || null,
      }));

      const { error: attemptError } = await supabase
        .from("attempts")
        .insert(attemptRows);

      if (!attemptError) attemptCount += attemptRows.length;
      else console.error("❌ Attempt insert error:", attemptError.message);
    }

    // ----------------------------------------------------
    // Respond success
    // ----------------------------------------------------
    res.status(200).json({
      message: "Board data imported successfully.",
      board,
      total_sessions: insertedSessions.length,
      inserted_attempts: attemptCount,
    });

  } catch (err) {
    console.error("❌ User import error:", err.message);
    return res.status(500).json({
      error: "Failed to import board data",
      details: err.response?.data ?? err.message,
    });
  }
};
