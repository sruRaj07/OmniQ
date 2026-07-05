import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: profiles } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
  console.log("profiles:", profiles);
  const { data: users } = await supabase.auth.admin.listUsers();
  console.log("auth users count:", users?.users?.length);
  const { data: orders } = await supabase.from('orders').select('*');
  console.log("orders count:", orders?.length);
}
run();
