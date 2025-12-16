import { supabase } from "../config/supabaseClient.js";

// GET all users
export const getAllClimbs = async (req, res) => {
  try {
    const { data, error } = await supabase.from("climbs").select("*");

    if (error) throw error;

    // console.log("data", data.length > 1);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
