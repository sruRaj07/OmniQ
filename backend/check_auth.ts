import { supabaseAdmin } from "./shared/utils/supabaseClient";

async function check() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  console.log("Users:", data.users.map(u => u.email));
}

check();
