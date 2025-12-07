import fs from "fs";
import path from "path";
import axios from "axios";

const BOARD_DB_DIR = path.resolve("./board_dbs");

export async function ensureLocalBoardDB(board) {
  const dbPath = path.join(BOARD_DB_DIR, `${board}.db`);

  if (fs.existsSync(dbPath)) {
    console.log(`✅ Local DB exists for ${board}`);
    return dbPath;
  }

  console.log(`⬇️ Downloading local DB for ${board}...`);

  const response = await axios({
    method: "GET",
    url: `${process.env.PY_LIB_URL}/export-board-db?board=${board}`,
    responseType: "stream",
  });

  fs.mkdirSync(BOARD_DB_DIR, { recursive: true });

  const writer = fs.createWriteStream(dbPath);
  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  console.log(`✅ Local DB created at ${dbPath}`);
  return dbPath;
}
