import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: tables } = await supabase.from('users').select('count', { count: 'exact', head: true });
  console.log("users:", tables);
  const { data: sellers } = await supabase.from('sellers').select('*').limit(1);
  console.log("sellers schema:", sellers);
}
run();
