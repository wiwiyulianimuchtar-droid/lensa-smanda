import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');

// Pastikan direktori data lokal ada
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const getFilePath = (filename) => path.join(DATA_DIR, filename);

const readLocalFile = (filename, defaultValue = []) => {
  const filePath = getFilePath(filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || JSON.stringify(defaultValue));
  } catch (e) {
    console.error(`Gagal membaca file lokal ${filename}:`, e);
    return defaultValue;
  }
};

const writeLocalFile = (filename, data) => {
  const filePath = getFilePath(filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.error(`Gagal menulis file lokal ${filename}:`, e);
    return false;
  }
};

// ==========================================
// 1. ANNOUNCEMENTS / PENGUMUMAN
// ==========================================
export async function getAnnouncements() {
  try {
    const { data, error } = await supabase
      .from('sr_announcements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error && error.code === 'PGRST205') {
      // Fallback ke lokal
      const list = readLocalFile('announcements.json', [
        {
          id: 'mock-1',
          title: 'Sosialisasi Smart-Report',
          content: 'Uji coba portal Smart-Report berjalan dengan lancar. Presensi & perizinan kini terintegrasi secara daring.',
          category: 'PENGUMUMAN',
          target_audience: 'SEMUA',
          flyer_url: null,
          is_active: true,
          created_at: new Date().toISOString()
        }
      ]);
      return list;
    }
    if (error) throw error;
    
    // Pastikan setiap pengumuman memiliki default target_audience & flyer_url jika kolom di db belum terbuat
    const mappedData = data.map(ann => ({
      ...ann,
      target_audience: ann.target_audience || 'SEMUA',
      flyer_url: ann.flyer_url || null
    }));

    // Gabungkan dengan data lokal jika ada penambahan lokal yang belum masuk ke database remote (misal karena kegagalan kolom skema)
    const localList = readLocalFile('announcements.json');
    const merged = [...mappedData];
    
    localList.forEach(localAnn => {
      const exists = merged.some(dbAnn => dbAnn.id === localAnn.id || (dbAnn.title === localAnn.title && dbAnn.content === localAnn.content));
      if (!exists) {
        merged.unshift(localAnn);
      }
    });

    // Urutkan berdasarkan tanggal dibuat teratas
    merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return merged;
  } catch (e) {
    console.warn("Fallback getAnnouncements ke lokal:", e.message);
    return readLocalFile('announcements.json');
  }
}

export async function saveAnnouncement(announcement) {
  try {
    const payload = {
      title: announcement.title,
      content: announcement.content,
      category: announcement.category || 'PENGUMUMAN',
      target_audience: announcement.target_audience || 'SEMUA',
      flyer_url: announcement.flyer_url || null,
      is_active: announcement.is_active !== undefined ? announcement.is_active : true
    };
    
    let error;
    if (announcement.id && !announcement.id.startsWith('mock-')) {
      const res = await supabase.from('sr_announcements').update(payload).eq('id', announcement.id);
      error = res.error;
    } else if (announcement.id && announcement.id.startsWith('mock-')) {
      // Force fallback if it is a mock ID
      throw { code: 'PGRST205', message: 'Mock ID force fallback' };
    } else {
      const res = await supabase.from('sr_announcements').insert([payload]);
      error = res.error;
    }
    
    if (error && error.code === 'PGRST205') {
      throw error;
    }
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.warn("Fallback saveAnnouncement ke lokal:", e.message);
    const list = readLocalFile('announcements.json');
    if (announcement.id) {
      const idx = list.findIndex(item => item.id === announcement.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...announcement, created_at: list[idx].created_at || new Date().toISOString() };
      }
    } else {
      list.unshift({
        id: `mock-${Date.now()}`,
        ...announcement,
        is_active: true,
        created_at: new Date().toISOString()
      });
    }
    writeLocalFile('announcements.json', list);
    return { success: true };
  }
}

export async function deleteAnnouncement(id) {
  try {
    if (id.startsWith('mock-')) throw { code: 'PGRST205' };
    const { error } = await supabase.from('sr_announcements').delete().eq('id', id);
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.warn("Fallback deleteAnnouncement ke lokal:", e.message);
    const list = readLocalFile('announcements.json');
    const filtered = list.filter(item => item.id !== id);
    writeLocalFile('announcements.json', filtered);
    return { success: true };
  }
}

