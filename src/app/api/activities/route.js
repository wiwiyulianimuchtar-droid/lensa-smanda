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

    if (type === 'pending_violations') {
      const { data, error } = await supabase
        .from('sr_activities')
        .select(`
          id,
          student_id,
          teacher_id,
          rule_id,
          description,
          attachment_url,
          status,
          event_date,
          student:student_id (full_name, class_name),
          teacher:teacher_id (full_name),
          rule:rule_id (name, default_point)
        `)
        .eq('type', 'NEGATIF')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return Response.json(data);
    } else if (type === 'all_violations') {
      const { data, error } = await supabase
        .from('sr_activities')
        .select(`
          created_at,
          event_date,
          description,
          status,
          notes,
          student:student_id (full_name, class_name),
          rule:rule_id (name, default_point)
        `)
        .eq('type', 'NEGATIF')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return Response.json(data);
    }

    return Response.json([]);
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

    if (action === 'insert_violation') {
      const { student_id, teacher_id, rule_id, description, event_date, points } = payload;

      // 1. Insert into sr_activities
      const { data: actData, error: actError } = await supabase
        .from('sr_activities')
        .insert([
          {
            student_id,
            teacher_id,
            rule_id,
            type: 'NEGATIF',
            description,
            status: 'APPROVED',
            event_date: new Date(event_date).toISOString(),
            point_override: points
          }
        ])
        .select();

      if (actError) {
        return Response.json({ error: 'Gagal mencatat aktivitas: ' + actError.message }, { status: 400 });
      }

      // 2. Insert into sr_point_ledgers
      const { error: ledgerError } = await supabase
        .from('sr_point_ledgers')
        .insert([
          {
            student_id,
            source_type: 'AKTIVITAS_NEGATIF',
            source_id: actData[0].id,
            delta_point: -points
          }
        ]);

      if (ledgerError) {
        return Response.json({ error: 'Gagal memotong poin: ' + ledgerError.message }, { status: 400 });
      }

      return Response.json({ success: true, data: actData });
    } 
    
    if (action === 'approve_violation') {
      const { id: activityId, student_id, teacher_id, points } = payload;

      // 1. Update status to APPROVED
      const { error: updateErr } = await supabase
        .from('sr_activities')
        .update({ 
          status: 'APPROVED',
          teacher_id
        })
        .eq('id', activityId);

      if (updateErr) {
        return Response.json({ error: 'Gagal memperbarui status: ' + updateErr.message }, { status: 400 });
      }

      // 2. Insert into sr_point_ledgers to deduct the points
      const { error: ledgerError } = await supabase
        .from('sr_point_ledgers')
        .insert([
          {
            student_id,
            source_type: 'AKTIVITAS_NEGATIF',
            source_id: activityId,
            delta_point: -points
          }
        ]);

      if (ledgerError) {
        return Response.json({ error: 'Gagal memotong poin: ' + ledgerError.message }, { status: 400 });
      }

      return Response.json({ success: true });
    }

    if (action === 'reject_violation') {
      // Reject the violation report
      const { error: updateErr } = await supabase
        .from('sr_activities')
        .update({ status: 'REJECTED' })
        .eq('id', id);

      if (updateErr) {
        return Response.json({ error: 'Gagal menolak laporan: ' + updateErr.message }, { status: 400 });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (err) {
    console.error("Server error in /api/activities:", err);
    return Response.json({ error: 'Internal Server Error: ' + err.message }, { status: 500 });
  }
}
