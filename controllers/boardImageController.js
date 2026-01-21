import { supabase } from "../config/supabaseClient.js";
import { renderImagesInBatches } from "../utils/renderImageInBatches.js";

export const ensureBoardImages = async (req, res) => {
  const { board, climbIds = [], batchSize = 25 } = req.body;

  if (!board) return res.status(400).json({ error: "Missing board" });
  if (!Array.isArray(climbIds) || climbIds.length === 0) {
    return res.status(200).json({ board, requested: 0, queued: 0 });
  }

  const PY_LIB_URL = process.env.PY_LIB_URL;
  if (!PY_LIB_URL) return res.status(500).json({ error: "PY_LIB_URL not set" });

  // board id
  const { data: boardData, error: boardErr } = await supabase
    .from("boards")
    .select("id")
    .eq("name", board)
    .maybeSingle();

  if (boardErr) return res.status(500).json({ error: boardErr.message });
  if (!boardData) return res.status(404).json({ error: "Board not found" });

  // only climbs missing image_url
  const { data: climbs, error: climbErr } = await supabase
    .from("climbs")
    .select("id, uuid")
    .eq("board_id", boardData.id)
    .in("id", climbIds)
    .is("image_url", null);

  if (climbErr) return res.status(500).json({ error: climbErr.message });

  const missing = climbs || [];
  if (missing.length === 0) {
    return res.status(200).json({ board, requested: climbIds.length, queued: 0 });
  }

  await renderImagesInBatches({
    climbs: missing,
    board,
    PY_LIB_URL,
    batchSize,
  });

  return res.status(200).json({
    board,
    requested: climbIds.length,
    queued: missing.length,
  });
};
