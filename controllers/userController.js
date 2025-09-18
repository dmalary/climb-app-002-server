import { supabase } from "../config/supabaseClient.js";

// GET all users
export const getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("*");

    if (error) throw error;

    console.log("data", data.length > 1);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

// Define a GET route for a specific user by ID
export const getUser = async (req, res) => {
  const { id } = req.params;

  try {
    if (!id) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const { data, error } = await supabase.from("users").select('*').eq('id', id).single();

    if (error) throw error;

    console.log("data", data.length > 1);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    return res.status(500).json({ error: err.message });
  }
}



// app.get('/api/users{:id}', (req, res) => { // optional param

// app.get('/api/users/:id', (req, res) => {
//   const userId = parseInt(req.params.id);
//   const user = db.users.find(u => u.userId === userId);

//   if (user) {
//     res.status(200).json(user);
//   } else {
//     res.status(404).json({ message: 'User not found' });
//   }
// });

// Define a POST route to add a new user
// app.post('/api/users', (req, res) => {
//   const newUser = req.body;
//   // In a real app, you'd add validation and persistent storage
//   newUser.id = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
//   users.push(newUser);
//   res.status(201).json(newUser);
// });