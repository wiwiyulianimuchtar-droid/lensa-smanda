import { getExams, saveExam, deleteExam, getExamTeachers, saveExamTeacher, deleteExamTeacher } from '@/lib/dbSim';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    if (type === 'teachers') {
      const data = await getExamTeachers();
      return Response.json(data);
    }
    
    const data = await getExams();
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
      const res = await saveExamTeacher(body);
      return Response.json(res);
    }
    
    const res = await saveExam(body);
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
      const res = await deleteExamTeacher(id);
      return Response.json(res);
    }
    
    const res = await deleteExam(id);
    return Response.json(res);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
