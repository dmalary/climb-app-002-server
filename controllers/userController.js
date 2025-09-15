import { supabase } from "../config/supabaseClient.js";

// GET all users
export const getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabase.from("profiles").select("*");

    if (error) throw error;

    console.log("data", data);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
