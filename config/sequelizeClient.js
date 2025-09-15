import Sequelize from 'sequelize';
import dotenv from "dotenv";

dotenv.config()

export const sequelize = new Sequelize(
  process.env.SUPABASE_USERNAME,
  process.env.SUPABASE_USERPASS,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      host: process.env.NEXT_PUBLIC_SUPABASE_URL,
      dialect: 'postgres',
    }
);