// ==========================================
// 2. PERMISSIONS / PERIZINAN SISWA
// ==========================================
export async function getPermissions(studentId = null) {
  try {
    let query = supabase.from('sr_permissions').select(`
      *,
      student:student_id (full_name, class_name)
    `).order('created_at', { ascending: false });
    
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    
    const { data, error } = await query;
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("Fallback getPermissions ke lokal:", e.message);
    let list = readLocalFile('permissions.json');
    if (studentId) {
      list = list.filter(item => item.student_id === studentId);
    }
    return list;
  }
}

export async function savePermission(permission) {
  try {
    const payload = {
      student_id: permission.student_id,
      tipe: permission.tipe,
      alasan: permission.alasan,
      waktu: permission.waktu,
      status: permission.status || 'PENDING',
      approver_id: permission.approver_id || null
    };

    let error;
    if (permission.id && !permission.id.startsWith('mock-')) {
      const res = await supabase.from('sr_permissions').update(payload).eq('id', permission.id);
      error = res.error;
    } else if (permission.id && permission.id.startsWith('mock-')) {
      throw { code: 'PGRST205' };
    } else {
      const res = await supabase.from('sr_permissions').insert([payload]);
      error = res.error;
    }

    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.warn("Fallback savePermission ke lokal:", e.message);
    const list = readLocalFile('permissions.json');
    
    // Cari nama siswa dari profiles untuk tampilan lokal yang rapi
    let studentInfo = { full_name: 'Siswa', class_name: '-' };
    try {
      const { data } = await supabase.from('sr_profiles').select('full_name, class_name').eq('id', permission.student_id).single();
      if (data) studentInfo = data;
    } catch (err) {}

    if (permission.id) {
      const idx = list.findIndex(item => item.id === permission.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...permission, student: studentInfo };
      }
    } else {
      list.unshift({
        id: `mock-${Date.now()}`,
        ...permission,
        status: permission.status || 'PENDING',
        student: studentInfo,
        created_at: new Date().toISOString()
      });
    }
    writeLocalFile('permissions.json', list);
    return { success: true };
  }
}

// ==========================================
// 3. ASSIGNMENT TYPES & TEACHER ASSIGNMENTS
// ==========================================
const DEFAULT_TYPES = [
  { id: 'type-1', name: 'Guru Wali Kelas' },
  { id: 'type-2', name: 'Guru Piket KBM' },
  { id: 'type-3', name: 'Guru Piket UKS' },
  { id: 'type-4', name: 'Guru Pembina Ekskul' },
  { id: 'type-5', name: 'Guru Wali' }
];

export async function getAssignmentTypes() {
  try {
    const { data, error } = await supabase.from('sr_assignment_types').select('*').order('name');
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("Fallback getAssignmentTypes ke lokal:", e.message);
    return readLocalFile('assignment_types.json', DEFAULT_TYPES);
  }
}

export async function saveAssignmentType(name) {
  try {
    const { error } = await supabase.from('sr_assignment_types').insert([{ name }]);
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.warn("Fallback saveAssignmentType ke lokal:", e.message);
    const list = readLocalFile('assignment_types.json', DEFAULT_TYPES);
    if (!list.some(item => item.name.toLowerCase() === name.toLowerCase())) {
      list.push({
        id: `type-${Date.now()}`,
        name
      });
      writeLocalFile('assignment_types.json', list);
    }
    return { success: true };
  }
}

export async function deleteAssignmentType(id) {
  try {
    if (id.startsWith('type-')) throw { code: 'PGRST205' };
    const { error } = await supabase.from('sr_assignment_types').delete().eq('id', id);
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.warn("Fallback deleteAssignmentType ke lokal:", e.message);
    const list = readLocalFile('assignment_types.json', DEFAULT_TYPES);
    const filtered = list.filter(item => item.id !== id);
    writeLocalFile('assignment_types.json', filtered);
    return { success: true };
  }
}

export async function getTeacherAssignments() {
  try {
    const { data, error } = await supabase.from('sr_teacher_assignments').select(`
      *,
      teacher:teacher_id (full_name, email),
      type:assignment_type_id (name)
    `);
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("Fallback getTeacherAssignments ke lokal:", e.message);
    return readLocalFile('teacher_assignments.json');
  }
}

