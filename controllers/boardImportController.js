import axios from "axios";
import { supabase } from "../config/supabaseClient.js";
import { ensureLocalBoardDB } from "../services/boardDatabaseService.js";

export const getUserBoardData = async (req, res) => {
  console.log("🛰️ Express: /api/import-user-board-data hit");

  try {
    const { board, username, password } = req.body;

    if (!board || !username) {
      return res.status(400).json({
        error: "Missing required fields: board, username",
      });
    }

    // ----------------------------------------------------
    // Validate FastAPI service URL
    // ----------------------------------------------------
    const PY_LIB_URL = process.env.PY_LIB_URL;
    if (!PY_LIB_URL) throw new Error("PY_LIB_URL not set");

    // ----------------------------------------------------
    // Ensure a LOGBOOK-CAPABLE DB exists
    // FastAPI is now the authority
    // ----------------------------------------------------
    // const localDbPath = await ensureLocalBoardDB({
    //   board,
    //   require: "logbook",
    //   username,
    //   password,
    // });

    // if (!localDbPath) {
    //   throw new Error("Failed to resolve local board DB path");
    // }

    // ----------------------------------------------------
    // Request user logbook from FastAPI
    // ----------------------------------------------------
    console.log("📡 Requesting user logbook from FastAPI…");

    const logRes = await axios.post(
      `${PY_LIB_URL}/fetch-user-board-data`,
      {
        board,
        username,
        password,
        // database_path: localDbPath,
      },
      { timeout: 60_000 }
    );

    // const attempts = logRes.data?.logbook;
    const attempts = logRes.data?.entries;

    if (!Array.isArray(attempts) || attempts.length === 0) {
      throw new Error("No logbook data returned from FastAPI");
    }

    console.log("🧠 Attempts received:", attempts.length);
    console.log("🧠 Sample attempt:", attempts[0]);

    const userId = req.auth?.userId ?? null;

    // ----------------------------------------------------
    // Ensure board exists in Supabase
    // ----------------------------------------------------
    const { data: existingBoards } = await supabase
      .from("boards")
      .select("id")
      .eq("name", board)
      .limit(1);

    let boardId;

    if (existingBoards?.length) {
      boardId = existingBoards[0].id;
    } else {
      const { data: newBoard, error } = await supabase
        .from("boards")
        .insert([{ name: board }])
        .select("id")
        .single();
        // .mayBeSingle();

      if (error) throw new Error(error.message);
      boardId = newBoard.id;
    }

    // ----------------------------------------------------
    // Group attempts by board + date (YYYY-MM-DD)
    // ----------------------------------------------------
    const sessionsMap = new Map();

    attempts.forEach((a) => {
      if (!a.date) return;

      const dateOnly = a.date.split(" ")[0];
      const key = `${board}_${dateOnly}`;

      if (!sessionsMap.has(key)) {
        sessionsMap.set(key, {
          board,
          date: new Date(`${dateOnly}T00:00:00Z`),
          attempts: [],
        });
      }

      sessionsMap.get(key).attempts.push(a);
    });

    // ----------------------------------------------------
    // Insert sessions
    // ----------------------------------------------------
    const sessionRows = Array.from(sessionsMap.values()).map((s) => ({
      user_id: userId,
      board_id: boardId,
      board_name: board,
      // date: s.date,
      date: s.date.toISOString().split("T")[0],
    }));

    const { data: upsertedSessions, error: sessionError } = await supabase
      .from("sessions")
      .upsert(sessionRows, {
        onConflict: "user_id, board_name, date"
      })
      .select("id, board_name, date");

    if (sessionError) throw new Error(sessionError.message);

    // Map YYYY-MM-DD → sessionId
    const sessionIdMap = new Map();
    upsertedSessions.forEach((s) => {
      const dateKey = new Date(s.date).toISOString().split("T")[0];
      sessionIdMap.set(`${s.board_name}_${dateKey}`, s.id);
    });

    // ----------------------------------------------------
    // Insert attempts
    // ----------------------------------------------------
    let attemptCount = 0;

    for (const [key, session] of sessionsMap.entries()) {
      const sessionId = sessionIdMap.get(key);
      if (!sessionId) continue;

      const attemptRows = session.attempts.map((a) => ({
        session_id: sessionId,
        board_attempt_id: a.board_attempt_id,
        board: a.board,
        angle: a.angle ? parseInt(a.angle, 10) : null,
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

      const { error } = await supabase
        .from("attempts")
        .upsert(attemptRows, {
          onConflict: "session_id, board_attempt_id"
        });

      if (!error) attemptCount += attemptRows.length;
      else console.error("❌ Attempt insert error:", error.message);
    }

    // ----------------------------------------------------
    // Success
    // ----------------------------------------------------
    res.status(200).json({
      message: "Board data imported successfully",
      board,
      total_sessions: upsertedSessions.length,
      inserted_attempts: attemptCount,
    } || []);

  } catch (err) {
    console.error("❌ User import error:", err);

    res.status(500).json({
      error: "Failed to import board data",
      details: err.response?.data ?? err.message,
    });
  }
};
