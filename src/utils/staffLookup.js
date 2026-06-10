import { supabase } from '../supabaseClient';

/** Kolom inti staff — gunakan '*' untuk kompatibilitas dengan schema lama/baru. */
export const STAFF_CORE_COLUMNS = '*';

/**
 * Cari baris staff untuk user auth (email case-insensitive, fallback auth_user_id jika kolom ada).
 */
export async function findStaffForLogin(email, authUserId) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) return { staffData: null, staffError: new Error('Email kosong') };

  let { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select(STAFF_CORE_COLUMNS)
    .eq('email', cleanEmail)
    .maybeSingle();

  if (!staffData && !staffError) {
    ({ data: staffData, error: staffError } = await supabase
      .from('staff')
      .select(STAFF_CORE_COLUMNS)
      .ilike('email', cleanEmail)
      .maybeSingle());
  }

  if (!staffData && !staffError && authUserId) {
    const byAuth = await supabase
      .from('staff')
      .select(STAFF_CORE_COLUMNS)
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (byAuth.error && /auth_user_id does not exist/i.test(byAuth.error.message || '')) {
      return { staffData: null, staffError: null };
    }
    staffData = byAuth.data;
    staffError = byAuth.error;
  }

  return { staffData, staffError };
}

/** Set auth_user_id di staff setelah login (abaikan jika kolom belum ada). */
export async function linkStaffAuthUserId(staffId, authUserId) {
  if (!staffId || !authUserId) return;
  const { error } = await supabase
    .from('staff')
    .update({ auth_user_id: authUserId })
    .eq('id', staffId);
  if (error && !/auth_user_id does not exist/i.test(error.message || '')) {
    console.warn('linkStaffAuthUserId:', error.message);
  }
}

/**
 * Insert staff — secara progresif menghapus kolom yang belum ada di DB.
 * Kolom opsional: auth_user_id, permissions, outlet_id
 */
export async function insertStaffRow(row) {
  // Kolom-kolom yang mungkin belum ada di database lama
  const optionalColumns = ['auth_user_id', 'permissions', 'outlet_id'];

  let payload = { ...row };
  let error;

  // Coba insert dengan semua kolom dulu
  ({ error } = await supabase.from('staff').insert([payload]));

  // Jika error karena kolom tidak ada, hapus kolom bermasalah dan coba lagi
  if (error && /does not exist/i.test(error.message || '')) {
    for (const col of optionalColumns) {
      if (error && new RegExp(col + '\\b.*does not exist', 'i').test(error.message || '')) {
        delete payload[col];
        ({ error } = await supabase.from('staff').insert([payload]));
      }
    }
    // Fallback terakhir: hapus SEMUA kolom opsional sekaligus
    if (error && /does not exist/i.test(error.message || '')) {
      for (const col of optionalColumns) delete payload[col];
      ({ error } = await supabase.from('staff').insert([payload]));
    }
  }

  return { error };
}
