import fs from "fs";
import path from "path";
import axios from "axios";
import { supabase } from "../config/supabaseClient.js";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const DB_DIR = path.join(process.cwd(), "server/board_dbs");

export async function ensureLocalBoardDB(board) {
  const localPath = path.join(DB_DIR, `${board}.db`);

  // 1. Already exists?
  if (fs.existsSync(localPath)) {
    console.log(`✅ Local DB exists for ${board}`);
    return localPath;
  }

  // 2. Try downloading from Supabase
  console.log(`📥 Downloading ${board}.db from Supabase...`);

  const { data, error } = await supabase.storage
    .from("board-dbs")
    .download(`${board}.db`);

  if (!error && data) {
    const arraybuffer = await data.arrayBuffer();
    fs.mkdirSync(DB_DIR, { recursive: true });
    fs.writeFileSync(localPath, Buffer.from(arraybuffer));

    console.log(`⬇️ Downloaded cached DB for ${board}`);
    return localPath;
  }

  // 3. Ask FastAPI to build it
  const PY_LIB_URL = process.env.PY_LIB_URL; // e.g. http://127.0.0.1:8001
  if (!PY_LIB_URL) throw new Error("PY_LIB_URL not set");

  console.log(`🛠 Requesting FastAPI to build DB for ${board}...`);
  const res = await axios.get(`${PY_LIB_URL}/export-board-db`, {
    params: { board },
    responseType: "arraybuffer",
  });

  fs.mkdirSync(DB_DIR, { recursive: true });
  fs.writeFileSync(localPath, Buffer.from(res.data));

  console.log(`🎉 DB built and saved locally for ${board}`);

  return localPath;
}
