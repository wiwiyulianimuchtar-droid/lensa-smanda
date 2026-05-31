import { getEvents, saveEvent, deleteEvent, getEventTeachers, saveEventTeacher, deleteEventTeacher } from '@/lib/dbSim';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    if (type === 'teachers') {
      const data = await getEventTeachers();
      return Response.json(data);
    }
    
    const data = await getEvents();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const body = await request.json();
    
    if (type === 'teacher') {
      const res = await saveEventTeacher(body);
      return Response.json(res);
    }
    
    const res = await saveEvent(body);
    return Response.json(res);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    
    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 });
    }
    
    if (type === 'teacher') {
      const res = await deleteEventTeacher(id);
      return Response.json(res);
    }
    
    const res = await deleteEvent(id);
    return Response.json(res);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
