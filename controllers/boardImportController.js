export const getBoardData = async (req, res) => {
  const { board, token } = req.body;

  console.log(`Received import request for ${board}`);
  console.log(`Google OAuth token: ${token}`);

  // TODO: Call Python service here:
  // const pythonResponse = await axios.post("http://localhost:8000/import", { board, token });

  res.json({ success: true, message: "Import started" });
}