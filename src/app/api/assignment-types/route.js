import { getAssignmentTypes, saveAssignmentType, deleteAssignmentType } from '@/lib/dbSim';

export async function GET() {
  try {
    const data = await getAssignmentTypes();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name } = await request.json();
    if (!name) {
      return Response.json({ error: 'Nama tipe penugasan harus diisi' }, { status: 400 });
    }
    await saveAssignmentType(name);
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
      return Response.json({ error: 'ID harus disertakan' }, { status: 400 });
    }
    await deleteAssignmentType(id);
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
