import { saveTempPassword, getTempPasswords } from '@/lib/dbSim';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const data = await getTempPasswords();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { userId, password } = await request.json();
    
    if (!userId || !password) {
      return Response.json({ error: 'Data tidak lengkap.' }, { status: 400 });
    }

    // 1. Simpan ke database / local simulator agar Admin Utama bisa melihat password
    await saveTempPassword(userId, password);

    // 2. Coba reset password di Auth Supabase jika admin client terbuat
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (serviceRoleKey && supabaseUrl) {
      try {
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        });
        const { error } = await adminClient.auth.admin.updateUserById(userId, {
          password: password
        });
        if (error) {
          console.error("Gagal update password auth:", error.message);
        } else {
          console.log(`Password Auth untuk user ${userId} berhasil diperbarui di Supabase.`);
        }
      } catch (err) {
        console.error("Kesalahan inisialisasi admin client:", err);
      }
    } else {
      console.warn("SUPABASE_SERVICE_ROLE_KEY tidak disetel. Reset password disimulasikan di database profil.");
    }

    return Response.json({ success: true, message: 'Password berhasil direset!' });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
