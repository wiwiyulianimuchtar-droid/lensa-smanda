import { createClient } from '@supabase/supabase-js';

// Menggunakan API route agar proses signUp tidak menimpa sesi login Admin di browser
export async function POST(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false, // Penting! Agar tidak mengubah sesi lokal
        },
      }
    );

    const body = await request.json();
    const { full_name, email, password, nisn, nis, gender, class_id } = body;

    // 1. Buat Akun Auth Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
        }
      }
    });

    if (authError) {
      return Response.json({ error: 'Gagal membuat akun auth: ' + authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Buat Profil Dasar
    const { error: profileError } = await supabase.from('sr_profiles').insert([
      {
        id: userId,
        email: email,
        full_name: full_name,
        role: 'SISWA',
        nomor_induk: nisn // NISN dipakai sebagai nomor induk utama
      }
    ]);

    if (profileError) {
      // Jika gagal, idealnya kita menghapus auth usernya juga (rollback), tapi karena ini prototype:
      return Response.json({ error: 'Gagal membuat profil: ' + profileError.message }, { status: 400 });
    }

    // 3. Buat Detail Siswa
    const { error: detailError } = await supabase.from('sr_student_details').insert([
      {
        profile_id: userId,
        nisn: nisn,
        nis: nis || null,
        class_id: class_id || null,
        gender: gender || null
      }
    ]);

    if (detailError) {
      return Response.json({ error: 'Gagal menyimpan detail siswa: ' + detailError.message }, { status: 400 });
    }

    return Response.json({ success: true, userId: userId });

  } catch (err) {
    return Response.json({ error: 'Terjadi kesalahan server: ' + err.message }, { status: 500 });
  }
}
