import fs from "fs";
import path from "path";
import axios from "axios";
import { supabase } from "../config/supabaseClient.js";

export const buildAndUploadClimbImages = async (board, climbs) => {
  const PY_LIB_URL = process.env.PY_LIB_URL;
  if (!PY_LIB_URL) throw new Error("PY_LIB_URL not set");

  for (const climb of climbs) {
    const exists = await climbImageExists(board, climb.uuid);
    if (exists) {
      console.log(`🟡 Image exists, skipping ${climb.uuid}`);
      continue;
    }
    try {
      // 1️⃣ Call FastAPI to build the climb image
      const res = await axios.post(`${PY_LIB_URL}/render-climb-image`, {
        board,
        climb_uuid: climb.uuid,   // match FastAPI route param
      }, { responseType: "arraybuffer" });

      // 2️⃣ Save locally (optional)
      const imagesDir = path.join("data", "boards", board, "images");
      fs.mkdirSync(imagesDir, { recursive: true });
      const imagePath = path.join(imagesDir, `${climb.uuid}.png`);
      fs.writeFileSync(imagePath, res.data);

      // 3️⃣ Upload to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from("climb-images")
        .upload(`${board}/${climb.uuid}.png`, res.data, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadErr) {
        console.error(`❌ Failed to upload climb image ${climb.uuid}:`, uploadErr.message);
      } else {
        console.log(`✅ Image built & uploaded for climb ${climb.uuid}`);
      }
    } catch (err) {
      console.error(`❌ Error building image for climb ${climb.uuid}:`, err.message);
    }
  }
};

export const climbImageExists = async (board, climbId) => {
  const { data, error } = await supabase.storage
    .from("climb-images")
    .list(board, {
      search: `${climbId}.png`,
      limit: 1,
    });

  if (error) {
    console.warn("Storage list error:", error.message);
    return false;
  }

  return data.length > 0;
};
