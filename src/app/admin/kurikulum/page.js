"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, X, Users, BookOpen, GraduationCap, Clock, Award, ShieldAlert, Check, AlertCircle, FileSpreadsheet, Download, Calendar, FileText } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { exportToExcel, readExcel, downloadTemplateExcel } from '@/lib/excelHelper';

export default function KurikulumMaster() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('guru'); // 'guru', 'kelas', 'mapel', 'tugas_tambahan', 'presensi_kbm'
  const isReadOnly = profile?.is_kepsek;

  useEffect(() => {
    if (!authLoading) {
      if (!profile || (
        profile.role !== 'ADMIN' && 
        !profile.is_kepsek && 
        !(profile.role === 'GURU' && profile.is_manajemen && profile.manajemen_role === 'KURIKULUM')
      )) {
        router.replace('/admin');
      }
    }
  }, [profile, authLoading, router]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data States
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]); // for Wali Kelas dropdown
  
  // Tugas Tambahan States
  const [assignments, setAssignments] = useState([]);
  const [assignmentTypes, setAssignmentTypes] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]); // list of profile GURU

  // Kegiatan & Ujian States
  const [events, setEvents] = useState([]);
  const [eventTeachers, setEventTeachers] = useState([]);
  const [exams, setExams] = useState([]);
  const [examTeachers, setExamTeachers] = useState([]);

  // Modals for Kegiatan & Ujian
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEventTeacherModal, setShowEventTeacherModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showExamTeacherModal, setShowExamTeacherModal] = useState(false);

  // Form States for Kegiatan & Ujian
  const [eventForm, setEventForm] = useState({ name: '', event_date: '', end_date: '' });
  const [eventTeacherForm, setEventTeacherForm] = useState({ event_id: '', teacher_id: '' });
  const [examForm, setExamForm] = useState({ name: '', start_date: '', end_date: '' });
  const [examTeacherForm, setExamTeacherForm] = useState({ exam_id: '', teacher_id: '' });

  // Multi-select teacher assignment helper states & functions
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [modalSearchQuery, setModalSearchQuery] = useState('');

  const handleTeacherToggle = (teacherId) => {
    setSelectedTeacherIds(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId) 
        : [...prev, teacherId]
    );
  };

  const handleEventChange = (eventId) => {
    setEventTeacherForm({ ...eventTeacherForm, event_id: eventId });
    if (eventId) {
      const currentlyAssigned = eventTeachers
        .filter(et => et.event_id === eventId)
        .map(et => et.teacher_id);
      setSelectedTeacherIds(currentlyAssigned);
    } else {
      setSelectedTeacherIds([]);
    }
  };

  const handleExamChange = (examId) => {
    setExamTeacherForm({ ...examTeacherForm, exam_id: examId });
    if (examId) {
      const currentlyAssigned = examTeachers
        .filter(xt => xt.exam_id === examId)
        .map(xt => xt.teacher_id);
      setSelectedTeacherIds(currentlyAssigned);
    } else {
      setSelectedTeacherIds([]);
    }
  };

  // Presensi KBM States
  const [attendanceConfigs, setAttendanceConfigs] = useState([
    { id: 1, name: 'Presensi Harian Masuk', start: '06:30', end: '07:15', type: 'HARIAN' },
    { id: 2, name: 'Presensi Harian Pulang', start: '15:00', end: '16:30', type: 'HARIAN' },
    { id: 3, name: 'Sesi Mapel KBM', start: 'Flexible', end: 'Flexible', type: 'MAPEL' },
    { id: 4, name: 'Presensi Sholat Dhuha', start: '08:00', end: '09:00', type: 'INSIDENTAL' },
    { id: 5, name: 'Presensi Ujian Semester', start: '07:30', end: '12:00', type: 'UJIAN' }
  ]);
  const [teacherClassPresence, setTeacherClassPresence] = useState([
    { class: 'X MIPA 1', teacher: 'Wiwi Yuliani, S.T.', subject: 'Fisika', time: '07:15 WIB', status: 'HADIR' },
    { class: 'X MIPA 2', teacher: 'Hanifah Ratih Pratiwi, S.Pd', subject: 'Kimia', time: '08:00 WIB', status: 'HADIR' },
    { class: 'XI IPS 1', teacher: 'Rodhia Izzati, S.Pd., Gr.', subject: 'Sosiologi', time: '--:--', status: 'BELUM_HADIR' },
    { class: 'XII MIPA 1', teacher: 'Asep Suryanto, M.Pd.', subject: 'Matematika', time: '07:05 WIB', status: 'HADIR' }
  ]);
  
  // Modal States
  const [showGuruModal, setShowGuruModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  // Form States
  const [editingId, setEditingId] = useState(null);
  const [guruForm, setGuruForm] = useState({ full_name: '', email: '', nip: '', nuptk: '', gender: 'L', birth_date: '', employment_status: 'PNS', phone: '' });
  const [classForm, setClassForm] = useState({ name: '', grade_level: 'X', major: 'MIPA', homeroom_teacher_id: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', code: '', category: 'WAJIB' });
  const [assignmentForm, setAssignmentForm] = useState({ teacher_id: '', assignment_type_ids: [], details: '' });
  const [configForm, setConfigForm] = useState({ name: '', start: '07:00', end: '08:00', type: 'HARIAN' });
  const [typeForm, setTypeForm] = useState({ name: '' });
  const [importProgress, setImportProgress] = useState(null); // { current: 0, total: 0, status: '' }

  const handleExportGuru = () => {
    const exportData = teachers.map(t => ({
      'Nama Lengkap': t.profile?.full_name || '',
      'Email': t.profile?.email || '',
      'NIP': t.nip || '',
      'NUPTK': t.nuptk || '',
      'JK': t.gender || '',
      'Tanggal Lahir': t.birth_date || '',
      'Status': t.employment_status || '',
      'No. WhatsApp': t.phone || ''
    }));
    exportToExcel(exportData, `Daftar_Guru_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportGuru = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = await readExcel(file);
      if (json.length === 0) {
        alert("File Excel kosong atau tidak terbaca.");
        return;
      }
      
      // Bersihkan spasi pada header kolom Excel
      const normalizedJson = json.map(r => {
        const newRow = {};
        Object.keys(r).forEach(k => {
          newRow[k.trim()] = r[k];
        });
        return newRow;
      });

      if (!confirm(`Apakah Anda yakin ingin mengimpor ${normalizedJson.length} data Guru dari Excel?`)) return;
      
      setImportProgress({ current: 0, total: normalizedJson.length, status: 'Memulai impor data Guru...' });
      
      let successCount = 0;
      let failCount = 0;
      const failures = [];
      let currentIdx = 0;

      for (const row of normalizedJson) {
        currentIdx++;
        const full_name = row.full_name || row['Nama Lengkap'] || row['Nama'] || '';
        let nip = row.nip || row['NIP'] || '';
        const nuptk = row.nuptk || row['NUPTK'] || '';
        const gender = row.gender || row['JK'] || row['Jenis Kelamin'] || 'L';
        const birth_date = row.birth_date || row['Tanggal Lahir'] || '';
        const employment_status = row.employment_status || row['Status'] || row['Status Kerja'] || 'PNS';
        const phone = row.phone || row['No. WhatsApp'] || row['Telepon'] || '';

        const cleanFullName = String(full_name).trim();
        let cleanEmail = String(row.email || row['Email'] || '').trim();
        let cleanNip = String(nip).trim();

        // Menangani guru honorer / baru yang tidak memiliki NIP
        if (!cleanEmail) {
          const nameSlug = cleanFullName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const randomSuffix = Math.floor(100 + Math.random() * 900); // 3 digit unik
          const generatedUsername = nameSlug ? `${nameSlug}${randomSuffix}` : `guru${Math.floor(1000 + Math.random() * 9000)}`;
          cleanEmail = `${generatedUsername}@lensa.smanda.id`;
          
          if (!cleanNip) {
            cleanNip = generatedUsername; // Set NIP ke generatedUsername agar bisa digunakan login
            nip = generatedUsername;
          }
        }

        if (!cleanFullName || !cleanEmail) {
          console.warn("Nama Lengkap wajib diisi.", row);
          failCount++;
          failures.push(`Baris #${currentIdx}: Nama Lengkap kosong.`);
          continue;
        }

        let autoPassword = cleanNip;
        if (autoPassword.length < 6) {
          autoPassword = autoPassword.padEnd(6, '1');
        }
        
        try {
          const res = await fetch('/api/teachers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: cleanFullName,
              email: cleanEmail,
              password: autoPassword,
              nip,
              nuptk,
              gender,
              birth_date,
              employment_status,
              phone
            })
          });
          
          if (res.ok) {
            const data = await res.json();
            await fetch('/api/reset-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: data.userId, password: autoPassword })
            });
            successCount++;
          } else {
            const errData = await res.json();
            failCount++;
            failures.push(`${cleanFullName} (NIP: ${nip}): ${errData.error || 'Gagal menyimpan'}`);
          }
        } catch (err) {
          console.error("Gagal impor row:", err);
          failCount++;
          failures.push(`${cleanFullName} (NIP: ${nip}): ${err.message}`);
        }
        
        setImportProgress(prev => ({ ...prev, current: currentIdx, status: `Mengimpor: ${cleanFullName}` }));
      }
      
      setImportProgress(null);
      if (failCount > 0) {
        alert(`Impor selesai!\nBerhasil: ${successCount} Guru\nGagal: ${failCount} Guru\n\nDetail kegagalan:\n${failures.slice(0, 10).join('\n')}${failures.length > 10 ? '\n...dan lainnya' : ''}`);
      } else {
        alert(`Impor selesai! Berhasil menyimpan ${successCount} data Guru.`);
      }
      fetchData();
    } catch (err) {
      setImportProgress(null);
      alert("Gagal membaca Excel: " + err.message);
    }
    e.target.value = '';
  };

  const handleExportMapel = () => {
    const exportData = subjects.map(s => ({
      'Kode Mapel': s.code || '',
      'Nama Mata Pelajaran': s.name || '',
      'Kategori': s.category || ''
    }));
    exportToExcel(exportData, `Daftar_Mapel_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportMapel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = await readExcel(file);
      if (json.length === 0) {
        alert("File Excel kosong.");
        return;
      }
      if (!confirm(`Apakah Anda yakin ingin mengimpor ${json.length} data Mata Pelajaran secara langsung ke database?`)) return;

      setImportProgress({ current: 0, total: json.length, status: 'Mengimpor Mata Pelajaran...' });
      
      const records = json.map(row => ({
        code: row.code || row['Kode Mapel'] || row['Kode'] || '',
        name: row.name || row['Nama Mata Pelajaran'] || row['Nama'] || '',
        category: (row.category || row['Kategori'] || 'WAJIB').toUpperCase()
      })).filter(r => r.code && r.name);

      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert',
          payload: records
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan mata pelajaran');

      setImportProgress(null);
      alert(`Berhasil mengimpor ${records.length} Mata Pelajaran!`);
      fetchData();
    } catch (err) {
      setImportProgress(null);
      alert("Gagal impor mapel: " + err.message);
    }
    e.target.value = '';
  };

  const handleExportKelas = () => {
    const exportData = classes.map(c => ({
      'Tingkat': c.grade_level || '',
      'Nama Kelas': c.name || '',
      'Jurusan': c.major || '',
      'Wali Kelas': c.wali_kelas?.full_name || 'Belum diatur'
    }));
    exportToExcel(exportData, `Daftar_Kelas_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportKelas = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = await readExcel(file);
      if (json.length === 0) {
        alert("File Excel kosong.");
        return;
      }
      if (!confirm(`Yakin ingin mengimpor ${json.length} data Kelas dari Excel?`)) return;

      setImportProgress({ current: 0, total: json.length, status: 'Mengimpor data Kelas...' });

      let count = 0;
      for (const row of json) {
        const name = row.name || row['Nama Kelas'] || row['Nama'] || '';
        const grade_level = row.grade_level || row['Tingkat'] || 'X';
        const major = row.major || row['Jurusan'] || 'MIPA';
        const homeroom_teacher = row.homeroom_teacher || row['Wali Kelas'] || '';

        if (!name) continue;

        let homeroom_teacher_id = null;
        if (homeroom_teacher) {
          const matched = users.find(u => u.full_name?.toLowerCase().trim() === homeroom_teacher.toLowerCase().trim());
          if (matched) homeroom_teacher_id = matched.id;
        }

        const payload = { name, grade_level, major, homeroom_teacher_id };
        try {
          const res = await fetch('/api/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'insert',
              payload
            })
          });
          if (!res.ok) {
            const err = await res.json();
            console.error("Gagal impor kelas:", err.error);
          }
        } catch (err) {
          console.error("Exception saat impor kelas:", err);
        }

        count++;
        setImportProgress(prev => ({ ...prev, current: count, status: `Mengimpor kelas: ${name}` }));
      }

      setImportProgress(null);
      alert(`Berhasil memproses ${count} data Kelas.`);
      fetchData();
    } catch (err) {
      setImportProgress(null);
      alert("Gagal impor kelas: " + err.message);
    }
    e.target.value = '';
  };

  const handleExportAssignments = () => {
    const exportData = assignments.map(a => ({
      'Nama Lengkap': a.teacher?.full_name || '',
      'Email': a.teacher?.email || '',
      'Jenis Tugas': a.type?.name || '',
      'Keterangan / Detail': a.details || ''
    }));
    exportToExcel(exportData, `Tugas_Tambahan_Guru_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportAssignments = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = await readExcel(file);
      if (json.length === 0) {
        alert("File Excel kosong.");
        return;
      }
      if (!confirm(`Yakin ingin mengimpor ${json.length} penugasan guru dari Excel?`)) return;

      setImportProgress({ current: 0, total: json.length, status: 'Mengimpor Tugas Tambahan...' });

      let teachersList = allTeachers;
      if (teachersList.length === 0) {
        const { data } = await supabase.from('sr_profiles').select('id, full_name').eq('role', 'GURU');
        if (data) teachersList = data;
      }

      let count = 0;
      for (const row of json) {
        const teacher_name = row.teacher_name || row['Nama Lengkap'] || row['Guru'] || '';
        const assignment_type = row.assignment_type || row['Jenis Tugas'] || '';
        const details = row.details || row['Keterangan / Detail'] || '';

        if (!teacher_name || !assignment_type) continue;

        const matchedTeacher = teachersList.find(t => t.full_name?.toLowerCase().trim() === teacher_name.toLowerCase().trim());
        const matchedType = assignmentTypes.find(at => at.name?.toLowerCase().trim() === assignment_type.toLowerCase().trim());

        if (!matchedTeacher) {
          console.warn(`Guru tidak ditemukan: ${teacher_name}`);
          continue;
        }
        if (!matchedType) {
          console.warn(`Jenis tugas tidak ditemukan: ${assignment_type}`);
          continue;
        }

        const payload = {
          teacher_id: matchedTeacher.id,
          assignment_type_id: matchedType.id,
          details
        };

        const res = await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json();
          console.error("Gagal impor assignment:", err.error);
        }

        count++;
        setImportProgress(prev => ({ ...prev, current: count, status: `Menugaskan: ${teacher_name}` }));
      }

      setImportProgress(null);
      alert(`Berhasil memproses ${count} penugasan guru.`);
      fetchData();
    } catch (err) {
      setImportProgress(null);
      alert("Gagal impor tugas tambahan: " + err.message);
    }
    e.target.value = '';
  };

  const handleExportEvents = () => {
    const exportData = events.map(e => ({
      'Nama Kegiatan': e.name || '',
      'Tanggal Pelaksanaan': e.event_date ? e.event_date.split('T')[0] : '',
      'Tanggal Berakhir': e.end_date ? e.end_date.split('T')[0] : ''
    }));
    exportToExcel(exportData, `Daftar_Kegiatan_Sekolah_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportEvents = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = await readExcel(file);
      if (json.length === 0) {
        alert("File Excel kosong.");
        return;
      }
      if (!confirm(`Yakin ingin mengimpor ${json.length} Kegiatan dari Excel?`)) return;

      setImportProgress({ current: 0, total: json.length, status: 'Mengimpor Kegiatan Sekolah...' });

      let count = 0;
      for (const row of json) {
        const name = row.name || row['Nama Kegiatan'] || '';
        const event_date = row.event_date || row['Tanggal Pelaksanaan'] || '';
        const end_date = row.end_date || row['Tanggal Berakhir'] || event_date || '';

        if (!name || !event_date) continue;

        const payload = { name, event_date, end_date };
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json();
          console.error("Gagal impor kegiatan:", err.error);
        }

        count++;
        setImportProgress(prev => ({ ...prev, current: count, status: `Mengimpor: ${name}` }));
      }

      setImportProgress(null);
      alert(`Berhasil memproses ${count} data Kegiatan.`);
      fetchData();
    } catch (err) {
      setImportProgress(null);
      alert("Gagal impor kegiatan: " + err.message);
    }
    e.target.value = '';
  };

  const handleExportExams = () => {
    const exportData = exams.map(ex => ({
      'Nama Ujian / Sesi': ex.name || '',
      'Tanggal Mulai': ex.start_date ? ex.start_date.split('T')[0] : '',
      'Tanggal Selesai': ex.end_date ? ex.end_date.split('T')[0] : ''
    }));
    exportToExcel(exportData, `Jadwal_Ujian_Sekolah_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportExams = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = await readExcel(file);
      if (json.length === 0) {
        alert("File Excel kosong.");
        return;
      }
      if (!confirm(`Yakin ingin mengimpor ${json.length} Jadwal Ujian dari Excel?`)) return;

      setImportProgress({ current: 0, total: json.length, status: 'Mengimpor Jadwal Ujian...' });

      let count = 0;
      for (const row of json) {
        const name = row.name || row['Nama Ujian / Sesi'] || '';
        const start_date = row.start_date || row['Tanggal Mulai'] || '';
        const end_date = row.end_date || row['Tanggal Selesai'] || '';

        if (!name || !start_date || !end_date) continue;

        const payload = { name, start_date, end_date };
        const res = await fetch('/api/exams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const err = await res.json();
          console.error("Gagal impor ujian:", err.error);
        }

        count++;
        setImportProgress(prev => ({ ...prev, current: count, status: `Mengimpor: ${name}` }));
      }

      setImportProgress(null);
      alert(`Berhasil memproses ${count} data Jadwal Ujian.`);
      fetchData();
    } catch (err) {
      setImportProgress(null);
      alert("Gagal impor jadwal ujian: " + err.message);
    }
    e.target.value = '';
  };

  const handleExportPresensiConfigs = () => {
    const exportData = attendanceConfigs.map(c => ({
      'Nama Sesi Presensi': c.name || '',
      'Waktu Mulai Scan': c.start || '',
      'Waktu Selesai Scan': c.end || '',
      'Tipe Presensi': c.type || ''
    }));
    exportToExcel(exportData, `Aturan_Presensi_Siswa_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [activeTab, profile]);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      if (activeTab === 'guru') {
        const res = await fetch('/api/teachers');
        if (res.ok) {
          const data = await res.json();
          setTeachers(data);
        }
      } else if (activeTab === 'kelas') {
        const res = await fetch('/api/classes');
        if (res.ok) {
          const data = await res.json();
          setClasses(data);
        }
        
        const resUsers = await fetch('/api/teachers?type=profiles&role=GURU');
        if (resUsers.ok) {
          const usersData = await resUsers.json();
          setUsers(usersData);
        }
      } else if (activeTab === 'mapel') {
        const res = await fetch('/api/subjects');
        if (res.ok) {
          const data = await res.json();
          setSubjects(data);
        }
      } else if (activeTab === 'tugas_tambahan') {
        // Fetch assignments
        const assRes = await fetch('/api/assignments');
        if (assRes.ok) {
          const assData = await assRes.json();
          setAssignments(assData);
        }

        // Fetch assignment types
        const typeRes = await fetch('/api/assignment-types');
        if (typeRes.ok) {
          const typeData = await typeRes.json();
          setAssignmentTypes(typeData);
        }

        // Fetch all teachers
        const resAllTeachers = await fetch('/api/teachers?type=profiles&role=GURU');
        if (resAllTeachers.ok) {
          const teachersData = await resAllTeachers.json();
          setAllTeachers(teachersData);
        }
      } else if (activeTab === 'kegiatan') {
        const evRes = await fetch('/api/events');
        if (evRes.ok) setEvents(await evRes.json());
        
        const evtRes = await fetch('/api/events?type=teachers');
        if (evtRes.ok) setEventTeachers(await evtRes.json());

        const resAllTeachers = await fetch('/api/teachers?type=profiles&role=GURU');
        if (resAllTeachers.ok) {
          const teachersData = await resAllTeachers.json();
          setAllTeachers(teachersData);
        }
      } else if (activeTab === 'ujian') {
        const exRes = await fetch('/api/exams');
        if (exRes.ok) setExams(await exRes.json());
        
        const extRes = await fetch('/api/exams?type=teachers');
        if (extRes.ok) setExamTeachers(await extRes.json());

        const resAllTeachers = await fetch('/api/teachers?type=profiles&role=GURU');
        if (resAllTeachers.ok) {
          const teachersData = await resAllTeachers.json();
          setAllTeachers(teachersData);
        }
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // --- TAB GURU LOGIC ---
  const saveGuru = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    if (editingId) {
      try {
        const { error: profileError } = await supabase.from('sr_profiles').update({
          full_name: guruForm.full_name,
        }).eq('id', editingId);

        if (profileError) throw profileError;

        const { error: detailError } = await supabase.from('sr_teacher_details').update({
          nip: guruForm.nip || null,
          nuptk: guruForm.nuptk || null,
          gender: guruForm.gender || null,
          birth_date: guruForm.birth_date || null,
          employment_status: guruForm.employment_status || null,
          phone: guruForm.phone || null
        }).eq('profile_id', editingId);

        if (detailError) throw detailError;

        setShowGuruModal(false);
        setEditingId(null);
        alert("Data Pendidik berhasil diperbarui!");
        await fetchData();
      } catch (err) {
        alert("Gagal memperbarui guru: " + err.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Insert Mode
    let cleanNip = String(guruForm.nip).trim();
    let generatedEmail = guruForm.email ? String(guruForm.email).trim() : '';
    let autoPassword = cleanNip;

    if (!generatedEmail) {
      const nameSlug = String(guruForm.full_name).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const randomSuffix = Math.floor(100 + Math.random() * 900); // 3 digit unik
      const generatedUsername = nameSlug ? `${nameSlug}${randomSuffix}` : `guru${Math.floor(1000 + Math.random() * 9000)}`;
      generatedEmail = `${generatedUsername}@lensa.smanda.id`;
      
      if (!cleanNip) {
        cleanNip = generatedUsername;
        autoPassword = generatedUsername;
      }
    } else if (!autoPassword) {
      autoPassword = generatedEmail.split('@')[0];
    }

    if (autoPassword.length < 6) {
      autoPassword = autoPassword.padEnd(6, '1');
    }

    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: guruForm.full_name,
          email: generatedEmail,
          password: autoPassword,
          nip: cleanNip,
          nuptk: guruForm.nuptk,
          gender: guruForm.gender,
          birth_date: guruForm.birth_date,
          employment_status: guruForm.employment_status,
          phone: guruForm.phone
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Simpan password default di temp_passwords via API reset-password agar terlihat oleh Admin Utama
      await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.userId, password: autoPassword })
      });

      setShowGuruModal(false);
      setGuruForm({ full_name: '', email: '', nip: '', nuptk: '', gender: 'L', birth_date: '', employment_status: 'PNS', phone: '' });
      alert(`Guru berhasil ditambahkan!\nPassword Default: ${autoPassword}`);
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteGuru = async (profileId) => {
    alert("Penghapusan akun guru harus melalui menu Pengaturan Sistem oleh Admin IT.");
  };

  const editGuru = (guru) => {
    setEditingId(guru.profile_id);
    setGuruForm({
      full_name: guru.profile.full_name,
      email: guru.profile.email,
      nip: guru.nip || '',
      nuptk: guru.nuptk || '',
      gender: guru.gender || 'L',
      birth_date: guru.birth_date || '',
      employment_status: guru.employment_status || 'PNS',
      phone: guru.phone || ''
    });
    setShowGuruModal(true);
  };

  // --- TAB KELAS LOGIC ---
  const saveClass = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { 
        name: classForm.name, 
        grade_level: classForm.grade_level,
        major: classForm.major,
        homeroom_teacher_id: classForm.homeroom_teacher_id || null
      };

      const body = {
        action: editingId ? 'update' : 'insert',
        id: editingId,
        payload
      };

      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Gagal menyimpan kelas');
      }

      // Update local state directly to prevent hanging on fetchData
      const savedItem = resData.data && resData.data[0] ? resData.data[0] : { id: editingId || Date.now().toString(), ...payload };
      const teacherObj = users.find(u => u.id === payload.homeroom_teacher_id);
      savedItem.wali_kelas = teacherObj ? { full_name: teacherObj.full_name } : null;

      if (editingId) {
        setClasses(prev => prev.map(item => item.id === editingId ? savedItem : item));
      } else {
        setClasses(prev => [...prev, savedItem].sort((a, b) => {
          if (a.grade_level !== b.grade_level) {
            return a.grade_level.localeCompare(b.grade_level);
          }
          return a.name.localeCompare(b.name);
        }));
      }

      setShowClassModal(false);
      setEditingId(null);
      setClassForm({ name: '', grade_level: 'X', major: 'MIPA', homeroom_teacher_id: '' });
      
      // Fetch in the background without awaiting it
      fetchData().catch(err => console.error(err));
    } catch (err) {
      console.error("Exception in saveClass:", err);
      alert("Gagal menyimpan kelas: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const editClass = (cls) => {
    setEditingId(cls.id);
    setClassForm({
      name: cls.name,
      grade_level: cls.grade_level.toString(),
      major: cls.major || 'MIPA',
      homeroom_teacher_id: cls.homeroom_teacher_id || ''
    });
    setShowClassModal(true);
  };

  const deleteClass = async (id) => {
    if (profile.role !== 'ADMIN') {
      alert("Hanya Admin Utama yang berwenang menghapus data kelas.");
      return;
    }
    if (!confirm("Yakin ingin menghapus kelas ini?")) return;
    try {
      // Optimistic delete
      setClasses(prev => prev.filter(item => item.id !== id));

      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus kelas');
      
      fetchData().catch(err => console.error(err));
    } catch (err) {
      alert("Gagal menghapus: " + err.message);
      await fetchData();
    }
  };

  // --- TAB MAPEL LOGIC ---
  const saveSubject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { 
        name: subjectForm.name, 
        code: subjectForm.code,
        category: subjectForm.category
      };

      const body = {
        action: editingId ? 'update' : 'insert',
        id: editingId,
        payload
      };

      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Gagal menyimpan mata pelajaran');
      }

      // Update local state directly
      const savedItem = resData.data && resData.data[0] ? resData.data[0] : { id: editingId || Date.now().toString(), ...payload };
      if (editingId) {
        setSubjects(prev => prev.map(item => item.id === editingId ? savedItem : item));
      } else {
        setSubjects(prev => [...prev, savedItem].sort((a, b) => a.name.localeCompare(b.name)));
      }

      setShowSubjectModal(false);
      setEditingId(null);
      setSubjectForm({ name: '', code: '', category: 'WAJIB' });
      
      fetchData().catch(err => console.error(err));
    } catch (err) {
      console.error("Exception in saveSubject:", err);
      alert("Error sistem saat menyimpan mapel: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const editSubject = (sub) => {
    setEditingId(sub.id);
    setSubjectForm({
      name: sub.name,
      code: sub.code,
      category: sub.category
    });
    setShowSubjectModal(true);
  };

  const deleteSubject = async (id) => {
    if (profile.role !== 'ADMIN') {
      alert("Hanya Admin Utama yang berwenang menghapus mata pelajaran.");
      return;
    }
    if (!confirm("Yakin ingin menghapus mapel ini?")) return;
    try {
      // Optimistic delete
      setSubjects(prev => prev.filter(item => item.id !== id));

      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus mata pelajaran');
      
      fetchData().catch(err => console.error(err));
    } catch (err) {
      alert("Gagal menghapus: " + err.message);
      await fetchData();
    }
  };

  // --- TUGAS TAMBAHAN LOGIC ---
  const saveAssignment = async (e) => {
    e.preventDefault();
    if (!assignmentForm.teacher_id) {
      alert("Silakan pilih guru pengajar terlebih dahulu.");
      return;
    }
    if (assignmentForm.assignment_type_ids.length === 0) {
      alert("Silakan ceklis minimal satu jenis tugas tambahan.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentForm)
      });
      if (res.ok) {
        setShowAssignmentModal(false);
        setAssignmentForm({ teacher_id: '', assignment_type_ids: [], details: '' });
        await fetchData();
        alert("Penugasan tugas tambahan berhasil disimpan!");
      } else {
        const err = await res.json();
        alert("Gagal menyimpan penugasan: " + err.error);
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (id) => {
    if (profile.role !== 'ADMIN') {
      alert("Hanya Admin Utama yang berwenang menghapus tugas tambahan guru.");
      return;
    }
    if (!confirm("Yakin ingin membatalkan/menghapus tugas tambahan guru ini?")) return;
    try {
      const res = await fetch(`/api/assignments?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchData();
        alert("Tugas tambahan berhasil dihapus.");
      } else {
        const err = await res.json();
        alert("Gagal menghapus: " + err.error);
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const saveAssignmentTypeForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/assignment-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeForm)
      });
      if (res.ok) {
        setShowTypeModal(false);
        setTypeForm({ name: '' });
        await fetchData();
        alert("Jenis tugas tambahan berhasil didaftarkan!");
      } else {
        const err = await res.json();
        alert("Gagal menyimpan jenis tugas: " + err.error);
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteType = async (id) => {
    if (profile.role !== 'ADMIN') {
      alert("Hanya Admin Utama yang berwenang menghapus jenis kategori tugas tambahan.");
      return;
    }
    if (!confirm("Yakin ingin menghapus jenis tugas tambahan ini?")) return;
    try {
      const res = await fetch(`/api/assignment-types?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchData();
        alert("Jenis tugas berhasil dihapus.");
      } else {
        const err = await res.json();
        alert("Gagal menghapus: " + err.error);
      }
    } catch (e) {
      alert(e.message);
    }
  };

  // --- KEGIATAN & UJIAN LOGIC ---
  const saveEvent = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...eventForm, id: editingId } : eventForm)
      });
      if (res.ok) {
        setShowEventModal(false);
        setEditingId(null);
        setEventForm({ name: '', event_date: '', end_date: '' });
        await fetchData();
        alert("Kegiatan berhasil disimpan!");
      } else {
        const err = await res.json();
        alert("Gagal menyimpan kegiatan: " + err.error);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editEvent = (event) => {
    setEditingId(event.id);
    setEventForm({
      name: event.name,
      event_date: event.event_date ? event.event_date.split('T')[0] : '',
      end_date: event.end_date ? event.end_date.split('T')[0] : ''
    });
    setShowEventModal(true);
  };

  const deleteEventClick = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus kegiatan ini? Semua penugasan guru terkait juga akan dihapus.")) return;
    try {
      const res = await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        alert("Kegiatan berhasil dihapus.");
      } else {
        const err = await res.json();
        alert("Gagal menghapus: " + err.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const saveEventTeacher = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const eventId = eventTeacherForm.event_id;
      if (!eventId) return;

      const currentlyAssignedRelations = eventTeachers.filter(et => et.event_id === eventId);
      const currentlyAssignedIds = currentlyAssignedRelations.map(et => et.teacher_id);

      const toAdd = selectedTeacherIds.filter(id => !currentlyAssignedIds.includes(id));
      const toDelete = currentlyAssignedRelations.filter(et => !selectedTeacherIds.includes(et.teacher_id));

      for (const teacherId of toAdd) {
        const res = await fetch('/api/events?type=teacher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id: eventId, teacher_id: teacherId })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal menugaskan guru");
        }
      }

      for (const rel of toDelete) {
        const res = await fetch(`/api/events?type=teacher&id=${rel.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal membatalkan penugasan guru");
        }
      }

      setShowEventTeacherModal(false);
      setEventTeacherForm({ event_id: '', teacher_id: '' });
      setSelectedTeacherIds([]);
      setModalSearchQuery('');
      await fetchData();
      alert("Penugasan penanggung jawab kegiatan berhasil diperbarui!");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteEventTeacherClick = async (id) => {
    if (!confirm("Batalkan penugasan guru untuk kegiatan ini?")) return;
    try {
      const res = await fetch(`/api/events?type=teacher&id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        alert("Penugasan guru berhasil dibatalkan.");
      } else {
        const err = await res.json();
        alert("Gagal membatalkan: " + err.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const saveExam = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { ...examForm, id: editingId } : examForm)
      });
      if (res.ok) {
        setShowExamModal(false);
        setEditingId(null);
        setExamForm({ name: '', start_date: '', end_date: '' });
        await fetchData();
        alert("Jadwal Ujian berhasil disimpan!");
      } else {
        const err = await res.json();
        alert("Gagal menyimpan jadwal ujian: " + err.error);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editExam = (exam) => {
    setEditingId(exam.id);
    setExamForm({ name: exam.name, start_date: exam.start_date.split('T')[0], end_date: exam.end_date.split('T')[0] });
    setShowExamModal(true);
  };

  const deleteExamClick = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus jadwal ujian ini? Semua penugasan pengawas terkait juga akan dihapus.")) return;
    try {
      const res = await fetch(`/api/exams?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        alert("Jadwal ujian berhasil dihapus.");
      } else {
        const err = await res.json();
        alert("Gagal menghapus: " + err.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const saveExamTeacher = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const examId = examTeacherForm.exam_id;
      if (!examId) return;

      const currentlyAssignedRelations = examTeachers.filter(xt => xt.exam_id === examId);
      const currentlyAssignedIds = currentlyAssignedRelations.map(xt => xt.teacher_id);

      const toAdd = selectedTeacherIds.filter(id => !currentlyAssignedIds.includes(id));
      const toDelete = currentlyAssignedRelations.filter(xt => !selectedTeacherIds.includes(xt.teacher_id));

      for (const teacherId of toAdd) {
        const res = await fetch('/api/exams?type=teacher', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exam_id: examId, teacher_id: teacherId })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal menugaskan pengawas");
        }
      }

      for (const rel of toDelete) {
        const res = await fetch(`/api/exams?type=teacher&id=${rel.id}`, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal membatalkan penugasan pengawas");
        }
      }

      setShowExamTeacherModal(false);
      setExamTeacherForm({ exam_id: '', teacher_id: '' });
      setSelectedTeacherIds([]);
      setModalSearchQuery('');
      await fetchData();
      alert("Penugasan pengawas ujian berhasil diperbarui!");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteExamTeacherClick = async (id) => {
    if (!confirm("Batalkan penugasan pengawas ujian ini?")) return;
    try {
      const res = await fetch(`/api/exams?type=teacher&id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        alert("Penugasan pengawas berhasil dibatalkan.");
      } else {
        const err = await res.json();
        alert("Gagal membatalkan: " + err.error);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // --- PRESENSI KBM CONFIG LOGIC ---
  const saveConfig = (e) => {
    e.preventDefault();
    if (editingId) {
      setAttendanceConfigs(attendanceConfigs.map(c => c.id === editingId ? { ...c, ...configForm } : c));
      setEditingId(null);
    } else {
      setAttendanceConfigs([...attendanceConfigs, { id: Date.now(), ...configForm }]);
    }
    setConfigForm({ name: '', start: '07:00', end: '08:00', type: 'HARIAN' });
    setShowConfigModal(false);
    alert("Konfigurasi Presensi Berhasil Disimpan!");
  };

  const deleteConfig = (id) => {
    if (profile.role !== 'ADMIN') {
      alert("Hanya Admin Utama yang berwenang menghapus item konfigurasi presensi.");
      return;
    }
    if (!confirm("Hapus aturan presensi ini?")) return;
    setAttendanceConfigs(attendanceConfigs.filter(c => c.id !== id));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  if (authLoading || !profile) {
    return <div className="text-center text-muted py-20">Memeriksa hak akses...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Manajemen Kurikulum</h1>
          <p className="text-muted">Kelola data Tenaga Pendidik, Tugas Tambahan, dan Penjadwalan Presensi</p>
        </div>
      </div>

      <div className="tabs-container">
        <button 
          className={`tab-button flex items-center gap-2 ${activeTab === 'guru' ? 'active' : ''}`}
          onClick={() => {setActiveTab('guru'); setSearchQuery('');}}
        >
          <GraduationCap size={18} /> Master Guru
        </button>
        <button 
          className={`tab-button flex items-center gap-2 ${activeTab === 'kelas' ? 'active' : ''}`}
          onClick={() => {setActiveTab('kelas'); setSearchQuery('');}}
        >
          <Users size={18} /> Master Kelas
        </button>
        <button 
          className={`tab-button flex items-center gap-2 ${activeTab === 'mapel' ? 'active' : ''}`}
          onClick={() => {setActiveTab('mapel'); setSearchQuery('');}}
        >
          <BookOpen size={18} /> Master Mapel
        </button>
        <button 
          className={`tab-button flex items-center gap-2 ${activeTab === 'tugas_tambahan' ? 'active' : ''}`}
          onClick={() => {setActiveTab('tugas_tambahan'); setSearchQuery('');}}
        >
          <Award size={18} /> Tugas Tambahan
        </button>
        <button 
          className={`tab-button flex items-center gap-2 ${activeTab === 'kegiatan' ? 'active' : ''}`}
          onClick={() => {setActiveTab('kegiatan'); setSearchQuery('');}}
        >
          <Calendar size={18} /> Master Kegiatan
        </button>
        <button 
          className={`tab-button flex items-center gap-2 ${activeTab === 'ujian' ? 'active' : ''}`}
          onClick={() => {setActiveTab('ujian'); setSearchQuery('');}}
        >
          <FileText size={18} /> Jadwal Ujian
        </button>
        <button 
          className={`tab-button flex items-center gap-2 ${activeTab === 'presensi_kbm' ? 'active' : ''}`}
          onClick={() => {setActiveTab('presensi_kbm'); setSearchQuery('');}}
        >
          <Clock size={18} /> Presensi & Jam KBM
        </button>
      </div>

      <div className="glass-panel">
        <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
          <div className="form-input flex items-center gap-2" style={{maxWidth: 400, flexGrow: 1}}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Cari data..." 
              style={{background: 'transparent', border: 'none', color: 'var(--text-light)', width: '100%', outline: 'none'}}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {activeTab === 'guru' && (
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
              {!isReadOnly && (
                <>
                  <input type="file" id="import-guru-file" accept=".xlsx, .xls, .csv" onChange={handleImportGuru} style={{ display: 'none' }} />
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => downloadTemplateExcel('guru')}>
                    <Download size={16} /> Template Impor
                  </button>
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => document.getElementById('import-guru-file').click()}>
                    <FileSpreadsheet size={16} /> Impor Excel
                  </button>
                </>
              )}
              <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportGuru}>
                <FileSpreadsheet size={16} /> Ekspor Excel
              </button>
              {!isReadOnly && (
                <button className="btn-primary flex items-center gap-2" onClick={() => setShowGuruModal(true)}>
                  <Plus size={18} /> Tambah Guru
                </button>
              )}
            </div>
          )}
 
          {activeTab === 'kelas' && (
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
              {!isReadOnly && (
                <>
                  <input type="file" id="import-kelas-file" accept=".xlsx, .xls, .csv" onChange={handleImportKelas} style={{ display: 'none' }} />
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => downloadTemplateExcel('kelas')}>
                    <Download size={16} /> Template Impor
                  </button>
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => document.getElementById('import-kelas-file').click()}>
                    <FileSpreadsheet size={16} /> Impor Excel
                  </button>
                </>
              )}
              <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportKelas}>
                <FileSpreadsheet size={16} /> Ekspor Excel
              </button>
              {!isReadOnly && (
                <button className="btn-primary flex items-center gap-2" onClick={() => setShowClassModal(true)}>
                  <Plus size={18} /> Tambah Kelas
                </button>
              )}
            </div>
          )}
 
          {activeTab === 'mapel' && (
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
              {!isReadOnly && (
                <>
                  <input type="file" id="import-mapel-file" accept=".xlsx, .xls, .csv" onChange={handleImportMapel} style={{ display: 'none' }} />
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => downloadTemplateExcel('mapel')}>
                    <Download size={16} /> Template Impor
                  </button>
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => document.getElementById('import-mapel-file').click()}>
                    <FileSpreadsheet size={16} /> Impor Excel
                  </button>
                </>
              )}
              <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportMapel}>
                <FileSpreadsheet size={16} /> Ekspor Excel
              </button>
              {!isReadOnly && (
                <button className="btn-primary flex items-center gap-2" onClick={() => setShowSubjectModal(true)}>
                  <Plus size={18} /> Tambah Mapel
                </button>
              )}
            </div>
          )}
 
          {activeTab === 'tugas_tambahan' && (
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
              {!isReadOnly && (
                <>
                  <input type="file" id="import-tugas_tambahan-file" accept=".xlsx, .xls, .csv" onChange={handleImportAssignments} style={{ display: 'none' }} />
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => downloadTemplateExcel('tugas_tambahan')}>
                    <Download size={16} /> Template Impor
                  </button>
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => document.getElementById('import-tugas_tambahan-file').click()}>
                    <FileSpreadsheet size={16} /> Impor Excel
                  </button>
                </>
              )}
              <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportAssignments}>
                <FileSpreadsheet size={16} /> Ekspor Excel
              </button>
              {!isReadOnly && (
                <>
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => setShowTypeModal(true)}>
                    <Plus size={16} /> Kategori Tugas
                  </button>
                  <button className="btn-primary flex items-center gap-2" onClick={() => setShowAssignmentModal(true)}>
                    <Plus size={16} /> Tugaskan Guru
                  </button>
                </>
              )}
            </div>
          )}
 
          {activeTab === 'kegiatan' && (
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
              {!isReadOnly && (
                <>
                  <input type="file" id="import-kegiatan-file" accept=".xlsx, .xls, .csv" onChange={handleImportEvents} style={{ display: 'none' }} />
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => downloadTemplateExcel('kegiatan')}>
                    <Download size={16} /> Template Impor
                  </button>
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => document.getElementById('import-kegiatan-file').click()}>
                    <FileSpreadsheet size={16} /> Impor Excel
                  </button>
                </>
              )}
              <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportEvents}>
                <FileSpreadsheet size={16} /> Ekspor Excel
              </button>
              {!isReadOnly && (
                <>
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => setShowEventTeacherModal(true)}>
                    <Plus size={16} /> Penanggung Jawab
                  </button>
                  <button className="btn-primary flex items-center gap-2" onClick={() => setShowEventModal(true)}>
                    <Plus size={16} /> Kegiatan Baru
                  </button>
                </>
              )}
            </div>
          )}
 
          {activeTab === 'ujian' && (
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
              {!isReadOnly && (
                <>
                  <input type="file" id="import-ujian-file" accept=".xlsx, .xls, .csv" onChange={handleImportExams} style={{ display: 'none' }} />
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => downloadTemplateExcel('ujian')}>
                    <Download size={16} /> Template Impor
                  </button>
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => document.getElementById('import-ujian-file').click()}>
                    <FileSpreadsheet size={16} /> Impor Excel
                  </button>
                </>
              )}
              <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportExams}>
                <FileSpreadsheet size={16} /> Ekspor Excel
              </button>
              {!isReadOnly && (
                <>
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => setShowExamTeacherModal(true)}>
                    <Plus size={16} /> Pengawas Ujian
                  </button>
                  <button className="btn-primary flex items-center gap-2" onClick={() => setShowExamModal(true)}>
                    <Plus size={16} /> Jadwal Ujian Baru
                  </button>
                </>
              )}
            </div>
          )}
 
          {activeTab === 'presensi_kbm' && (
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
              <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportPresensiConfigs}>
                <FileSpreadsheet size={16} /> Ekspor Excel
              </button>
              {!isReadOnly && (
                <button className="btn-primary flex items-center gap-2" onClick={() => setShowConfigModal(true)}>
                  <Plus size={18} /> Aturan Presensi Baru
                </button>
              )}
            </div>
          )}
        </div>

        {importProgress && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-light)', fontWeight: 'bold' }}>
              <span>{importProgress.status}</span>
              <span>{importProgress.current} / {importProgress.total} Data</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${(importProgress.current / importProgress.total) * 100}%`, height: '100%', background: 'var(--primary-color)', transition: 'width 0.2s ease' }} />
            </div>
          </div>
        )}

        {loading && activeTab !== 'presensi_kbm' ? (
          <div className="text-center text-muted py-10">Memuat data...</div>
        ) : (
          <div className="data-table-container">

            {/* MASTER GURU */}
            {activeTab === 'guru' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama Pendidik</th>
                    <th>NIP / NUPTK</th>
                    <th>JK</th>
                    <th>Tgl Lahir</th>
                    <th>Status Kerja</th>
                    {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {teachers.filter(t => t.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((t) => (
                    <tr key={t.profile_id}>
                      <td>
                        <div style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{t.profile?.full_name}</div>
                        <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{t.profile?.email}</div>
                      </td>
                      <td>
                        <div>{t.nip || '-'}</div>
                        <div style={{fontSize: 12, color: 'var(--text-muted)'}}>NUPTK: {t.nuptk || '-'}</div>
                      </td>
                      <td>{t.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                      <td>{formatDate(t.birth_date)}</td>
                      <td>
                        <span className={`badge ${t.employment_status === 'PNS' || t.employment_status === 'PPPK' ? 'badge-primary' : 'badge-warning'}`}>
                          {t.employment_status || 'GTT'}
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td style={{textAlign: 'right'}}>
                          <button onClick={() => editGuru(t)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}>Edit</button>
                          <button onClick={() => deleteGuru(t.profile_id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {teachers.length === 0 && <tr><td colSpan="6" className="text-center text-muted">Belum ada data guru.</td></tr>}
                </tbody>
              </table>
            )}

            {/* MASTER KELAS */}
            {activeTab === 'kelas' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tingkat</th>
                    <th>Nama Ruangan</th>
                    <th>Jurusan</th>
                    <th>Wali Kelas</th>
                    {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {classes.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
                    <tr key={c.id}>
                      <td><span className="badge badge-success">Kelas {c.grade_level}</span></td>
                      <td style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{c.name}</td>
                      <td>{c.major}</td>
                      <td>{c.wali_kelas?.full_name || <span className="text-muted italic">Belum ditentukan</span>}</td>
                      {!isReadOnly && (
                        <td style={{textAlign: 'right'}}>
                          <button onClick={() => editClass(c)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}>Edit</button>
                          <button onClick={() => deleteClass(c.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {classes.length === 0 && <tr><td colSpan="5" className="text-center text-muted">Belum ada data kelas.</td></tr>}
                </tbody>
              </table>
            )}

            {/* MASTER MAPEL */}
            {activeTab === 'mapel' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kode Mapel</th>
                    <th>Nama Mata Pelajaran</th>
                    <th>Kategori</th>
                    {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {subjects.filter(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((s) => (
                    <tr key={s.id}>
                      <td><span style={{fontFamily: 'monospace', color: 'var(--text-muted)'}}>{s.code}</span></td>
                      <td style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{s.name}</td>
                      <td>
                        <span className={`badge ${s.category === 'WAJIB' ? 'badge-primary' : 'badge-warning'}`}>
                          {s.category}
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td style={{textAlign: 'right'}}>
                          <button onClick={() => editSubject(s)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}>Edit</button>
                          <button onClick={() => deleteSubject(s.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {subjects.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Belum ada data mapel.</td></tr>}
                </tbody>
              </table>
            )}

            {/* TUGAS TAMBAHAN GURU */}
            {activeTab === 'tugas_tambahan' && (
              <div style={{display: 'flex', flexDirection: 'column', gap: 30}}>
                {/* 1. Master Relasi Penugasan */}
                <div>
                  <h3 style={{fontSize: 16, marginBottom: 12}}>Relasi Penugasan Tambahan Guru</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Guru / Pendidik</th>
                        <th>Tugas Tambahan</th>
                        <th>Keterangan / Detail Binaan</th>
                        {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.filter(a => a.teacher?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.type?.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((a) => (
                        <tr key={a.id}>
                          <td>
                            <div style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{a.teacher?.full_name}</div>
                            <div style={{fontSize: 11, color: 'var(--text-muted)'}}>{a.teacher?.email}</div>
                          </td>
                          <td>
                            <span className="badge badge-primary">{a.type?.name}</span>
                          </td>
                          <td>
                            <strong style={{color: 'var(--text-light)'}}>{a.details || '-'}</strong>
                          </td>
                          {!isReadOnly && (
                            <td style={{textAlign: 'right'}}>
                              <button 
                                onClick={() => deleteAssignment(a.id)} 
                                className="text-muted hover:text-red-500" 
                                style={{background: 'transparent', color: 'var(--danger-color)'}}
                              >
                                Batalkan Tugas
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {assignments.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Belum ada penugasan guru.</td></tr>}
                    </tbody>
                  </table>
                </div>

                {/* 2. Master Kategori Tugas */}
                <div>
                  <h3 style={{fontSize: 16, marginBottom: 12}}>Kategori Master Tugas Tambahan</h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 15}}>
                    {assignmentTypes.map(type => (
                      <div key={type.id} className="glass-panel" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)'}}>
                        <span style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{type.name}</span>
                        {!isReadOnly && (
                          <button 
                            onClick={() => deleteType(type.id)}
                            style={{background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer'}}
                            title="Hapus Kategori"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MASTER KEGIATAN & GURU PENANGGUNG JAWAB */}
            {activeTab === 'kegiatan' && (
              <div style={{display: 'flex', flexDirection: 'column', gap: 30}}>
                {/* 1. Master Kegiatan */}
                <div>
                  <h3 style={{fontSize: 16, marginBottom: 12}}>Daftar Kegiatan Sekolah</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nama Kegiatan</th>
                        <th>Tanggal Pelaksanaan</th>
                        {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {events.filter(e => e.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((e) => (
                        <tr key={e.id}>
                          <td style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{e.name}</td>
                          <td>{formatDate(e.event_date)}{e.end_date && e.end_date !== e.event_date ? ` s.d. ${formatDate(e.end_date)}` : ''}</td>
                          {!isReadOnly && (
                            <td style={{textAlign: 'right'}}>
                              <button onClick={() => editEvent(e)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}>Edit</button>
                              <button onClick={() => deleteEventClick(e.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {events.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Belum ada data kegiatan.</td></tr>}
                    </tbody>
                  </table>
                </div>

                {/* 2. Guru Penanggung Jawab Kegiatan */}
                <div>
                  <h3 style={{fontSize: 16, marginBottom: 12}}>Penugasan Pendidik untuk Kegiatan</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Kegiatan</th>
                        <th>Guru Penanggung Jawab</th>
                        {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {eventTeachers.filter(et => et.event?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || et.teacher?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((et) => (
                        <tr key={et.id}>
                          <td style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{et.event?.name} ({formatDate(et.event?.event_date)}{et.event?.end_date && et.event?.end_date !== et.event?.event_date ? ` s.d. ${formatDate(et.event?.end_date)}` : ''})</td>
                          <td>{et.teacher?.full_name}</td>
                          {!isReadOnly && (
                            <td style={{textAlign: 'right'}}>
                              <button onClick={() => deleteEventTeacherClick(et.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Batalkan Tugas</button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {eventTeachers.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Belum ada penugasan guru untuk kegiatan.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MASTER JADWAL UJIAN & GURU PENGAWAS */}
            {activeTab === 'ujian' && (
              <div style={{display: 'flex', flexDirection: 'column', gap: 30}}>
                {/* 1. Jadwal Ujian */}
                <div>
                  <h3 style={{fontSize: 16, marginBottom: 12}}>Jadwal Ujian Sekolah</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nama Sesi / Pelaksanaan Ujian</th>
                        <th>Tanggal Mulai</th>
                        <th>Tanggal Selesai</th>
                        {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {exams.filter(ex => ex.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((ex) => (
                        <tr key={ex.id}>
                          <td style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{ex.name}</td>
                          <td>{formatDate(ex.start_date)}</td>
                          <td>{formatDate(ex.end_date)}</td>
                          {!isReadOnly && (
                            <td style={{textAlign: 'right'}}>
                              <button onClick={() => editExam(ex)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}>Edit</button>
                              <button onClick={() => deleteExamClick(ex.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {exams.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Belum ada data jadwal ujian.</td></tr>}
                    </tbody>
                  </table>
                </div>

                {/* 2. Guru Pengawas Ujian */}
                <div>
                  <h3 style={{fontSize: 16, marginBottom: 12}}>Penugasan Guru Pengawas Ruangan Ujian</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nama Ujian</th>
                        <th>Guru Pengawas</th>
                        {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {examTeachers.filter(xt => xt.exam?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || xt.teacher?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((xt) => (
                        <tr key={xt.id}>
                          <td style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{xt.exam?.name}</td>
                          <td>{xt.teacher?.full_name}</td>
                          {!isReadOnly && (
                            <td style={{textAlign: 'right'}}>
                              <button onClick={() => deleteExamTeacherClick(xt.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Batalkan Tugas</button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {examTeachers.length === 0 && <tr><td colSpan="3" className="text-center text-muted">Belum ada penugasan guru pengawas.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PRESENSI & JAM KBM */}
            {activeTab === 'presensi_kbm' && (
              <div style={{display: 'flex', flexDirection: 'column', gap: 30}}>
                {/* 1. Pengaturan Item Presensi */}
                <div>
                  <h3 style={{fontSize: 16, marginBottom: 12}}>Item / Kategori Presensi Siswa</h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Item Presensi</th>
                        <th>Tipe / Sifat</th>
                        <th>Waktu Mulai Scan</th>
                        <th>Waktu Selesai Scan</th>
                        {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceConfigs.map((cfg) => (
                        <tr key={cfg.id}>
                          <td style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{cfg.name}</td>
                          <td>
                            <span className={`badge ${cfg.type === 'HARIAN' ? 'badge-primary' : cfg.type === 'MAPEL' ? 'badge-success' : 'badge-warning'}`}>
                              {cfg.type}
                            </span>
                          </td>
                          <td>{cfg.start}</td>
                          <td>{cfg.end}</td>
                          {!isReadOnly && (
                            <td style={{textAlign: 'right'}}>
                              <button 
                                onClick={() => {
                                  setEditingId(cfg.id);
                                  setConfigForm({ name: cfg.name, start: cfg.start, end: cfg.end, type: cfg.type });
                                  setShowConfigModal(true);
                                }} 
                                className="text-muted hover:text-primary" 
                                style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}
                              >
                                Edit
                              </button>
                              <button onClick={() => deleteConfig(cfg.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 2. Kehadiran Guru di Kelas */}
                <div>
                  <h3 style={{fontSize: 16, marginBottom: 4}}>Monitoring Kehadiran Mengajar Guru di Kelas</h3>
                  <p className="text-muted" style={{fontSize: 12, marginBottom: 12}}>Status kehadiran guru mengajar hari ini berdasarkan scan KBM di kelas masing-masing</p>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Ruang Kelas</th>
                        <th>Pendidik Mengajar</th>
                        <th>Mata Pelajaran</th>
                        <th>Waktu Masuk Kelas</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teacherClassPresence.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{row.class}</td>
                          <td>{row.teacher}</td>
                          <td>{row.subject}</td>
                          <td><code>{row.time}</code></td>
                          <td>
                            <span className={`badge ${row.status === 'HADIR' ? 'badge-success' : 'badge-danger'}`}>
                              {row.status === 'HADIR' ? 'Hadir Mengajar' : 'Belum Scan Masuk'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* MODAL TAMBAH GURU */}
      {showGuruModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Data Pendidik' : 'Registrasi Tenaga Pendidik'}</h2>
              <button onClick={() => {setShowGuruModal(false); setEditingId(null); setGuruForm({ full_name: '', email: '', nip: '', nuptk: '', gender: 'L', birth_date: '', employment_status: 'PNS', phone: '' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveGuru}>
              <div className="modal-body">
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Nama Lengkap (Beserta Gelar)</label>
                    <input type="text" className="form-input" required value={guruForm.full_name} onChange={e => setGuruForm({...guruForm, full_name: e.target.value})} placeholder="Budi Santoso, S.Pd." />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Email Akademik (Login)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={editingId ? guruForm.email : (guruForm.nip ? `${guruForm.nip}@lensa.smanda.id` : '')} 
                      disabled 
                      placeholder="Auto-generated dari NIP" 
                    />
                  </div>
                </div>

                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>NIP</label>
                    <input type="text" className="form-input" required value={guruForm.nip} onChange={e => setGuruForm({...guruForm, nip: e.target.value})} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>NUPTK (Opsional)</label>
                    <input type="text" className="form-input" value={guruForm.nuptk} onChange={e => setGuruForm({...guruForm, nuptk: e.target.value})} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Jenis Kelamin</label>
                    <select className="form-input" value={guruForm.gender} onChange={e => setGuruForm({...guruForm, gender: e.target.value})}>
                      <option value="L">Laki-Laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                </div>

                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Tanggal Lahir</label>
                    <input type="date" className="form-input" required value={guruForm.birth_date} onChange={e => setGuruForm({...guruForm, birth_date: e.target.value})} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Status</label>
                    <select className="form-input" value={guruForm.employment_status} onChange={e => setGuruForm({...guruForm, employment_status: e.target.value})}>
                      <option value="PNS">PNS</option>
                      <option value="PPPK">PPPK</option>
                      <option value="HONORER">Honorer</option>
                      <option value="GTT">GTT</option>
                    </select>
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>No. WhatsApp</label>
                    <input type="text" className="form-input" value={guruForm.phone} onChange={e => setGuruForm({...guruForm, phone: e.target.value})} />
                  </div>
                </div>

                {!editingId && (
                  <div className="p-2 rounded" style={{background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: 12, color: 'var(--text-muted)', marginTop: 4}}>
                    ℹ️ Akun login & Password default akan di-generate otomatis menggunakan NIP.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowGuruModal(false); setEditingId(null); setGuruForm({ full_name: '', email: '', nip: '', nuptk: '', gender: 'L', birth_date: '', employment_status: 'PNS', phone: '' });}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Memproses...' : editingId ? 'Simpan Perubahan' : 'Daftarkan Guru'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KELAS */}
      {showClassModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Data Kelas' : 'Tambah Kelas Baru'}</h2>
              <button onClick={() => {setShowClassModal(false); setEditingId(null); setClassForm({ name: '', grade_level: 'X', major: 'MIPA', homeroom_teacher_id: '' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveClass}>
              <div className="modal-body">
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Tingkat Kelas</label>
                    <select className="form-input" value={classForm.grade_level} onChange={(e) => setClassForm({...classForm, grade_level: e.target.value})}>
                      <option value="X">Kelas X</option>
                      <option value="XI">Kelas XI</option>
                      <option value="XII">Kelas XII</option>
                    </select>
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Jurusan / Peminatan</label>
                    <select className="form-input" value={classForm.major} onChange={(e) => setClassForm({...classForm, major: e.target.value})}>
                      <option value="MIPA">MIPA</option>
                      <option value="IPS">IPS</option>
                      <option value="BAHASA">Bahasa</option>
                      <option value="UMUM">Umum (Kurikulum Merdeka)</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Nama Ruang Kelas (Cth: X MIPA 1)</label>
                  <input type="text" className="form-input" value={classForm.name} onChange={(e) => setClassForm({...classForm, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Pilih Wali Kelas (Opsional)</label>
                  <select className="form-input" value={classForm.homeroom_teacher_id} onChange={(e) => setClassForm({...classForm, homeroom_teacher_id: e.target.value})}>
                    <option value="">-- Belum Ditentukan --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowClassModal(false); setEditingId(null); setClassForm({ name: '', grade_level: 'X', major: 'MIPA', homeroom_teacher_id: '' });}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Kelas'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MAPEL */}
      {showSubjectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}</h2>
              <button onClick={() => {setShowSubjectModal(false); setEditingId(null); setSubjectForm({ name: '', code: '', category: 'WAJIB' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveSubject}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Kode Mapel (Harus Unik)</label>
                  <input type="text" className="form-input" value={subjectForm.code} onChange={(e) => setSubjectForm({...subjectForm, code: e.target.value})} required placeholder="Cth: FIS-X" />
                </div>
                <div className="form-group">
                  <label>Nama Mata Pelajaran</label>
                  <input type="text" className="form-input" value={subjectForm.name} onChange={(e) => setSubjectForm({...subjectForm, name: e.target.value})} required placeholder="Cth: Fisika" />
                </div>
                <div className="form-group">
                  <label>Kategori</label>
                  <select className="form-input" value={subjectForm.category} onChange={(e) => setSubjectForm({...subjectForm, category: e.target.value})}>
                    <option value="WAJIB">Wajib</option>
                    <option value="PEMINATAN">Peminatan</option>
                    <option value="MUATAN_LOKAL">Muatan Lokal</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowSubjectModal(false); setEditingId(null); setSubjectForm({ name: '', code: '', category: 'WAJIB' });}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Mapel'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TUGASKAN GURU */}
      {showAssignmentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>Tugaskan Tugas Tambahan Guru</h2>
              <button onClick={() => {setShowAssignmentModal(false); setAssignmentForm({ teacher_id: '', assignment_type_ids: [], details: '' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveAssignment}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Pilih Guru</label>
                  <select className="form-input" required value={assignmentForm.teacher_id} onChange={e => setAssignmentForm({...assignmentForm, teacher_id: e.target.value})}>
                    <option value="">-- Pilih Guru Pengajar --</option>
                    {allTeachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: 8 }}>Pilih Jenis Tugas Tambahan (Bisa ceklis lebih dari satu)</label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 12,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: 12,
                    maxHeight: 180,
                    overflowY: 'auto'
                  }}>
                    {assignmentTypes.map(type => {
                      const isChecked = assignmentForm.assignment_type_ids.includes(type.id);
                      return (
                        <label 
                          key={type.id} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 13,
                            cursor: 'pointer',
                            color: isChecked ? 'var(--text-light)' : 'var(--text-muted)',
                            transition: 'color 0.2s'
                          }}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const updatedIds = e.target.checked
                                ? [...assignmentForm.assignment_type_ids, type.id]
                                : assignmentForm.assignment_type_ids.filter(id => id !== type.id);
                              setAssignmentForm({ ...assignmentForm, assignment_type_ids: updatedIds });
                            }}
                            style={{
                              width: 16,
                              height: 16,
                              accentColor: 'var(--primary-color)',
                              cursor: 'pointer'
                            }}
                          />
                          {type.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group">
                  <label>Detail / Keterangan Binaan (Cth: Kelas XI MIPA 3, Pembina Pramuka, Piket Hari Senin)</label>
                  <input type="text" className="form-input" required value={assignmentForm.details} onChange={e => setAssignmentForm({...assignmentForm, details: e.target.value})} placeholder="Ketik keterangan ruang/hari/kelas binaan..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowAssignmentModal(false); setAssignmentForm({ teacher_id: '', assignment_type_ids: [], details: '' });}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Sedang Menyimpan...' : 'Tugaskan Guru'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KATEGORI TUGAS TAMBAHAN */}
      {showTypeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: 400}}>
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>Kategori Tugas Tambahan Baru</h2>
              <button onClick={() => {setShowTypeModal(false); setTypeForm({ name: '' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveAssignmentTypeForm}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Kategori Tugas (Cth: Pembina OSIS)</label>
                  <input type="text" className="form-input" required value={typeForm.name} onChange={e => setTypeForm({ name: e.target.value })} placeholder="Ketik jenis tugas tambahan..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowTypeModal(false); setTypeForm({ name: '' });}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>Tambah Kategori</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH KEGIATAN */}
      {showEventModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: 450}}>
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Kegiatan Sekolah' : 'Tambah Kegiatan Sekolah Baru'}</h2>
              <button onClick={() => {setShowEventModal(false); setEditingId(null); setEventForm({ name: '', event_date: '', end_date: '' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveEvent}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Kegiatan</label>
                  <input type="text" className="form-input" required value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} placeholder="Cth: Peringatan Hari Guru" />
                </div>
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Tanggal Pelaksanaan</label>
                    <input type="date" className="form-input" required value={eventForm.event_date} onChange={e => setEventForm({...eventForm, event_date: e.target.value})} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Tanggal Berakhir (Opsional)</label>
                    <input type="date" className="form-input" value={eventForm.end_date} onChange={e => setEventForm({...eventForm, end_date: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowEventModal(false); setEditingId(null); setEventForm({ name: '', event_date: '', end_date: '' });}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Kegiatan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TUGASKAN GURU KEGIATAN */}
      {showEventTeacherModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: 450}}>
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>Tugaskan Penanggung Jawab Kegiatan</h2>
              <button onClick={() => {setShowEventTeacherModal(false); setEventTeacherForm({ event_id: '', teacher_id: '' }); setSelectedTeacherIds([]); setModalSearchQuery('');}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveEventTeacher}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Pilih Kegiatan</label>
                  <select className="form-input" required value={eventTeacherForm.event_id} onChange={e => handleEventChange(e.target.value)}>
                    <option value="">-- Pilih Kegiatan --</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({formatDate(ev.event_date)}{ev.end_date && ev.end_date !== ev.event_date ? ` s.d. ${formatDate(ev.end_date)}` : ''})</option>)}
                  </select>
                </div>
                {eventTeacherForm.event_id ? (
                  <div className="form-group">
                    <label>Pilih Guru Penanggung Jawab (Bisa lebih dari 1)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Cari guru..." 
                      style={{ marginBottom: 8, fontSize: 13 }}
                      value={modalSearchQuery}
                      onChange={e => setModalSearchQuery(e.target.value)}
                    />
                    <div style={{
                      maxHeight: '200px', 
                      overflowY: 'auto', 
                      border: '1px solid var(--surface-border)', 
                      borderRadius: '8px', 
                      padding: '10px',
                      background: 'rgba(0,0,0,0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {allTeachers.filter(t => t.full_name?.toLowerCase().includes(modalSearchQuery.toLowerCase())).map(t => {
                        const isChecked = selectedTeacherIds.includes(t.id);
                        return (
                          <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-light)', cursor: 'pointer', fontSize: 13 }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => handleTeacherToggle(t.id)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            {t.full_name}
                          </label>
                        );
                      })}
                      {allTeachers.filter(t => t.full_name?.toLowerCase().includes(modalSearchQuery.toLowerCase())).length === 0 && (
                        <div className="text-muted text-center" style={{ fontSize: 12, padding: 10 }}>Guru tidak ditemukan.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted text-center" style={{ fontSize: 13, padding: '20px 0' }}>
                    Silakan pilih kegiatan terlebih dahulu untuk mengelola penugasan guru.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowEventTeacherModal(false); setEventTeacherForm({ event_id: '', teacher_id: '' }); setSelectedTeacherIds([]); setModalSearchQuery('');}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving || !eventTeacherForm.event_id}>{saving ? 'Menyimpan...' : 'Simpan Penugasan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL JADWAL UJIAN */}
      {showExamModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: 450}}>
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Jadwal Ujian' : 'Tambah Jadwal Ujian Baru'}</h2>
              <button onClick={() => {setShowExamModal(false); setEditingId(null); setExamForm({ name: '', start_date: '', end_date: '' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveExam}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Ujian / Sesi Pelaksanaan</label>
                  <input type="text" className="form-input" required value={examForm.name} onChange={e => setExamForm({...examForm, name: e.target.value})} placeholder="Cth: Penilaian Akhir Semester Ganjil" />
                </div>
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Tanggal Mulai</label>
                    <input type="date" className="form-input" required value={examForm.start_date} onChange={e => setExamForm({...examForm, start_date: e.target.value})} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Tanggal Selesai</label>
                    <input type="date" className="form-input" required value={examForm.end_date} onChange={e => setExamForm({...examForm, end_date: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowExamModal(false); setEditingId(null); setExamForm({ name: '', start_date: '', end_date: '' });}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Jadwal Ujian'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TUGASKAN GURU PENGAWAS UJIAN */}
      {showExamTeacherModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: 450}}>
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>Tugaskan Pengawas Ujian</h2>
              <button onClick={() => {setShowExamTeacherModal(false); setExamTeacherForm({ exam_id: '', teacher_id: '' }); setSelectedTeacherIds([]); setModalSearchQuery('');}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveExamTeacher}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Pilih Sesi Ujian</label>
                  <select className="form-input" required value={examTeacherForm.exam_id} onChange={e => handleExamChange(e.target.value)}>
                    <option value="">-- Pilih Ujian --</option>
                    {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                  </select>
                </div>
                {examTeacherForm.exam_id ? (
                  <div className="form-group">
                    <label>Pilih Guru Pengawas (Bisa lebih dari 1)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Cari guru..." 
                      style={{ marginBottom: 8, fontSize: 13 }}
                      value={modalSearchQuery}
                      onChange={e => setModalSearchQuery(e.target.value)}
                    />
                    <div style={{
                      maxHeight: '200px', 
                      overflowY: 'auto', 
                      border: '1px solid var(--surface-border)', 
                      borderRadius: '8px', 
                      padding: '10px',
                      background: 'rgba(0,0,0,0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      {allTeachers.filter(t => t.full_name?.toLowerCase().includes(modalSearchQuery.toLowerCase())).map(t => {
                        const isChecked = selectedTeacherIds.includes(t.id);
                        return (
                          <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-light)', cursor: 'pointer', fontSize: 13 }}>
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => handleTeacherToggle(t.id)}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            {t.full_name}
                          </label>
                        );
                      })}
                      {allTeachers.filter(t => t.full_name?.toLowerCase().includes(modalSearchQuery.toLowerCase())).length === 0 && (
                        <div className="text-muted text-center" style={{ fontSize: 12, padding: 10 }}>Guru tidak ditemukan.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted text-center" style={{ fontSize: 13, padding: '20px 0' }}>
                    Silakan pilih sesi ujian terlebih dahulu untuk mengelola penugasan pengawas.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowExamTeacherModal(false); setExamTeacherForm({ exam_id: '', teacher_id: '' }); setSelectedTeacherIds([]); setModalSearchQuery('');}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving || !examTeacherForm.exam_id}>{saving ? 'Menyimpan...' : 'Simpan Penugasan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIGURASI PRESENSI */}
      {showConfigModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: 450}}>
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Aturan Presensi' : 'Buat Aturan Presensi Siswa'}</h2>
              <button onClick={() => {setShowConfigModal(false); setEditingId(null); setConfigForm({ name: '', start: '07:00', end: '08:00', type: 'HARIAN' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveConfig}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Sesi Presensi</label>
                  <input type="text" className="form-input" required value={configForm.name} onChange={e => setConfigForm({...configForm, name: e.target.value})} placeholder="Cth: Presensi Shalat Dhuha" />
                </div>
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Waktu Mulai Scan</label>
                    <input type="text" className="form-input" required value={configForm.start} onChange={e => setConfigForm({...configForm, start: e.target.value})} placeholder="Cth: 07:00" />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Waktu Selesai Scan</label>
                    <input type="text" className="form-input" required value={configForm.end} onChange={e => setConfigForm({...configForm, end: e.target.value})} placeholder="Cth: 08:00" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Tipe Presensi</label>
                  <select className="form-input" value={configForm.type} onChange={e => setConfigForm({...configForm, type: e.target.value})}>
                    <option value="HARIAN">Presensi Harian Sekolah</option>
                    <option value="MAPEL">Presensi Jam Kelas (Mapel)</option>
                    <option value="INSIDENTAL">Presensi Kegiatan Insidental</option>
                    <option value="UJIAN">Presensi Ujian</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowConfigModal(false); setEditingId(null); setConfigForm({ name: '', start: '07:00', end: '08:00', type: 'HARIAN' });}}>Batal</button>
                <button type="submit" className="btn-primary">Simpan Konfigurasi</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