export async function saveTeacherAssignment(assignment) {
  try {
    const payload = {
      teacher_id: assignment.teacher_id,
      assignment_type_id: assignment.assignment_type_id,
      details: assignment.details || ''
    };

    let error;
    if (assignment.id && !assignment.id.startsWith('mock-')) {
      const res = await supabase.from('sr_teacher_assignments').update(payload).eq('id', assignment.id);
      error = res.error;
    } else if (assignment.id && assignment.id.startsWith('mock-')) {
      throw { code: 'PGRST205' };
    } else {
      const res = await supabase.from('sr_teacher_assignments').insert([payload]);
      error = res.error;
    }

    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.warn("Fallback saveTeacherAssignment ke lokal:", e.message);
    const list = readLocalFile('teacher_assignments.json');

    // Ambil info pendukung untuk JSON local
    let teacherInfo = { full_name: 'Guru', email: '' };
    try {
      const { data } = await supabase.from('sr_profiles').select('full_name, email').eq('id', assignment.teacher_id).single();
      if (data) teacherInfo = data;
    } catch (err) {}

    const types = await getAssignmentTypes();
    const typeObj = types.find(t => t.id === assignment.assignment_type_id) || { name: 'Tugas' };

    if (assignment.id) {
      const idx = list.findIndex(item => item.id === assignment.id);
      if (idx !== -1) {
        list[idx] = { 
          ...list[idx], 
          ...assignment, 
          teacher: teacherInfo, 
          type: { name: typeObj.name } 
        };
      }
    } else {
      list.push({
        id: `mock-${Date.now()}`,
        ...assignment,
        teacher: teacherInfo,
        type: { name: typeObj.name },
        created_at: new Date().toISOString()
      });
    }
    writeLocalFile('teacher_assignments.json', list);
    return { success: true };
  }
}

export async function deleteTeacherAssignment(id) {
  try {
    if (id.startsWith('mock-')) throw { code: 'PGRST205' };
    const { error } = await supabase.from('sr_teacher_assignments').delete().eq('id', id);
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.warn("Fallback deleteTeacherAssignment ke lokal:", e.message);
    const list = readLocalFile('teacher_assignments.json');
    const filtered = list.filter(item => item.id !== id);
    writeLocalFile('teacher_assignments.json', filtered);
    return { success: true };
  }
}

// ==========================================
// 4. TEMP PASSWORDS MANAGEMENT (VIEW & RESET)
// ==========================================
export async function getTempPasswords() {
  try {
    // Coba baca dari DB
    const { data, error } = await supabase.from('sr_profiles').select('id, temp_password');
    if (error || !data || data.every(item => item.temp_password === undefined)) {
      throw new Error("Tabel profiles tidak memiliki kolom temp_password");
    }
    // Gabungkan dengan file lokal jika ada
    const localMap = readLocalFile('temp_passwords.json', {});
    const dbMap = {};
    data.forEach(item => {
      if (item.temp_password) dbMap[item.id] = item.temp_password;
    });
    return { ...localMap, ...dbMap };
  } catch (e) {
    return readLocalFile('temp_passwords.json', {});
  }
}

export async function saveTempPassword(userId, password) {
  // Simpan ke file lokal dulu
  const localMap = readLocalFile('temp_passwords.json', {});
  localMap[userId] = password;
  writeLocalFile('temp_passwords.json', localMap);

  // Coba simpan ke DB
  try {
    await supabase.from('sr_profiles').update({ temp_password: password }).eq('id', userId);
  } catch (e) {
    console.warn("Tidak dapat menyimpan temp_password ke Supabase:", e.message);
  }
  return { success: true };
}

// ==========================================
// 5. EVENTS / KEGIATAN & GURU PENANGGUNG JAWAB
// ==========================================
export async function getEvents() {
  try {
    const { data, error } = await supabase.from('sr_events').select('*').order('event_date', { ascending: false });
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("Fallback getEvents ke lokal:", e.message);
    return readLocalFile('events.json');
  }
}

