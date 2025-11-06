import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const getBoardData = async (req, res) => {
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

    // Construct target URL safely
    const PY_LIB_URL = process.env.PY_LIB_URL;
    if (!PY_LIB_URL) {
      throw new Error("PY_LIB_URL not set in environment");
    }

    // --- Step 1: Fetch data from Python service ---
    const pyRes = await axios.post(`${PY_LIB_URL}/fetch-board-data`, {
      board,
      token,
      username,
      password,
    });

    // if (!pythonRes.data) {
    //   throw new Error("Invalid response from Python service");
    // }

    const pyData = Array.isArray(pyRes.data) ? pyRes.data[0] : pyRes.data;
    const sessions = pyData?.data ?? [];

    if (!Array.isArray(sessions) || sessions.length === 0) {
      throw new Error("No session data found from Python service");
    }

    const userId = req.auth?.userId || null;

    // --- Ensure board exists ---
    const { data: existingBoards } = await supabase
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

    // --- Insert sessions ---
    const sessionRows = sessions.map((s) => ({
      user_id: userId,
      board_id: boardId,
      date: new Date(s.date),
    }));

    const { data: insertedSessions, error: sessionError } = await supabase
      .from("sessions")
      .insert(sessionRows)
      .select("id");

    if (sessionError) throw new Error(sessionError.message);

    // --- Insert climbs + attempts ---
    let climbCount = 0;
    let attemptCount = 0;

    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      const sessionId = insertedSessions[i]?.id;
      if (!sessionId) continue;

      for (const c of s.climbs ?? []) {
        // 1️⃣ Insert climb
        const { data: climbData, error: climbError } = await supabase
          .from("climbs")
          .insert([
            {
              board_id: boardId,
              climb_name: c.climb_uuid ?? "Unknown",
              angle: c.angle ?? null,
              displayed_grade: null,
              difficulty: c.difficulty ?? null,
              is_benchmark: c.is_benchmark ?? false,
            },
          ])
          .select("id")
          .single();

        if (climbError) {
          console.error("Climb insert error:", climbError.message);
          continue;
        }
        climbCount++;

        // 2️⃣ Insert attempt (each climb = 1 attempt)
        const { error: attemptError } = await supabase.from("attempts").insert([
          {
            session_id: sessionId,
            climb_id: climbData.id,
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
      inserted_climbs: climbCount,
      inserted_attempts: attemptCount,
    });

    // console.log(
    //   pythonRes.data.data, pythonRes.data,
    //  )
    // const sessions = pythonRes.data.data ?? pythonRes.data;
    // console.log("Fetched board data:", sessions.length);
    
    // --- Step 2: Prepare data for DB insert ---
    // Example shape: flatten climbs across sessions
    // const climbs = Array.isArray(sessions)
    //   ? sessions.flatMap((s) =>
    //       s.climbs?.map((c) => ({
    //         user_id: userId,
    //         session_id: s.session_id,
    //         board_name: s.board,
    //         date: s.date,
    //         climb_name: c.climb_name,
    //         difficulty: c.difficulty,
    //         attempts: c.attempts,
    //       }))
    //     )
    //   : [];


    // // --- Step 3: Insert into Supabase ---
    // let insertedCount = 0;
    // if (climbs.length > 0) {
    //   const { data, error } = await supabase.from("sessions").insert(climbs);
    //   if (error) {
    //     console.error("Supabase insert error:", error);
    //     return res.status(500).json({ error: "Failed to insert into Supabase", details: error.message });
    //   }
    //   insertedCount = data?.length || climbs.length;
    // }

    // --- Step 4: Respond to client ---
    // res.status(200).json({
    //   message: `Board data fetched successfully. ${insertedCount} climbs inserted.`,
    //   board,
    //   total_sessions: sessions?.length || 0,
    //   inserted_climbs: insertedCount,
    // });

    // // In production: insert/transform data here (e.g. Supabase)
    // res.status(200).json({
    //   message: "Board data fetched successfully",
    //   board,
    //   data: pythonRes.data.data ?? pythonRes.data,
    // });
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
