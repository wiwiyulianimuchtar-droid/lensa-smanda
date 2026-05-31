import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isServiceKeyAvailable = !!serviceRoleKey;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      isServiceKeyAvailable ? serviceRoleKey : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'profiles') {
      const { data, error } = await supabase
        .from('sr_profiles')
        .select('id, full_name, class_name')
        .eq('role', 'SISWA')
        .order('full_name');
      if (error) throw error;
      return Response.json(data);
    }

    const { data, error } = await supabase.from('sr_student_details').select(`
      *,
      profile:sr_profiles!sr_student_details_profile_id_fkey(full_name, email),
      kelas:sr_classes!sr_student_details_class_id_fkey(name)
    `);
    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// Menggunakan API route agar proses signUp tidak menimpa sesi login Admin di browser
export async function POST(request) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isServiceKeyAvailable = !!serviceRoleKey;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      isServiceKeyAvailable ? serviceRoleKey : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false, // Penting! Agar tidak mengubah sesi lokal
        },
      }
    );

    const body = await request.json();
    const { action, id, full_name, email, password, nisn, nis, gender, class_id } = body;

    if (action === 'update') {
      if (!id) {
        return Response.json({ error: 'Missing student ID for update' }, { status: 400 });
      }

      const sanitizedFullName = String(full_name || '').trim();
      let sanitizedNisn = String(nisn || '').trim();
      if (sanitizedNisn.endsWith('.0')) {
        sanitizedNisn = sanitizedNisn.substring(0, sanitizedNisn.length - 2);
      }
      let sanitizedNis = String(nis || '').trim();
      if (sanitizedNis.endsWith('.0')) {
        sanitizedNis = sanitizedNis.substring(0, sanitizedNis.length - 2);
      }
      let sanitizedGender = String(gender || '').trim().toUpperCase();
      if (sanitizedGender.startsWith('P') || sanitizedGender.includes('PEREMPUAN') || sanitizedGender.includes('FEMALE') || sanitizedGender.includes('WANITA')) {
        sanitizedGender = 'P';
      } else {
        sanitizedGender = 'L';
      }

      const { error: profileError } = await supabase.from('sr_profiles').update({
        full_name: sanitizedFullName,
        nomor_induk: sanitizedNisn
      }).eq('id', id);

      if (profileError) {
        return Response.json({ error: 'Gagal memperbarui profil: ' + profileError.message }, { status: 400 });
      }

      const { error: detailError } = await supabase.from('sr_student_details').update({
        nisn: sanitizedNisn,
        nis: sanitizedNis || null,
        gender: sanitizedGender,
        class_id: class_id || null
      }).eq('profile_id', id);

      if (detailError) {
        return Response.json({ error: 'Gagal memperbarui detail siswa: ' + detailError.message }, { status: 400 });
      }

      return Response.json({ success: true });
    }

    // Sanitasi data input
    const sanitizedFullName = String(full_name || '').trim();
    const sanitizedEmail = String(email || '').trim().toLowerCase();
    const sanitizedPassword = String(password || '').trim();
    
    let sanitizedNisn = String(nisn || '').trim();
    if (sanitizedNisn.endsWith('.0')) {
      sanitizedNisn = sanitizedNisn.substring(0, sanitizedNisn.length - 2);
    }

    let sanitizedNis = String(nis || '').trim();
    if (sanitizedNis.endsWith('.0')) {
      sanitizedNis = sanitizedNis.substring(0, sanitizedNis.length - 2);
    }

    let sanitizedGender = String(gender || '').trim().toUpperCase();
    if (sanitizedGender.startsWith('P') || sanitizedGender.includes('PEREMPUAN') || sanitizedGender.includes('FEMALE') || sanitizedGender.includes('WANITA')) {
      sanitizedGender = 'P';
    } else {
      sanitizedGender = 'L';
    }

    // A. Cek apakah profil sudah ada di database untuk self-healing
    const { data: existingProfile } = await supabase
      .from('sr_profiles')
      .select('id')
      .eq('email', sanitizedEmail)
      .maybeSingle();

    let userId;
    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      // 1. Buat Akun Auth Supabase
      let authData, authError;
      if (isServiceKeyAvailable) {
        const { data, error } = await supabase.auth.admin.createUser({
          email: sanitizedEmail,
          password: sanitizedPassword,
          email_confirm: true,
          user_metadata: {
            full_name: sanitizedFullName,
          }
        });
        authData = data;
        authError = error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password: sanitizedPassword,
          options: {
            data: {
              full_name: sanitizedFullName,
            }
          }
        });
        authData = data;
        authError = error;
      }

      if (authError) {
        // Jika user sudah ada di auth tapi belum ada di sr_profiles, kita cari lagi di database (kasus orphaned auth)
        if (authError.message.toLowerCase().includes('already exists') || authError.status === 400) {
          const { data: checkProfile } = await supabase
            .from('sr_profiles')
            .select('id')
            .eq('email', sanitizedEmail)
            .maybeSingle();
          if (checkProfile) {
            userId = checkProfile.id;
          } else {
            return Response.json({ error: 'Gagal membuat akun auth: ' + authError.message }, { status: 400 });
          }
        } else {
          return Response.json({ error: 'Gagal membuat akun auth: ' + authError.message }, { status: 400 });
        }
      } else {
        userId = authData.user.id;
      }
    }

    // 2. Buat/Update Profil Dasar
    const { error: profileError } = await supabase.from('sr_profiles').upsert([
      {
        id: userId,
        email: sanitizedEmail,
        full_name: sanitizedFullName,
        role: 'SISWA',
        nomor_induk: sanitizedNisn
      }
    ]);

    if (profileError) {
      return Response.json({ error: 'Gagal menyimpan profil: ' + profileError.message }, { status: 400 });
    }

    // 3. Buat/Update Detail Siswa
    const { error: detailError } = await supabase.from('sr_student_details').upsert([
      {
        profile_id: userId,
        nisn: sanitizedNisn,
        nis: sanitizedNis || null,
        class_id: class_id || null,
        gender: sanitizedGender
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
