import axios from "axios";
import { supabase } from "../config/supabaseClient.js";
// import { ensureLocalBoardDB } from "../services/boardDatabaseService.js";

export const getUserBoardData = async (req, res) => {
  console.log("🛰️ Express: /api/import-user-board-data hit");

  try {
    const { board, username, password, appSession } = req.body;

    // if (!board || !username) {
    if (!board || !username || !password) {
      return res.status(400).json({
        error: "Missing required fields: board, username, password",
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
        appSession
        // database_path: localDbPath,
      },
      { timeout: 60_000 }
    );

    console.log("🧾 FastAPI keys:", Object.keys(logRes.data || {}));
    console.log("🧾 FastAPI count:", logRes.data?.count);
    console.log("🧾 FastAPI sample:", logRes.data?.entries?.[0]);


    // const attempts = logRes.data?.logbook;
    const attempts = logRes.data?.entries;

    if (!Array.isArray(attempts)) {
      throw new Error(
        `FastAPI response missing entries array. Keys: ${Object.keys(logRes.data || {})}`
      );
    }

    // ✅ Accept 0 attempts as valid (brand new user / no ascents)
    if (attempts.length === 0) {
      return res.status(200).json({
        message: "No logbook entries found for this user/board (nothing to import)",
        board,
        total_sessions: 0,
        inserted_attempts: 0,
        imported_climb_ids: [],
        fastapi: { count: logRes.data?.count ?? 0 },
      });
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

      const dateOnly = a.date.includes("T") ? a.date.split("T")[0] : a.date.split(" ")[0];
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

    // Track unique climbs touched by this import (for image rendering)
    const importedClimbKeys = new Set(); // `${angle}|${climb_name}`

    for (const [key, session] of sessionsMap.entries()) {
      const sessionId = sessionIdMap.get(key);
      if (!sessionId) continue;

      // --- build a deterministic board_attempt_id fallback ---
      const makeBoardAttemptId = (a) => {
        const datePart = (a.date || "").split(" ")[0] || "unknown-date";
        const namePart = a.climb_name || "unknown-climb";
        const triesTotal = parseInt(a.tries_total, 10) || 1;
        const sessionsCount = parseInt(a.sessions_count, 10) || 1;
        return `${datePart}|${namePart}|${triesTotal}|${sessionsCount}`;
      };

      const attemptRows = session.attempts.map((a) => {
      const angleInt = a.angle ? parseInt(a.angle, 10) : null;
      const climbName = a.climb_name?.trim() || null;
      
      // record key for later climb lookup
      if (climbName) importedClimbKeys.add(`${angleInt ?? "na"}|${climbName}`);

      return {
        session_id: sessionId,
        board_attempt_id: a.board_attempt_id || makeBoardAttemptId(a), // ✅ fallback
        board: a.board,
        angle: angleInt,
        climb_name: climbName,
        date: a.date ? new Date(a.date) : null,
        logged_grade: a.logged_grade || null,
        displayed_grade: a.displayed_grade || null,
        is_benchmark: a.is_benchmark === "True" || a.is_benchmark === true,
        tries: parseInt(a.tries, 10) || 1,
        is_mirror: a.is_mirror === "True" || a.is_mirror === true,
        sessions_count: parseInt(a.sessions_count, 10) || 1,
        tries_total: parseInt(a.tries_total, 10) || 1,
        is_repeat: a.is_repeat === "True" || a.is_repeat === true,
        is_ascent: a.is_ascent === "True" || a.is_ascent === true,
        comment: a.comment || null,
      };
    });

      const { error } = await supabase
        .from("attempts")
        .upsert(attemptRows, {
          onConflict: "session_id, board_attempt_id"
        });

      if (!error) attemptCount += attemptRows.length;
      else console.error("❌ Attempt insert error:", error.message);
    }

    // ----------------------------------------------------
    // Resolve imported climbs to climb IDs for image ensuring
    // (works even if FastAPI does not return climb uuid yet)
    // ----------------------------------------------------
    let importedClimbIds = [];

    try {
      // Ensure public climbs exist for this board (optional but recommended)
      // You can skip this if you guarantee public sync happens elsewhere
      // await axios.post(`${PY_LIB_URL}/sync-public-data`, { board }, { timeout: 60_000 });

      // Query climbs for this board by (angle + climb_name)
      const keys = Array.from(importedClimbKeys).slice(0, 300); // safety cap
      if (keys.length) {
        // Build OR filters for PostgREST (Supabase)
        // Example: or=(and(angle.eq.40,climb_name.eq.Foo),and(angle.is.null,climb_name.eq.Bar))
        const orParts = keys.map((k) => {
          const [angleStr, name] = k.split("|");
          const safeName = name.replaceAll(",", "\\,"); // minimal escaping for or() string
          if (angleStr === "na") return `and(angle.is.null,climb_name.eq.${safeName})`;
          return `and(angle.eq.${angleStr},climb_name.eq.${safeName})`;
        });

        const orFilter = `(${orParts.join(",")})`;

        const { data: climbsFound, error: climbsErr } = await supabase
          .from("climbs")
          .select("id")
          .eq("board_id", boardId)
          .or(orFilter);

        if (climbsErr) {
          console.warn("⚠️ Could not resolve climb IDs:", climbsErr.message);
        } else {
          importedClimbIds = (climbsFound || []).map((c) => c.id);
        }
      }
    } catch (e) {
      console.warn("⚠️ Resolve climbs step failed:", e.message);
    }

    // ----------------------------------------------------
    // Success
    // ----------------------------------------------------
    res.status(200).json({
      message: "Board data imported successfully",
      board,
      total_sessions: upsertedSessions.length,
      inserted_attempts: attemptCount,
      imported_climb_ids: importedClimbIds,
    } || []);

  } catch (err) {
    console.error("❌ User import error:", err);

    res.status(500).json({
      error: "Failed to import board data",
      details: err.response?.data ?? err.message,
    });
  }
};
