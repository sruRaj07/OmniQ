import { supabaseAdmin } from "./shared/utils/supabaseClient";

async function check() {
  const { data, error } = await supabaseAdmin.from("profiles").select("*").limit(1);
  console.log("Data:", data);
  console.log("Error:", error);
}

check();
