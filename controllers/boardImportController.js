import axios from "axios";
import { supabase } from "../config/supabaseClient.js"; // uncomment client items below if this doesn't work
import { fetchUserData } from "../config/boardService.js";
import { createClient } from "@supabase/supabase-js";
import { ensureLocalBoardDB } from "../services/boardDatabaseService.js";
// const supabase = createClient(
//   process.env.PUBLIC_SUPABASE_URL, 
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

export const getUserBoardData = async (req, res) => {
  console.log("🛰️ Express: /api/import-user-board-data hit");

  try {
    const { board, token, username, password } = req.body;

    if (!board) {
      return res.status(400).json({ error: "Missing required field: board" });
    }

    // Debug (optional)
    // ====================
    // console.log(`Fetching data for board: ${board}`);
    // console.log(`Auth token: ${token ? "Provided" : "None"}`);
    // console.log('username', username)
    // ====================

    const dbPath = await ensureLocalBoardDB(board);

    // can i move this url logic + step 1 to board service?
    // Construct target URL safely
    const PY_LIB_URL = process.env.PY_LIB_URL;
    if (!PY_LIB_URL) {
      throw new Error("PY_LIB_URL not set in environment");
    }

    // --- Step 1: Fetch data from Python service ---
    console.log("📦 Sending to FastAPI:", {
      board,
      username,
      database_path: dbPath,
    });
    const pyRes = await axios.post(`${PY_LIB_URL}/fetch-user-board-data`, {
      board,
      // token,
      username,
      password,
      database_path: dbPath,
    });

    // const userBoardData = await fetchUserData(board, token, username, password);

    if (!pyRes.data) {
      throw new Error("Invalid response from Python service");
    }

    const pyData = Array.isArray(pyRes.data) ? pyRes.data[0] : pyRes.data;
    // const pyData = Array.isArray(userBoardData.data) ? userBoardData.data[0] : userBoardData.data;
    const sessions = pyData?.data ?? [];

    // data shape of climb from fast api for user data
    // {"uuid":"28A07D13C33643D5BC35B1C358539EF1","wall_uuid":null,"climb_uuid":"ec1a99cfb9d20589883e199060274e5e","angle":40,"is_mirror":false,"user_id":114697,"attempt_id":0,"bid_count":1,"quality":3,"difficulty":10,"is_benchmark":false,"is_listed":true,"comment":"","climbed_at":"2023-07-31 11:10:13","created_at":"2023-07-31 15:10:14.311960","updated_at":"2023-07-31 15:10:14.311960"},

    if (!Array.isArray(sessions) || sessions.length === 0) {
      throw new Error("No session data found from Python service");
    }
    console.log('sessions', sessions[0])

    const userId = req.auth?.userId || null;

    // --- Ensure board exists ---
    const { data: existingBoards } = await supabase
      .from("boards")
      .select("id")
      .eq("name", board);

    let boardId;
    if (existingBoards?.length) {
      boardId = existingBoards[0].id;
    } else { // should i remove this?
      const { data: newBoard, error: boardError } = await supabase
        .from("boards")
        .insert([{ name: board }])
        .select("id")
        .single();
      if (boardError) throw new Error(boardError.message);
      boardId = newBoard.id;
    }

    // --- Insert sessions ---
    const sessionRows = sessions.map((s) => ({
      user_id: userId,
      board_id: boardId,
      date: new Date(s.climbed_at),
    }));

    const { data: insertedSessions, error: sessionError } = await supabase
      .from("sessions")
      .insert(sessionRows)
      .select("id");

    if (sessionError) throw new Error(sessionError.message);

    // --- Insert climbs + attempts ---
    // let climbCount = 0;
    let attemptCount = 0;

    for (let i = 0; i < sessions.length; i++) {
      const sesh = sessions[i];
      const sessionId = insertedSessions[i]?.id;
      if (!sessionId) continue;

      // 🧭 Preload climbs for this board
      const { data: climbs, error: climbsError } = await supabase
        .from("climbs")
        .select("id")
        .eq("board_id", boardId);

      if (i === 0) console.log('climbs', climbs)

      if (climbsError) throw climbsError;

      // Build lookup map by climb_name
      const climbMap = new Map();

      for (const cl of climbs) {
        // climbMap.set(cl.climb_name.trim().toLowerCase(), cl.id);
        // climbMap.set(cl.id, cl.climb_name.trim().toLowerCase());
        climbMap.set(cl.id, true);
      }

      // 🧗 Loop through each climb in the session (from fast api)
      console.log('sample climb', sesh.climbs?.[0])
      for (const c of sesh.climbs ?? []) {
      console.log("FULL PY CLIMB:", c);
      console.log("DB climb IDs:", climbs.slice(0,10).map(c => c.id));
      // console.log("Attempt climb_uuid:", c.climb_uuid);
      console.log("Attempt uuid:", c.uuid);

        // const climbId = c.climb_uuid;
        const climbId = c.uuid;
        if (!climbMap.has(climbId)) {
          console.warn(`Skipping attempt: climb ${climbId} not found`);
          continue;
        }

        // 2️⃣ Insert attempt (each climb = 1 attempt)
        const { error: attemptError } = await supabase.from("attempts").insert([
          {
            session_id: sessionId,
            climb_id: climbId,
            tries: c.bid_count ?? 1,
            is_repeat: false,
            is_ascent: c.quality > 0, // crude ascent flag
            is_mirror: c.is_mirror ?? false,
            comment: c.comment || null,
          },
        ]);

        if (attemptError) {
          console.error("Attempt insert error:", attemptError.message);
        } else {
          attemptCount++;
        }
      }
    }

    // --- Respond ---
    res.status(200).json({
      message: `Board data imported successfully.`,
      board,
      total_sessions: sessions.length,
      inserted_sessions: insertedSessions.length,
      // inserted_climbs: climbCount,
      inserted_attempts: attemptCount,
    });

  } catch (err) {
    console.error("Python service error:", err.message);

    if (err.response) {
      // Capture error returned from FastAPI
      console.error("Python error response:", err.response.data);
    }

    res.status(500).json({
      error: "Failed to fetch board data",
      details: err.response?.data || err.message,
    });
  }
};
