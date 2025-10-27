import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const getBoardData = async (req, res) => {
  try {
    const { board, token, username, password } = req.body;

    if (!board) {
      return res.status(400).json({ error: "Missing required field: board" });
    }

    // Debug (optional)
    // console.log(`Fetching data for board: ${board}`);
    // console.log(`Auth token: ${token ? "Provided" : "None"}`);

    // Construct target URL safely
    const PY_LIB_URL = process.env.PY_LIB_URL;
    if (!PY_LIB_URL) {
      throw new Error("PY_LIB_URL not set in environment");
    }

    // --- Step 1: Fetch data from Python service ---
    const pythonRes = await axios.post(`${PY_LIB_URL}/fetch-board-data`, {
      board,
      token,
      username,
      password,
    });

    if (!pythonRes.data) {
      throw new Error("Invalid response from Python service");
    }

    // console.log(
    //   pythonRes.data.data, pythonRes.data,
    //  )

    const userId = req.auth?.userId || null;

    const sessions = pythonRes.data.data ?? pythonRes.data;
    console.log("Fetched board data:", sessions);
    
    // --- Step 2: Prepare data for DB insert ---
    // Example shape: flatten climbs across sessions
    const climbs = Array.isArray(sessions)
      ? sessions.flatMap((s) =>
          s.climbs?.map((c) => ({
            user_id: userId,
            session_id: s.session_id,
            board_name: s.board,
            date: s.date,
            climb_name: c.climb_name,
            difficulty: c.difficulty,
            attempts: c.attempts,
          }))
        )
      : [];


    // --- Step 3: Insert into Supabase ---
    let insertedCount = 0;
    if (climbs.length > 0) {
      const { data, error } = await supabase.from("climb_sessions").insert(climbs);
      if (error) {
        console.error("Supabase insert error:", error);
        return res.status(500).json({ error: "Failed to insert into Supabase", details: error.message });
      }
      insertedCount = data?.length || climbs.length;
    }

    // --- Step 4: Respond to client ---
    // res.status(200).json({
    //   message: `Board data fetched successfully${insertedCount ? ` and ${insertedCount} climbs inserted` : ""}`,
    //   board,
    //   inserted: insertedCount,
    //   data: sessions,
    // });

    res.status(200).json({
      message: `Board data fetched successfully. ${insertedCount} climbs inserted.`,
      board,
      total_sessions: sessions?.length || 0,
      inserted_climbs: insertedCount,
    });

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
