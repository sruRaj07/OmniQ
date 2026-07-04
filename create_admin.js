const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Creating admin user...");
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'admin@omniq.in',
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { role: 'admin', full_name: 'System Admin' }
  });

  if (error) {
    if (error.message.includes('already registered')) {
       console.log('Admin user already exists!');
       return;
    }
    console.error(error);
  } else {
    // Also create the profile
    await supabaseAdmin.from('profiles').upsert({
      id: data.user.id,
      full_name: 'System Admin',
      role: 'admin'
    });
    console.log('Admin user created successfully!');
  }
}

run();
