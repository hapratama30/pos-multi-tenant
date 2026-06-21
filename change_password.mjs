import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const email = 'admin@gmail.com';
const newPassword = process.argv[2];

if (!newPassword) {
  console.log('Gunakan: node change_password.mjs <password_baru_anda>');
  process.exit(1);
}

async function run() {
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Gagal mengambil daftar user:', listErr.message);
    return;
  }
  
  const user = users.find(u => u.email === email);
  if (!user) {
    console.log(`User ${email} tidak ditemukan.`);
    return;
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
  if (error) {
    console.error('Gagal mengubah password:', error.message);
  } else {
    console.log(`Password untuk ${email} berhasil diubah ke password baru Anda!`);
  }
}

run();
