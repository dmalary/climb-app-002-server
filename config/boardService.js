import axios from "axios";

// const PY_LIB_URL = process.env.PY_LIB_URL || "http://localhost:8001";
const PY_LIB_URL = process.env.PY_LIB_URL;
if (!PY_LIB_URL) {
  throw new Error("PY_LIB_URL not set in environment");
}

export const fetchUserData = async (board, token, username, password) => {
  try {
    const response = await axios.post(`${PY_LIB_URL}/fetch-board-data`, {
      board,
      token,
      username,
      password,
    });
    return response.data;
  } catch (err) {
    console.error("Error fetching user board data from FastAPI:", err.message);
    throw err;
  }
};

export const fetchPublicData = async (board) => {
  try {
    // const response = await axios.get(`${PY_LIB_URL}/sync-public`, {
    const response = await axios.post(`${PY_LIB_URL}/sync-public`, {
      // params: { board },
      board
    });
    return response.data;
  } catch (err) {
    console.error("Error fetching public board data from FastAPI:", err.message);
    throw err;
  }
};