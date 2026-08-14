import { supabaseAdmin } from "./shared/utils/supabaseClient";

async function check() {
  const email = "test@gmail.com";
  const { data: existingProfile } = await supabaseAdmin.from("profiles").select("id").eq("email", email).single();
  console.log("existingProfile:", existingProfile);
}

check();