export async function saveEvent(event) {
  try {
    const payload = {
      name: event.name,
      event_date: event.event_date,
      end_date: event.end_date || null
    };
    let error;
    if (event.id && !event.id.startsWith('mock-')) {
      const res = await supabase.from('sr_events').update(payload).eq('id', event.id);
      error = res.error;
    } else if (event.id && event.id.startsWith('mock-')) {
      throw { code: 'PGRST205' };
    } else {
      const res = await supabase.from('sr_events').insert([payload]).select();
      error = res.error;
      if (!error && res.data && res.data[0]) {
        return { success: true, id: res.data[0].id };
      }
    }
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return { success: true, id: event.id };
  } catch (e) {
    console.warn("Fallback saveEvent ke lokal:", e.message);
    const list = readLocalFile('events.json');
    const id = event.id || `mock-event-${Date.now()}`;
    const newEvent = { ...event, id, created_at: new Date().toISOString() };
    if (event.id) {
      const idx = list.findIndex(item => item.id === event.id);
      if (idx !== -1) list[idx] = newEvent;
    } else {
      list.unshift(newEvent);
    }
    writeLocalFile('events.json', list);
    return { success: true, id };
  }
}

export async function deleteEvent(id) {
  try {
    if (id.startsWith('mock-')) throw { code: 'PGRST205' };
    const { error } = await supabase.from('sr_events').delete().eq('id', id);
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.warn("Fallback deleteEvent ke lokal:", e.message);
    const list = readLocalFile('events.json');
    const filtered = list.filter(item => item.id !== id);
    writeLocalFile('events.json', filtered);
    
    // Hapus juga penugasan guru terkait
    const teachersList = readLocalFile('event_teachers.json');
    const filteredTeachers = teachersList.filter(item => item.event_id !== id);
    writeLocalFile('event_teachers.json', filteredTeachers);
    return { success: true };
  }
}

export async function getEventTeachers() {
  try {
    const { data, error } = await supabase.from('sr_event_teachers').select(`
      *,
      teacher:teacher_id (full_name, email),
      event:event_id (name, event_date, end_date)
    `);
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("Fallback getEventTeachers ke lokal:", e.message);
    return readLocalFile('event_teachers.json');
  }
}

export async function saveEventTeacher(rel) {
  try {
    const payload = {
      event_id: rel.event_id,
      teacher_id: rel.teacher_id
    };
    let error;
    if (rel.id && !rel.id.startsWith('mock-')) {
      const res = await supabase.from('sr_event_teachers').update(payload).eq('id', rel.id);
      error = res.error;
    } else if (rel.id && rel.id.startsWith('mock-')) {
      throw { code: 'PGRST205' };
    } else {
      const res = await supabase.from('sr_event_teachers').insert([payload]);
      error = res.error;
    }
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.warn("Fallback saveEventTeacher ke lokal:", e.message);
    const list = readLocalFile('event_teachers.json');
    
    // Ambil detail pendukung
    let teacherInfo = { full_name: 'Guru', email: '' };
    try {
      const { data } = await supabase.from('sr_profiles').select('full_name, email').eq('id', rel.teacher_id).single();
      if (data) teacherInfo = data;
    } catch (err) {}

    const events = await getEvents();
    const eventObj = events.find(ev => ev.id === rel.event_id) || { name: 'Kegiatan', event_date: '' };

    if (rel.id) {
      const idx = list.findIndex(item => item.id === rel.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...rel, teacher: teacherInfo, event: eventObj };
      }
    } else {
      list.push({
        id: `mock-et-${Date.now()}`,
        ...rel,
        teacher: teacherInfo,
        event: eventObj,
        created_at: new Date().toISOString()
      });
    }
    writeLocalFile('event_teachers.json', list);
    return { success: true };
  }
}

export async function deleteEventTeacher(id) {
  try {
    if (id.startsWith('mock-')) throw { code: 'PGRST205' };
    const { error } = await supabase.from('sr_event_teachers').delete().eq('id', id);
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.warn("Fallback deleteEventTeacher ke lokal:", e.message);
    const list = readLocalFile('event_teachers.json');
    const filtered = list.filter(item => item.id !== id);
    writeLocalFile('event_teachers.json', filtered);
    return { success: true };
  }
}

// ==========================================
// 6. EXAMS / UJIAN & GURU PENGAWAS
// ==========================================
export async function getExams() {
  try {
    const { data, error } = await supabase.from('sr_exams').select('*').order('start_date', { ascending: false });
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("Fallback getExams ke lokal:", e.message);
    return readLocalFile('exams.json');
  }
}

