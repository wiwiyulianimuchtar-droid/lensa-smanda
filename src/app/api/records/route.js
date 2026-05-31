import { getAttendanceRecords, saveAttendanceRecord } from '@/lib/dbSim';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const studentId = searchParams.get('student_id');
    const data = await getAttendanceRecords(sessionId, studentId);
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const res = await saveAttendanceRecord(body);
    return Response.json(res);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
