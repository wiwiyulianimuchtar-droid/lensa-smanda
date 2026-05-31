import { getTeacherAssignments, saveTeacherAssignment, deleteTeacherAssignment } from '@/lib/dbSim';

export async function GET() {
  try {
    const data = await getTeacherAssignments();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { teacher_id, assignment_type_ids, details } = body;

    if (Array.isArray(assignment_type_ids)) {
      for (const typeId of assignment_type_ids) {
        try {
          await saveTeacherAssignment({
            teacher_id,
            assignment_type_id: typeId,
            details
          });
        } catch (singleErr) {
          console.warn(`Unique constraint or error assigning type ${typeId}:`, singleErr.message);
        }
      }
    } else {
      await saveTeacherAssignment(body);
    }
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return Response.json({ error: 'ID penugasan harus disertakan' }, { status: 400 });
    }
    await deleteTeacherAssignment(id);
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
