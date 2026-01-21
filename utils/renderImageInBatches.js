import axios from "axios";
import { supabase } from "../config/supabaseClient.js";

export async function renderImagesInBatches({
  climbs,
  board,
  PY_LIB_URL,
  batchSize = 25,
}) {
  for (let i = 0; i < climbs.length; i += batchSize) {
    const batch = climbs.slice(i, i + batchSize);

    console.log(
      `🧱 Image batch ${i + 1}–${i + batch.length} / ${climbs.length}`
    );

    const results = await Promise.allSettled(
      batch.map(async (climb) => {
        const res = await axios.post(
          `${PY_LIB_URL}/render-climb-image`,
          {
            board,
            climb_uuid: climb.uuid,
          },
          { timeout: 60_000 }
        );

        const image_url = res.data?.image_url;
        if (!image_url) throw new Error("No image_url returned");

        await supabase
          .from("climbs")
          .update({ image_url })
          .eq("id", climb.id ?? climb.uuid);
      })
    );

    const failures = results.filter(r => r.status === "rejected");
    if (failures.length) {
      console.warn(
        `⚠️ ${failures.length} image(s) failed in this batch`
      );
    }
  }
}