export async function saveExam(exam) {
  try {
    const payload = {
      name: exam.name,
      start_date: exam.start_date,
      end_date: exam.end_date
    };
    let error;
    if (exam.id && !exam.id.startsWith('mock-')) {
      const res = await supabase.from('sr_exams').update(payload).eq('id', exam.id);
      error = res.error;
    } else if (exam.id && exam.id.startsWith('mock-')) {
      throw { code: 'PGRST205' };
    } else {
      const res = await supabase.from('sr_exams').insert([payload]).select();
      error = res.error;
      if (!error && res.data && res.data[0]) {
        return { success: true, id: res.data[0].id };
      }
    }
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return { success: true, id: exam.id };
  } catch (e) {
    console.warn("Fallback saveExam ke lokal:", e.message);
    const list = readLocalFile('exams.json');
    const id = exam.id || `mock-exam-${Date.now()}`;
    const newExam = { ...exam, id, created_at: new Date().toISOString() };
    if (exam.id) {
      const idx = list.findIndex(item => item.id === exam.id);
      if (idx !== -1) list[idx] = newExam;
    } else {
      list.unshift(newExam);
    }
    writeLocalFile('exams.json', list);
    return { success: true, id };
  }
}

export async function deleteExam(id) {
  try {
    if (id.startsWith('mock-')) throw { code: 'PGRST205' };
    const { error } = await supabase.from('sr_exams').delete().eq('id', id);
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.warn("Fallback deleteExam ke lokal:", e.message);
    const list = readLocalFile('exams.json');
    const filtered = list.filter(item => item.id !== id);
    writeLocalFile('exams.json', filtered);
    
    // Hapus juga penugasan pengawas terkait
    const teachersList = readLocalFile('exam_teachers.json');
    const filteredTeachers = teachersList.filter(item => item.exam_id !== id);
    writeLocalFile('exam_teachers.json', filteredTeachers);
    return { success: true };
  }
}

export async function getExamTeachers() {
  try {
    const { data, error } = await supabase.from('sr_exam_teachers').select(`
      *,
      teacher:teacher_id (full_name, email),
      exam:exam_id (name, start_date, end_date)
    `);
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("Fallback getExamTeachers ke lokal:", e.message);
    return readLocalFile('exam_teachers.json');
  }
}

export async function saveExamTeacher(rel) {
  try {
    const payload = {
      exam_id: rel.exam_id,
      teacher_id: rel.teacher_id
    };
    let error;
    if (rel.id && !rel.id.startsWith('mock-')) {
      const res = await supabase.from('sr_exam_teachers').update(payload).eq('id', rel.id);
      error = res.error;
    } else if (rel.id && rel.id.startsWith('mock-')) {
      throw { code: 'PGRST205' };
    } else {
      const res = await supabase.from('sr_exam_teachers').insert([payload]);
      error = res.error;
    }
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.warn("Fallback saveExamTeacher ke lokal:", e.message);
    const list = readLocalFile('exam_teachers.json');
    
    // Ambil detail pendukung
    let teacherInfo = { full_name: 'Guru', email: '' };
    try {
      const { data } = await supabase.from('sr_profiles').select('full_name, email').eq('id', rel.teacher_id).single();
      if (data) teacherInfo = data;
    } catch (err) {}

    const exams = await getExams();
    const examObj = exams.find(ex => ex.id === rel.exam_id) || { name: 'Ujian', start_date: '', end_date: '' };

    if (rel.id) {
      const idx = list.findIndex(item => item.id === rel.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...rel, teacher: teacherInfo, exam: examObj };
      }
    } else {
      list.push({
        id: `mock-xt-${Date.now()}`,
        ...rel,
        teacher: teacherInfo,
        exam: examObj,
        created_at: new Date().toISOString()
      });
    }
    writeLocalFile('exam_teachers.json', list);
    return { success: true };
  }
}

export async function deleteExamTeacher(id) {
  try {
    if (id.startsWith('mock-')) throw { code: 'PGRST205' };
    const { error } = await supabase.from('sr_exam_teachers').delete().eq('id', id);
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.warn("Fallback deleteExamTeacher ke lokal:", e.message);
    const list = readLocalFile('exam_teachers.json');
    const filtered = list.filter(item => item.id !== id);
    writeLocalFile('exam_teachers.json', filtered);
    return { success: true };
  }
}

