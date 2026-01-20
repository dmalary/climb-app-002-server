import axios from "axios";
import { supabase } from "../config/supabaseClient.js";
import { renderImagesInBatches } from "../utils/renderImageInBatches.js"

const IMAGE_BATCH_SIZE = 25;

export const getPublicData = async (req, res) => {
  console.log("🛰️ Express: /api/sync-public hit");

  const { board } = req.body;
  if (!board) return res.status(400).json({ error: "Missing board name" });

  try {
    const PY_LIB_URL = process.env.PY_LIB_URL;
    if (!PY_LIB_URL) throw new Error("PY_LIB_URL not set");

    const { data: sessions } = await supabase
      .from("sessions")
      .select("id")
      .eq("user_id", req.auth.userId)
      .limit(1);

    if (!sessions || sessions.length === 0) {
      console.log("⏭ Skipping public image sync — user has no sessions");
      return next();
    }

    // 1️⃣ Fetch public climbs from FastAPI
    const pyRes = await axios.post(`${PY_LIB_URL}/sync-public-data`, { board });
    const { climbs = [], climb_count } = pyRes.data;

    if (!climbs.length) {
      return res.status(404).json({ error: "No climbs found" });
    }

    // 2️⃣ Ensure board exists
    let { data: boardData } = await supabase
      .from("boards")
      .select("id")
      .eq("name", board)
      .maybeSingle();

    if (!boardData) {
      const { data: newBoard, error } = await supabase
        .from("boards")
        .insert({ name: board })
        .select("id")
        .single();

      if (error) throw error;
      boardData = newBoard;
    }

    const boardId = boardData.id;

    // climb shape from fast api
    // {"uuid":"00163801596af1064d549ad75b684539","layout_id":9,"setter_id":33802,"setter_username":"vinsewah","name":"Duroxmanie 2.0","description":"No matching","hsm":3,"edge_left":8,"edge_right":88,"edge_bottom":32,"edge_top":128,"angle":null,"frames_count":1,"frames_pace":0,"frames":"p3r4p29r2p59r1p65r2p75r3p89r2p157r4p158r4","is_draft":0,"is_listed":1,"created_at":"2021-02-16 09:13:28.000000","is_nomatch":1}

    // 3️⃣ Map climbs
    const mappedClimbs = climbs.map(c => ({
      id: c.uuid,
      uuid: c.uuid,
      board_id: boardId,
      climb_name: c.name || "Unnamed climb",
      setter_id: c.setter_id,
      setter_username: c.setter_username,
      description: c.description,
      hsm: c.hsm,
      edge_left: c.edge_left,
      edge_right: c.edge_right,
      edge_bottom: c.edge_bottom,
      edge_top: c.edge_top,
      angle: c.angle,
      frames_count: c.frames_count,
      frames_pace: c.frames_pace,
      frames: c.frames,
      is_draft: c.is_draft,
      is_listed: c.is_listed,
      created_at: c.created_at,
      is_nomatch: c.is_nomatch,
    }));

    // 4️⃣ Upsert climbs (unchanged logic)
    for (let i = 0; i < mappedClimbs.length; i += 200) {
      const chunk = mappedClimbs.slice(i, i + 200);
      const { error } = await supabase
        .from("climbs")
        .upsert(chunk, { onConflict: "id" });

      if (error) throw error;
    }

    // 5️⃣ Filter climbs that already have images
    const { data: existingImages } = await supabase
      .from("climbs")
      .select("id")
      .not("image_url", "is", null);

    const existingSet = new Set(existingImages.map(c => c.id));

    const climbsNeedingImages = mappedClimbs.filter(
      c => !existingSet.has(c.id)
    );

    console.log(
      `🖼 Rendering images for ${climbsNeedingImages.length} climbs`
    );

    // 6️⃣ Render images in batches
    await renderImagesInBatches({
      climbs: climbsNeedingImages,
      board,
      PY_LIB_URL,
      batchSize: IMAGE_BATCH_SIZE,
    });

    return res.json({
      board,
      total_climbs: climb_count,
      inserted_count: mappedClimbs.length,
      images_queued: climbsNeedingImages.length,
    });
  } catch (err) {
    console.error("❌ syncPublicBoard error:", err);
    res.status(500).json({ error: err.message });
  }
};
