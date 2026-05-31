import { getAnnouncements, saveAnnouncement, deleteAnnouncement } from '@/lib/dbSim';

export async function GET() {
  try {
    const data = await getAnnouncements();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    await saveAnnouncement(body);
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
      return Response.json({ error: 'ID pengumuman harus disertakan' }, { status: 400 });
    }
    await deleteAnnouncement(id);
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
