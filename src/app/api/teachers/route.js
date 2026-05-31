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
      const role = searchParams.get('role') || 'GURU';
      const { data, error } = await supabase
        .from('sr_profiles')
        .select('id, full_name')
        .eq('role', role)
        .order('full_name');
      if (error) throw error;
      return Response.json(data);
    }

    if (type === 'all_coaches') {
      const { data, error } = await supabase
        .from('sr_profiles')
        .select('id, full_name')
        .in('role', ['GURU', 'ADMIN'])
        .order('full_name');
      if (error) throw error;
      return Response.json(data);
    }

    const { data, error } = await supabase.from('sr_teacher_details').select(`
      *,
      profile:sr_profiles!sr_teacher_details_profile_id_fkey(full_name, email)
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
          persistSession: false,
        },
      }
    );

    const body = await request.json();
    const { full_name, email, password, nip, nuptk, gender, birth_date, employment_status, phone } = body;

    // Sanitasi data input untuk mencocokkan constraint database
    const sanitizedFullName = String(full_name || '').trim();
    const sanitizedEmail = String(email || '').trim().toLowerCase();
    const sanitizedPassword = String(password || '').trim();
    
    // NIP/NUPTK: hapus spasi dan suffix .0 dari Excel number
    let sanitizedNip = String(nip || '').trim();
    if (sanitizedNip.endsWith('.0')) {
      sanitizedNip = sanitizedNip.substring(0, sanitizedNip.length - 2);
    }
    
    let sanitizedNuptk = String(nuptk || '').trim();
    if (sanitizedNuptk.endsWith('.0')) {
      sanitizedNuptk = sanitizedNuptk.substring(0, sanitizedNuptk.length - 2);
    }

    // Gender: ubah menjadi 'L' atau 'P'
    let sanitizedGender = String(gender || '').trim().toUpperCase();
    if (sanitizedGender.startsWith('P') || sanitizedGender.includes('PEREMPUAN') || sanitizedGender.includes('FEMALE') || sanitizedGender.includes('WANITA')) {
      sanitizedGender = 'P';
    } else {
      sanitizedGender = 'L'; // Default aman
    }

    // Employment Status: cocokkan dengan ('PNS', 'PPPK', 'HONORER', 'GTT')
    let sanitizedStatus = String(employment_status || '').trim().toUpperCase();
    if (sanitizedStatus.includes('PNS')) {
      sanitizedStatus = 'PNS';
    } else if (sanitizedStatus.includes('PPPK') || sanitizedStatus.includes('P3K')) {
      sanitizedStatus = 'PPPK';
    } else if (sanitizedStatus.includes('HONOR')) {
      sanitizedStatus = 'HONORER';
    } else if (sanitizedStatus.includes('GTT')) {
      sanitizedStatus = 'GTT';
    } else {
      sanitizedStatus = 'PNS'; // Default aman
    }

    // Phone: hapus spasi dan suffix .0
    let sanitizedPhone = String(phone || '').trim();
    if (sanitizedPhone.endsWith('.0')) {
      sanitizedPhone = sanitizedPhone.substring(0, sanitizedPhone.length - 2);
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

    // 2. Buat/Update Profil Dasar (Role: GURU)
    const { error: profileError } = await supabase.from('sr_profiles').upsert([
      {
        id: userId,
        email: sanitizedEmail,
        full_name: sanitizedFullName,
        role: 'GURU',
        nomor_induk: sanitizedNip || null
      }
    ]);

    if (profileError) {
      return Response.json({ error: 'Gagal menyimpan profil: ' + profileError.message }, { status: 400 });
    }

    // 3. Buat/Update Detail Guru
    const { error: detailError } = await supabase.from('sr_teacher_details').upsert([
      {
        profile_id: userId,
        nip: sanitizedNip || null,
        nuptk: sanitizedNuptk || null,
        gender: sanitizedGender,
        birth_date: birth_date || null,
        employment_status: sanitizedStatus,
        phone: sanitizedPhone || null
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
