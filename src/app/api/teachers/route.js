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
          persistSession: false,
        },
      }
    );

    const body = await request.json();
    const { full_name, email, password, nip, nuptk, gender, birth_date, employment_status, phone } = body;

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

    // 2. Buat Profil Dasar (Role: GURU)
    const { error: profileError } = await supabase.from('sr_profiles').insert([
      {
        id: userId,
        email: email,
        full_name: full_name,
        role: 'GURU',
        nomor_induk: nip
      }
    ]);

    if (profileError) {
      return Response.json({ error: 'Gagal membuat profil: ' + profileError.message }, { status: 400 });
    }

    // 3. Buat Detail Guru
    const { error: detailError } = await supabase.from('sr_teacher_details').insert([
      {
        profile_id: userId,
        nip: nip || null,
        nuptk: nuptk || null,
        gender: gender || null,
        birth_date: birth_date || null,
        employment_status: employment_status || null,
        phone: phone || null
      }
    ]);

    if (detailError) {
      return Response.json({ error: 'Gagal menyimpan detail guru: ' + detailError.message }, { status: 400 });
    }

    return Response.json({ success: true, userId: userId });

  } catch (err) {
    return Response.json({ error: 'Terjadi kesalahan server: ' + err.message }, { status: 500 });
  }
}
