// import axios from "axios";
import { supabase } from "../config/supabaseClient.js";
import { fetchPublicData } from "../config/boardService.js";
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.PUBLIC_SUPABASE_URL, 
//   process.env.SUPABASE_SERVICE_ROLE_KEY
// );

export const getPublicData = async (req, res) => {
  const { board } = req.body;

  if (!board) return res.status(400).json({ error: "Missing board name" });

  try {
    // 1️⃣ Fetch climbs from FastAPI board service
    const publicBoardData = await fetchPublicData(board);
    console.log(`🧭 FastAPI returned. Count:${publicBoardData?.count}, Sample:${publicBoardData?.sample}`);
    const climbs = publicBoardData?.climbs || publicBoardData?.data?.[0]?.climbs || [];

    if (!climbs.length) {
      return res.status(404).json({ error: "No climbs found from board service" });
    }

    // 2️⃣ Ensure board exists in Supabase
    let { data: boards } = await supabase
      .from("boards")
      .select("id")
      .eq("name", board)
      .single();

    let boardId = boards?.id;
    if (!boardId) {
      const { data: newBoard, error } = await supabase
        .from("boards")
        .insert({ name: board })
        .select("id")
        .single();
      if (error) throw error;
      boardId = newBoard.id;
    }

    // 3️⃣ Map climbs to Supabase schema
    const mappedClimbs = climbs.map((c) => ({
      board_id: boardId,
      climb_name: c.climb_name || c.name || "Unnamed climb",
      angle: c.angle || null,
      displayed_grade: c.displayed_grade || c.grade || null,
      difficulty: c.difficulty || null,
      is_benchmark: Boolean(c.is_benchmark || false),
    }));

    // 4️⃣ Upsert climbs
    const { error: insertError } = await supabase
      .from("climbs")
      .upsert(mappedClimbs, { onConflict: ["board_id", "climb_name"] });

    if (insertError) throw insertError;

    return res.json({
      board,
      total_climbs: climbs.length,
      inserted_count: mappedClimbs.length,
      sample: mappedClimbs.slice(0, 5),
    });
  } catch (err) {
    console.error("❌ syncPublicBoard error:", err.message);
    res.status(500).json({ error: err.message });
  }
}
