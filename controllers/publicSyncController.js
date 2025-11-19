import axios from "axios";
import { supabase } from "../config/supabaseClient.js";
import { fetchPublicData } from "../config/boardService.js";
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.PUBLIC_SUPABASE_URL, 
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

export const getPublicData = async (req, res) => {
  console.log("🛰️ Express: /api/sync-public hit");

  const { board } = req.body;
  console.log(`🚀 Starting public sync for board: ${board}`);

  if (!board) return res.status(400).json({ error: "Missing board name" });

  try {
    // 1️⃣ Fetch climbs from FastAPI board service
    // const publicBoardData = await fetchPublicData(board);
    const PY_LIB_URL = process.env.PY_LIB_URL;
    if (!PY_LIB_URL) {
      throw new Error("PY_LIB_URL not set in environment");
    }

    const pyRes = await axios.post(`${PY_LIB_URL}/sync-public-data`, {
      // params: { board },
      board
    });
    const data = pyRes.data;
    // console.log(`🧭 FastAPI returned. Count:${publicBoardData?.count}, Sample:${publicBoardData?.sample}`);
    // const climbs = publicBoardData?.climbs || publicBoardData?.data?.[0]?.climbs || [];
    // console.log(`🧭 FastAPI returned. Count:${pyRes?.count}, Sample:${pyRes?.sample}`);
    // console.log(`🧭 FastAPI returned. Count:${pyRes?.data?.count}, Sample:${pyRes?.data?.sample}`);
    console.log("🧭 FastAPI returned keys:", Object.keys(data));
    console.log(`🧭 FastAPI returned climb_count: ${data.climb_count}, Sample: ${JSON.stringify(data.sample?.[0], null, 2)}`);


    // const climbs = pyRes?.climbs || pyRes?.data?.[0]?.climbs || [];
    // const climbs = pyRes?.data?.climbs || pyRes?.data?.data?.[0]?.climbs || [];
    const climbs = data.climbs || [];

    if (!climbs.length) {
      return res.status(404).json({ error: "No climbs found from board service" });
    }

    // 2️⃣ Ensure board exists in Supabase
    let { data: boardData,  error: boardFetchError } = await supabase
      .from("boards")
      .select("id")
      .eq("name", board)
      .single();

    if (boardFetchError && boardFetchError.code !== "PGRST116") throw boardFetchError;

    let boardId = boardData?.id;
    if (!boardId) {
      const { data: newBoard, insertError } = await supabase
        .from("boards")
        .insert({ name: board })
        .select("id")
        .single();
      if (insertError) throw insertError;
      boardId = newBoard.id;
    }

    // 3️⃣ Map climbs to Supabase schema
    // const mappedClimbs = climbs.map((c) => ({
    //   board_id: boardId,
    //   climb_name: c.climb_name || c.name || "Unnamed climb",
    //   // update db to add climbID from py res?
    //   climb_uuid: c.uuid,
    //   angle: c.angle || null,
    //   displayed_grade: c.displayed_grade || c.grade || null,
    //   difficulty: c.difficulty || null,
    //   is_benchmark: Boolean(c.is_benchmark || false),
    // }));
    const mappedClimbs = climbs.map((c) => ({
      id: c.uuid,                     // IMPORTANT
      board_id: boardId,
      climb_name: c.name || "Unnamed climb",
      angle: c.angle ?? null,
      displayed_grade: c.displayed_grade ?? null,
      difficulty: c.difficulty ?? null,
      is_benchmark: Boolean(c.is_benchmark),
    }));

    // 4️⃣ Upsert climbs
    // const { error: insertError } = await supabase
    //   .from("climbs")
    //   // .upsert(mappedClimbs, { onConflict: ["board_id", "climb_name"] });
    //   .upsert(mappedClimbs, { onConflict: ["id"] });

    // if (insertError) throw insertError;
    console.log("Syncing climbs:", mappedClimbs.length);
    
    async function upsertClimbsInBatches(upsertClimbs, batchSize = 200) {
      for (let i = 0; i < upsertClimbs.length; i += batchSize) {
        const chunk = upsertClimbs.slice(i, i + batchSize);

        const { error } = await supabase
          .from("climbs")
          .upsert(chunk, { onConflict: "id" });

        if (error) {
          console.error("Batch upsert error:", error);
          throw error;
        }
      }
    }
    await upsertClimbsInBatches(mappedClimbs);


    return res.json({
      board,
      total_climbs: data.climb_count,
      inserted_count: mappedClimbs.length,
      sample: mappedClimbs.slice(0, 3),
    });
  } catch (err) {
    console.error("❌ syncPublicBoard error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