// ==========================================
// 7. ATTENDANCE SESSIONS & RECORDS
// ==========================================
export async function getSessions(teacherId = null) {
  try {
    let query = supabase.from('sr_attendance_sessions').select('*');
    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("Fallback getSessions ke lokal:", e.message);
    let list = readLocalFile('sessions.json');
    if (teacherId) {
      list = list.filter(s => s.teacher_id === teacherId);
    }
    return list;
  }
}

export async function saveSession(session) {
  try {
    const payload = {
      teacher_id: session.teacher_id,
      session_type: session.session_type,
      target_class: session.target_class,
      start_time: session.start_time,
      end_time: session.end_time,
      qr_token: session.qr_token,
      title: session.title || null,
      subject_id: session.subject_id || null,
      event_id: session.event_id || null,
      exam_id: session.exam_id || null,
      extracurricular_id: session.extracurricular_id || null,
      jam_ke: session.jam_ke || null
    };

    let error;
    let data;
    if (session.id && !session.id.startsWith('mock-')) {
      const res = await supabase.from('sr_attendance_sessions').update(payload).eq('id', session.id).select();
      error = res.error;
      data = res.data;
    } else if (session.id && session.id.startsWith('mock-')) {
      throw { code: 'PGRST205' };
    } else {
      const res = await supabase.from('sr_attendance_sessions').insert([payload]).select();
      error = res.error;
      data = res.data;
    }

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (e) {
    console.warn("Fallback saveSession ke lokal:", e.message);
    const list = readLocalFile('sessions.json');
    const id = session.id || `mock-session-${Date.now()}`;
    const newSession = {
      ...session,
      id,
      created_at: session.created_at || new Date().toISOString()
    };
    if (session.id) {
      const idx = list.findIndex(s => s.id === session.id);
      if (idx !== -1) list[idx] = newSession;
    } else {
      list.unshift(newSession);
    }
    writeLocalFile('sessions.json', list);
    return { success: true, data: newSession };
  }
}

export async function getAttendanceRecords(sessionId = null, studentId = null) {
  try {
    let query = supabase.from('sr_attendance_records').select(`
      *,
      student:student_id (full_name, class_name)
    `);
    if (sessionId) query = query.eq('session_id', sessionId);
    if (studentId) query = query.eq('student_id', studentId);
    
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error && error.code === 'PGRST205') throw error;
    if (error) throw error;
    return data;
  } catch (e) {
    console.warn("Fallback getAttendanceRecords ke lokal:", e.message);
    let list = readLocalFile('attendance_records.json');
    if (sessionId) list = list.filter(r => r.session_id === sessionId);
    if (studentId) list = list.filter(r => r.student_id === studentId);
    return list;
  }
}

export async function saveAttendanceRecord(record) {
  try {
    const payload = {
      session_id: record.session_id,
      student_id: record.student_id,
      status: record.status,
      latitude: record.latitude || null,
      longitude: record.longitude || null,
      reason: record.reason || null
    };

    let error;
    if (record.id && !record.id.startsWith('mock-')) {
      const res = await supabase.from('sr_attendance_records').update(payload).eq('id', record.id);
      error = res.error;
    } else if (record.id && record.id.startsWith('mock-')) {
      throw { code: 'PGRST205' };
    } else {
      const res = await supabase.from('sr_attendance_records').insert([payload]);
      error = res.error;
    }

    if (error) throw error;
    return { success: true };
  } catch (e) {
    console.warn("Fallback saveAttendanceRecord ke lokal:", e.message);
    const list = readLocalFile('attendance_records.json');
    
    // Ambil detail student
    let studentInfo = { full_name: 'Siswa', class_name: '-' };
    try {
      const { data } = await supabase.from('sr_profiles').select('full_name, class_name').eq('id', record.student_id).single();
      if (data) studentInfo = data;
    } catch (err) {}

    const id = record.id || `mock-record-${Date.now()}`;
    const newRecord = {
      ...record,
      id,
      student: studentInfo,
      created_at: record.created_at || new Date().toISOString()
    };

    // Hapus duplikat
    const filteredList = list.filter(r => !(r.session_id === record.session_id && r.student_id === record.student_id));
    filteredList.unshift(newRecord);
    writeLocalFile('attendance_records.json', filteredList);
    return { success: true };
  }
}
