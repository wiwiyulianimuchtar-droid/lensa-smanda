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

    const { data, error } = await supabase.from('sr_subjects').select('*').order('category').order('name');
    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

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
    const { action, id, payload } = body;

    if (!action) {
      return Response.json({ error: 'Missing action parameter' }, { status: 400 });
    }

    let result;
    if (action === 'update') {
      if (!id) {
        return Response.json({ error: 'Missing subject ID for update' }, { status: 400 });
      }
      result = await supabase.from('sr_subjects').update(payload).eq('id', id).select();
    } else if (action === 'delete') {
      if (!id) {
        return Response.json({ error: 'Missing subject ID for delete' }, { status: 400 });
      }
      result = await supabase.from('sr_subjects').delete().eq('id', id).select();
    } else {
      const records = Array.isArray(payload) ? payload : [payload];
      result = await supabase.from('sr_subjects').insert(records).select();
    }

    if (result.error) {
      console.error("Database error in /api/subjects:", result.error);
      return Response.json({ error: result.error.message }, { status: 400 });
    }

    return Response.json({ success: true, data: result.data });
  } catch (err) {
    console.error("Server error in /api/subjects:", err);
    return Response.json({ error: 'Internal Server Error: ' + err.message }, { status: 500 });
  }
}
