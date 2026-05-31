"use client";
import { useEffect, useState, Suspense } from 'react';
import { Search, Plus, X, GraduationCap, AlertTriangle, Activity, FileText, Check, AlertCircle, FileSpreadsheet, Download, ShieldCheck, Image as ImageIcon, Printer } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { exportToExcel, readExcel, downloadTemplateExcel } from '@/lib/excelHelper';

export default function KesiswaanMaster() {
  return (
    <Suspense fallback={<div className="text-center text-muted py-20">Memuat Kesiswaan...</div>}>
      <KesiswaanMasterContent />
    </Suspense>
  );
}

function KesiswaanMasterContent() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('siswa'); // 'siswa', 'aturan', 'ekskul', 'pelanggaran', 'perizinan', 'persetujuan', 'persetujuan_aktivitas', 'rapor'
  const isReadOnly = profile?.is_kepsek;

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['siswa', 'aturan', 'ekskul', 'pelanggaran', 'perizinan', 'persetujuan', 'persetujuan_aktivitas', 'rapor'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading) {
      if (!profile || (
        profile.role !== 'ADMIN' && 
        !profile.is_kepsek && 
        !(profile.role === 'GURU' && profile.is_manajemen && profile.manajemen_role === 'KESISWAAN')
      )) {
        router.replace('/admin');
      }
    }
  }, [profile, authLoading, router]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // Data
  const [students, setStudents] = useState([]);
  const [pointRules, setPointRules] = useState([]);
  const [extracurriculars, setExtracurriculars] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [pendingViolations, setPendingViolations] = useState([]);
  const [positiveActivities, setPositiveActivities] = useState([]);
  
  // Lookups
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [studentProfiles, setStudentProfiles] = useState([]); // for Violation dropdown

  // Modals
  const [showSiswaModal, setShowSiswaModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showEkskulModal, setShowEkskulModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Forms
  const [siswaForm, setSiswaForm] = useState({ 
    full_name: '', email: '', nisn: '', nis: '', gender: 'L', class_id: '' 
  });
  const [ruleForm, setRuleForm] = useState({
    code: '', name: '', type: 'NEGATIF', default_point: 5
  });
  const [ekskulForm, setEkskulForm] = useState({
    name: '', category: 'Pilihan', coach_id: ''
  });
  const [pelanggaranForm, setPelanggaranForm] = useState({
    student_id: '', rule_id: '', description: '', event_date: new Date().toISOString().split('T')[0]
  });
  const [importProgress, setImportProgress] = useState(null); // { current: 0, total: 0, status: '' }

  const handleExportSiswa = () => {
    const exportData = students.map(s => ({
      'Nama Lengkap': s.profile?.full_name || '',
      'Email': s.profile?.email || '',
      'NISN': s.nisn || '',
      'NIS': s.nis || '',
      'JK': s.gender || '',
      'Kelas': s.kelas?.name || ''
    }));
    exportToExcel(exportData, `Daftar_Siswa_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportSiswa = async (e) => {
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

      if (!confirm(`Apakah Anda yakin ingin mengimpor ${normalizedJson.length} data Siswa dari Excel?`)) return;

      setImportProgress({ current: 0, total: normalizedJson.length, status: 'Memulai impor data Siswa...' });

      let activeClasses = classes;
      if (activeClasses.length === 0) {
        const res = await fetch('/api/classes');
        if (res.ok) {
          const data = await res.json();
          activeClasses = data;
        }
      }

      let successCount = 0;
      let failCount = 0;
      const failures = [];
      let currentIdx = 0;

      for (const row of normalizedJson) {
        currentIdx++;
        const full_name = row.full_name || row['Nama Lengkap'] || row['Nama'] || '';
        const nisn = row.nisn || row['NISN'] || '';
        const email = row.email || row['Email'] || (nisn ? `${String(nisn).trim()}@lensa.smanda.id` : '');
        const nis = row.nis || row['NIS'] || '';
        const gender = row.gender || row['JK'] || row['Jenis Kelamin'] || 'L';
        const class_name = row.class_name || row['Kelas'] || '';

        const cleanFullName = String(full_name).trim();
        const cleanEmail = String(email).trim();
        const cleanNisn = String(nisn).trim();

        if (!cleanFullName || !cleanEmail || !cleanNisn) {
          console.warn("Nama Lengkap, Email, dan NISN wajib diisi.", row);
          failCount++;
          failures.push(`Baris #${currentIdx}: Nama, Email, atau NISN kosong.`);
          continue;
        }

        const matchedClass = activeClasses.find(c => c.name.trim().toLowerCase() === class_name.trim().toLowerCase());
        const class_id = matchedClass ? matchedClass.id : null;

        const autoPassword = String(nisn).trim();

        try {
          const res = await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_name: cleanFullName,
              email: cleanEmail,
              password: autoPassword,
              nisn: cleanNisn,
              nis,
              gender,
              class_id
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
            failures.push(`${cleanFullName} (NISN: ${nisn}): ${errData.error || 'Gagal menyimpan'}`);
          }
        } catch (err) {
          console.error("Gagal impor row siswa:", err);
          failCount++;
          failures.push(`${cleanFullName} (NISN: ${nisn}): ${err.message}`);
        }

        setImportProgress(prev => ({ ...prev, current: currentIdx, status: `Mengimpor: ${cleanFullName}` }));
      }

      setImportProgress(null);
      if (failCount > 0) {
        alert(`Impor selesai!\nBerhasil: ${successCount} Siswa\nGagal: ${failCount} Siswa\n\nDetail kegagalan:\n${failures.slice(0, 10).join('\n')}${failures.length > 10 ? '\n...dan lainnya' : ''}`);
      } else {
        alert(`Impor selesai! Berhasil menyimpan ${successCount} data Siswa.`);
      }
      fetchData();
    } catch (err) {
      setImportProgress(null);
      alert("Gagal membaca Excel: " + err.message);
    }
    e.target.value = '';
  };

  const handleExportAturan = () => {
    const exportData = pointRules.map(r => ({
      'Kode': r.code || '',
      'Nama Aturan': r.name || '',
      'Tipe': r.type || '',
      'Poin': r.default_point || 0
    }));
    exportToExcel(exportData, `Aturan_Poin_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportAturan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = await readExcel(file);
      if (json.length === 0) {
        alert("File Excel kosong.");
        return;
      }
      if (!confirm(`Apakah Anda yakin ingin mengimpor ${json.length} aturan poin secara langsung ke database?`)) return;

      setImportProgress({ current: 0, total: json.length, status: 'Mengimpor Aturan Poin...' });

      const records = json.map(row => ({
        code: row.code || row['Kode'] || '',
        name: row.name || row['Nama Aturan'] || row['Nama'] || '',
        type: (row.type || row['Tipe'] || 'NEGATIF').toUpperCase(),
        default_point: Math.abs(parseInt(row.default_point || row['Poin'])) || 5
      })).filter(r => r.code && r.name);

      const res = await fetch('/api/point-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert',
          payload: records
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan aturan poin');

      setImportProgress(null);
      alert(`Berhasil mengimpor ${records.length} Aturan Poin!`);
      fetchData();
    } catch (err) {
      setImportProgress(null);
      alert("Gagal impor aturan poin: " + err.message);
    }
    e.target.value = '';
  };

  const handleExportPelanggaran = async () => {
    try {
      const res = await fetch('/api/activities?type=all_violations');
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal mengambil data pelanggaran');
      }
      const data = await res.json();

      const exportData = data.map(act => ({
        'Tanggal Kejadian': new Date(act.event_date).toLocaleDateString('id-ID'),
        'Nama Siswa': act.student?.full_name || '',
        'Kelas': act.student?.class_name || '',
        'Pelanggaran': act.rule?.name || '',
        'Deskripsi Kejadian': act.description || '',
        'Pengurangan Poin': act.rule?.default_point ? `-${act.rule?.default_point}` : '0',
        'Status': act.status || '',
        'Catatan Guru': act.notes || ''
      }));

      exportToExcel(exportData, `Laporan_Pelanggaran_Siswa_SMANDA_${new Date().toISOString().split('T')[0]}`);
    } catch (e) {
      alert("Gagal mengekspor laporan pelanggaran: " + e.message);
    }
  };

  const handleExportEkskul = () => {
    const exportData = extracurriculars.map(e => ({
      'Nama Ekstrakurikuler': e.name || '',
      'Kategori': e.category || '',
      'Guru Pembina': e.coach?.full_name || 'Belum diatur'
    }));
    exportToExcel(exportData, `Daftar_Ekskul_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  const handleImportEkskul = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = await readExcel(file);
      if (json.length === 0) {
        alert("File Excel kosong.");
        return;
      }
      if (!confirm(`Apakah Anda yakin ingin mengimpor ${json.length} data Ekstrakurikuler dari Excel?`)) return;

      setImportProgress({ current: 0, total: json.length, status: 'Mengimpor Ekstrakurikuler...' });

      let coachesList = teachers;
      if (coachesList.length === 0) {
        const res = await fetch('/api/teachers?type=all_coaches');
        if (res.ok) {
          coachesList = await res.json();
        }
      }

      let count = 0;
      for (const row of json) {
        const name = row.name || row['Nama Ekstrakurikuler'] || row['Nama'] || '';
        const category = row.category || row['Kategori'] || 'Pilihan';
        const coach_name = row.coach_name || row['Guru Pembina'] || '';

        if (!name) continue;

        let coach_id = null;
        if (coach_name) {
          const matched = coachesList.find(c => c.full_name?.toLowerCase().trim() === coach_name.toLowerCase().trim());
          if (matched) coach_id = matched.id;
        }

        const payload = { name, category, coach_id };
        try {
          const res = await fetch('/api/extracurriculars', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'insert',
              payload
            })
          });
          if (!res.ok) {
            const err = await res.json();
            console.error("Gagal impor ekskul:", err.error);
          }
        } catch (err) {
          console.error("Exception saat impor ekskul:", err);
        }

        count++;
        setImportProgress(prev => ({ ...prev, current: count, status: `Mengimpor ekskul: ${name}` }));
      }

      setImportProgress(null);
      alert(`Berhasil memproses ${count} data Ekstrakurikuler.`);
      fetchData();
    } catch (err) {
      setImportProgress(null);
      alert("Gagal impor ekskul: " + err.message);
    }
    e.target.value = '';
  };

  const handleImportPelanggaran = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = await readExcel(file);
      if (json.length === 0) {
        alert("File Excel kosong.");
        return;
      }
      if (!confirm(`Apakah Anda yakin ingin mengimpor ${json.length} data pelanggaran siswa dari Excel?`)) return;

      setImportProgress({ current: 0, total: json.length, status: 'Mengimpor Pelanggaran Siswa...' });

      let studentList = studentProfiles;
      if (studentList.length === 0) {
        const res = await fetch('/api/students?type=profiles');
        if (res.ok) {
          studentList = await res.json();
        }
      }

      let rulesList = pointRules;
      if (rulesList.length === 0) {
        const res = await fetch('/api/point-rules');
        if (res.ok) {
          const allRules = await res.json();
          rulesList = allRules.filter(r => r.type === 'NEGATIF');
        }
      }

      let count = 0;
      for (const row of json) {
        const student_name = row.student_name || row['Nama Siswa'] || '';
        const rule_code = row.rule_code || row['Kode Aturan'] || row['Kode'] || '';
        const description = row.description || row['Deskripsi Kejadian'] || row['Keterangan'] || '';
        const event_date = row.event_date || row['Tanggal Kejadian'] || row['Tanggal'] || new Date().toISOString().split('T')[0];

        if (!student_name || !rule_code) continue;

        const matchedStudent = studentList.find(s => s.full_name?.toLowerCase().trim() === student_name.toLowerCase().trim());
        const matchedRule = rulesList.find(r => r.code?.toLowerCase().trim() === rule_code.toLowerCase().trim());

        if (!matchedStudent) {
          console.warn(`Siswa tidak ditemukan: ${student_name}`);
          continue;
        }
        if (!matchedRule) {
          console.warn(`Aturan poin tidak ditemukan: ${rule_code}`);
          continue;
        }

        const points = matchedRule.default_point;

        try {
          const res = await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'insert_violation',
              payload: {
                student_id: matchedStudent.id,
                teacher_id: profile.id,
                rule_id: matchedRule.id,
                description,
                event_date,
                points
              }
            })
          });
          if (!res.ok) {
            const err = await res.json();
            console.error("Gagal impor pelanggaran:", err.error);
          }
        } catch (err) {
          console.error("Exception saat impor pelanggaran:", err);
        }

        count++;
        setImportProgress(prev => ({ ...prev, current: count, status: `Mencatat: ${student_name}` }));
      }

      setImportProgress(null);
      alert(`Berhasil memproses ${count} data pelanggaran.`);
      fetchData();
    } catch (err) {
      setImportProgress(null);
      alert("Gagal impor pelanggaran: " + err.message);
    }
    e.target.value = '';
  };

  const handleExportPermissions = () => {
    const exportData = permissions.map(perm => ({
      'Waktu Mengajukan': new Date(perm.created_at).toLocaleString('id-ID'),
      'Nama Siswa': perm.student?.full_name || '',
      'Kelas': perm.student?.class_name || '',
      'Jenis Izin': perm.tipe || '',
      'Durasi / Waktu': perm.waktu || '',
      'Alasan': perm.alasan || '',
      'Status': perm.status || '',
      'Disetujui Oleh': perm.approver?.full_name || '-'
    }));
    exportToExcel(exportData, `Daftar_Perizinan_Siswa_SMANDA_${new Date().toISOString().split('T')[0]}`);
  };

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [activeTab, profile]);

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      if (activeTab === 'siswa') {
        const resSiswa = await fetch('/api/students');
        if (resSiswa.ok) {
          const stdData = await resSiswa.json();
          setStudents(stdData);
        }
        
        const resClasses = await fetch('/api/classes');
        if (resClasses.ok) {
          const clsData = await resClasses.json();
          const sortedClasses = clsData.sort((a, b) => a.name.localeCompare(b.name));
          setClasses(sortedClasses);
        }

      } else if (activeTab === 'aturan') {
        const resRules = await fetch('/api/point-rules');
        if (resRules.ok) {
          const rulesData = await resRules.json();
          setPointRules(rulesData);
        }

      } else if (activeTab === 'ekskul') {
        const resEkskul = await fetch('/api/extracurriculars');
        if (resEkskul.ok) {
          const ekskulData = await resEkskul.json();
          setExtracurriculars(ekskulData);
        }

        const resGuru = await fetch('/api/teachers?type=all_coaches');
        if (resGuru.ok) {
          const guruData = await resGuru.json();
          setTeachers(guruData);
        }

      } else if (activeTab === 'pelanggaran') {
        // Load all students and negative point rules
        const resProfiles = await fetch('/api/students?type=profiles');
        if (resProfiles.ok) {
          const stdData = await resProfiles.json();
          setStudentProfiles(stdData);
        }

        const resRules = await fetch('/api/point-rules');
        if (resRules.ok) {
          const rulesData = await resRules.json();
          const negativeRules = rulesData.filter(r => r.type === 'NEGATIF').sort((a, b) => a.name.localeCompare(b.name));
          setPointRules(negativeRules);
        }

      } else if (activeTab === 'perizinan') {
        const res = await fetch('/api/permissions');
        if (res.ok) {
          const permData = await res.json();
          setPermissions(permData);
        }
      } else if (activeTab === 'persetujuan') {
        const resViolations = await fetch('/api/activities?type=pending_violations');
        if (resViolations.ok) {
          const violationsData = await resViolations.json();
          setPendingViolations(violationsData);
        }
      } else if (activeTab === 'persetujuan_aktivitas') {
        const { data, error } = await supabase
          .from('sr_activities')
          .select(`
            id,
            description,
            event_date,
            attachment_url,
            status,
            type,
            student_id,
            point_override,
            sr_profiles:student_id (full_name, class_name),
            sr_point_rules:rule_id (name, default_point)
          `)
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false });
        if (!error && data) {
          setPositiveActivities(data);
        }
      } else if (activeTab === 'rapor') {
        const resSiswa = await fetch('/api/students');
        if (resSiswa.ok) {
          const stdData = await resSiswa.json();
          setStudents(stdData);
        }
        const resClasses = await fetch('/api/classes');
        if (resClasses.ok) {
          const clsData = await resClasses.json();
          const sortedClasses = clsData.sort((a, b) => a.name.localeCompare(b.name));
          setClasses(sortedClasses);
        }
      }
    } catch (err) {
      console.error(err);
    }
    if (!isSilent) setLoading(false);
  };

  // --- SISWA LOGIC ---
  const saveSiswa = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    if (editingId) {
      try {
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            id: editingId,
            full_name: siswaForm.full_name,
            nisn: siswaForm.nisn,
            nis: siswaForm.nis,
            gender: siswaForm.gender,
            class_id: siswaForm.class_id
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal memperbarui siswa');

        setShowSiswaModal(false);
        setEditingId(null);
        alert("Data Siswa berhasil diperbarui!");
        await fetchData();
      } catch (err) {
        alert("Gagal memperbarui siswa: " + err.message);
      } finally {
        setSaving(false);
      }
      return;
    }

    // Insert Mode
    const autoPassword = String(siswaForm.nisn);
    const generatedEmail = `${siswaForm.nisn}@lensa.smanda.id`;
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: siswaForm.full_name,
          email: generatedEmail,
          password: autoPassword,
          nisn: siswaForm.nisn,
          nis: siswaForm.nis,
          gender: siswaForm.gender,
          class_id: siswaForm.class_id
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

      setShowSiswaModal(false);
      setSiswaForm({ full_name: '', email: '', nisn: '', nis: '', gender: 'L', class_id: '' });
      alert(`Siswa berhasil ditambahkan!\nPassword Default: ${autoPassword}`);
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editSiswa = (siswa) => {
    setEditingId(siswa.profile_id);
    setSiswaForm({
      full_name: siswa.profile.full_name,
      email: siswa.profile.email,
      nisn: siswa.nisn || '',
      nis: siswa.nis || '',
      gender: siswa.gender || 'L',
      class_id: siswa.class_id || ''
    });
    setShowSiswaModal(true);
  };

  const deleteSiswa = async (profileId) => {
    alert("Penghapusan akun siswa harus melalui menu Pengaturan Sistem oleh Admin IT.");
  };

  // --- POINT RULES LOGIC ---
  const saveRule = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("Mempersiapkan data...");
    try {
      const payload = {
        code: ruleForm.code,
        name: ruleForm.name,
        type: ruleForm.type,
        default_point: Math.abs(parseInt(ruleForm.default_point)) || 0
      };
      
      setErrorMsg("Menyimpan ke database...");
      const res = await fetch('/api/point-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingId ? 'update' : 'insert',
          id: editingId,
          payload
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan aturan poin');

      // Update local state directly
      const savedItem = data.data && data.data[0] ? data.data[0] : { id: editingId || Date.now().toString(), ...payload };
      if (editingId) {
        setPointRules(prev => prev.map(item => item.id === editingId ? savedItem : item));
      } else {
        setPointRules(prev => [...prev, savedItem].sort((a, b) => a.name.localeCompare(b.name)));
      }

      setShowRuleModal(false);
      setEditingId(null);
      setRuleForm({ code: '', name: '', type: 'NEGATIF', default_point: 5 });
      setErrorMsg("");
      
      fetchData().catch(err => console.error(err));
    } catch (error) {
      console.error("Error saveRule:", error);
      setErrorMsg(error?.message || "Terjadi kesalahan yang tidak diketahui.");
    } finally {
      setSaving(false);
    }
  };

  const editRule = (r) => {
    setEditingId(r.id);
    setRuleForm({ code: r.code, name: r.name, type: r.type, default_point: r.default_point });
    setShowRuleModal(true);
  };

  const deleteRule = async (id) => {
    if (profile.role !== 'ADMIN') {
      alert("Hanya Admin Utama yang berwenang menghapus tata tertib poin.");
      return;
    }
    if (!confirm("Yakin hapus aturan ini?")) return;
    try {
      // Optimistic delete
      setPointRules(prev => prev.filter(item => item.id !== id));

      const res = await fetch('/api/point-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus aturan poin');
      
      fetchData().catch(err => console.error(err));
    } catch (err) {
      alert("Gagal menghapus: " + err.message);
      await fetchData();
    }
  };

  // --- EKSKUL LOGIC ---
  const saveEkskul = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("Mempersiapkan data...");
    try {
      const payload = {
        name: ekskulForm.name,
        category: ekskulForm.category,
        coach_id: ekskulForm.coach_id || null
      };

      setErrorMsg("Menyimpan ke database...");
      const res = await fetch('/api/extracurriculars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: editingId ? 'update' : 'insert',
          id: editingId,
          payload
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan ekstrakurikuler');

      // Update local state directly
      const savedItem = data.data && data.data[0] ? data.data[0] : { id: editingId || Date.now().toString(), ...payload };
      const coachObj = teachers.find(t => t.id === payload.coach_id);
      savedItem.coach = coachObj ? { full_name: coachObj.full_name } : null;

      if (editingId) {
        setExtracurriculars(prev => prev.map(item => item.id === editingId ? savedItem : item));
      } else {
        setExtracurriculars(prev => [...prev, savedItem].sort((a, b) => a.name.localeCompare(b.name)));
      }

      setShowEkskulModal(false);
      setEditingId(null);
      setEkskulForm({ name: '', category: 'Pilihan', coach_id: '' });
      setErrorMsg("");
      
      fetchData().catch(err => console.error(err));
    } catch (error) {
      console.error("Error saveEkskul:", error);
      setErrorMsg(error?.message || "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  };

  const editEkskul = (e_item) => {
    setEditingId(e_item.id);
    setEkskulForm({ name: e_item.name, category: e_item.category, coach_id: e_item.coach_id || '' });
    setShowEkskulModal(true);
  };

  const deleteEkskul = async (id) => {
    if (profile.role !== 'ADMIN') {
      alert("Hanya Admin Utama yang berwenang menghapus ekstrakurikuler.");
      return;
    }
    if (!confirm("Yakin hapus ekskul ini?")) return;
    try {
      // Optimistic delete
      setExtracurriculars(prev => prev.filter(item => item.id !== id));

      const res = await fetch('/api/extracurriculars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus ekstrakurikuler');
      
      fetchData().catch(err => console.error(err));
    } catch (err) {
      alert("Gagal menghapus: " + err.message);
      await fetchData();
    }
  };

  // --- VIOLATION (PELANGGARAN) LOGIC ---
  const savePelanggaran = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const selectedRule = pointRules.find(r => r.id === pelanggaranForm.rule_id);
      const points = selectedRule ? selectedRule.default_point : 5;

      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'insert_violation',
          payload: {
            student_id: pelanggaranForm.student_id,
            teacher_id: profile.id,
            rule_id: pelanggaranForm.rule_id,
            description: pelanggaranForm.description,
            event_date: pelanggaranForm.event_date,
            points
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mencatat pelanggaran');

      setPelanggaranForm({
        student_id: '', rule_id: '', description: '', event_date: new Date().toISOString().split('T')[0]
      });
      alert("Pelanggaran siswa berhasil diinput dan poin negatif telah dipotong!");
      setActiveTab('siswa');
    } catch (err) {
      alert("Gagal mencatat pelanggaran: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- PERMISSION (PERIZINAN PIKET) LOGIC ---
  const handleApprovePermission = async (id, newStatus) => {
    if (!confirm(`Apakah Anda yakin ingin ${newStatus === 'DISETUJUI' ? 'MENYETUJUI' : 'MENOLAK'} permohonan izin ini?`)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: newStatus,
          approver_id: profile.id
        })
      });
      if (res.ok) {
        alert(`Status izin berhasil diubah menjadi ${newStatus}!`);
        await fetchData();
      } else {
        const err = await res.json();
        alert("Gagal mengubah status: " + err.error);
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApproveViolation = async (activity, newStatus) => {
    const actionText = newStatus === 'APPROVED' ? 'MENYETUJUI' : 'MENOLAK';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} laporan pelanggaran ini?`)) return;
    
    setSaving(true);
    try {
      if (newStatus === 'APPROVED') {
        const res = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'approve_violation',
            payload: {
              id: activity.id,
              student_id: activity.student_id,
              teacher_id: activity.teacher_id,
              points: activity.rule?.default_point || 0
            }
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menyetujui laporan');

        alert("Laporan pelanggaran disetujui, poin siswa telah dikurangi!");
      } else {
        const res = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reject_violation',
            id: activity.id
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal menolak laporan');

        alert("Laporan pelanggaran berhasil ditolak.");
      }

      await fetchData();
    } catch (err) {
      alert("Gagal memproses laporan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApprovePositiveActivity = async (id, action) => {
    const actionText = action === 'APPROVED' ? 'MENYETUJUI' : 'MENOLAK';
    if (!confirm(`Apakah Anda yakin ingin ${actionText} permohonan aktivitas positif ini?`)) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('sr_activities')
        .update({ status: action })
        .eq('id', id);

      if (error) throw error;

      if (action === 'APPROVED') {
        const act = positiveActivities.find(a => a.id === id);
        if (act) {
          const points = act.point_override || act.sr_point_rules?.default_point || 0;
          const { error: ledgerError } = await supabase
            .from('sr_point_ledgers')
            .insert([{
              student_id: act.student_id,
              source_type: 'AKTIVITAS_POSITIF',
              source_id: id,
              delta_point: points
            }]);
          if (ledgerError) throw ledgerError;
        }
      }

      alert(`Aktivitas berhasil di-${action === 'APPROVED' ? 'setujui' : 'tolak'}!`);
      await fetchData();
    } catch (err) {
      alert("Gagal memproses persetujuan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !profile) {
    return <div className="text-center text-muted py-20">Memeriksa hak akses...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Manajemen Kesiswaan</h1>
          <p className="text-muted">Kelola Siswa, Kedisiplinan Poin, Perizinan Piket, dan Ekstrakurikuler</p>
        </div>
      </div>

      <div className="tabs-container">
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'siswa' ? 'active' : ''}`} onClick={() => {setActiveTab('siswa'); setSearchQuery(''); setFilterClass('');}}>
          <GraduationCap size={18} /> Master Siswa
        </button>
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'aturan' ? 'active' : ''}`} onClick={() => {setActiveTab('aturan'); setSearchQuery('');}}>
          <AlertTriangle size={18} /> Tata Tertib (Poin)
        </button>
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'ekskul' ? 'active' : ''}`} onClick={() => {setActiveTab('ekskul'); setSearchQuery('');}}>
          <Activity size={18} /> Ekstrakurikuler
        </button>
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'pelanggaran' ? 'active' : ''}`} onClick={() => {setActiveTab('pelanggaran'); setSearchQuery('');}}>
          <AlertCircle size={18} /> Input Pelanggaran
        </button>
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'perizinan' ? 'active' : ''}`} onClick={() => {setActiveTab('perizinan'); setSearchQuery('');}}>
          <FileText size={18} /> Perizinan Piket
        </button>
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'persetujuan' ? 'active' : ''}`} onClick={() => {setActiveTab('persetujuan'); setSearchQuery('');}}>
          <ShieldCheck size={18} /> Persetujuan Laporan
        </button>
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'persetujuan_aktivitas' ? 'active' : ''}`} onClick={() => {setActiveTab('persetujuan_aktivitas'); setSearchQuery('');}}>
          <Check size={18} /> Persetujuan Aktivitas
        </button>
        <button className={`tab-button flex items-center gap-2 ${activeTab === 'rapor' ? 'active' : ''}`} onClick={() => {setActiveTab('rapor'); setSearchQuery(''); setFilterClass('');}}>
          <FileSpreadsheet size={18} /> Laporan & Rapor
        </button>
      </div>

      <div className="glass-panel">
        <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
          {activeTab !== 'pelanggaran' && activeTab !== 'perizinan' && activeTab !== 'persetujuan' && activeTab !== 'persetujuan_aktivitas' ? (
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
          ) : (
            <div style={{flexGrow: 1}} />
          )}

          {activeTab === 'siswa' && (
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center'}}>
              <select 
                className="form-input" 
                style={{maxWidth: 160}}
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="">-- Semua Kelas --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {!isReadOnly && (
                <>
                  <input type="file" id="import-siswa-file" accept=".xlsx, .xls, .csv" onChange={handleImportSiswa} style={{ display: 'none' }} />
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => downloadTemplateExcel('siswa')}>
                    <Download size={16} /> Template Impor
                  </button>
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => document.getElementById('import-siswa-file').click()}>
                    <FileSpreadsheet size={16} /> Impor Excel
                  </button>
                </>
              )}
              <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportSiswa}>
                <FileSpreadsheet size={16} /> Ekspor Excel
              </button>
              {!isReadOnly && (
                <button className="btn-primary flex items-center gap-2" onClick={() => setShowSiswaModal(true)}>
                  <Plus size={18} /> Daftarkan Siswa
                </button>
              )}
            </div>
          )}

          {activeTab === 'rapor' && (
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center'}}>
              <select 
                className="form-input" 
                style={{maxWidth: 160}}
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="">-- Semua Kelas --</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {activeTab === 'aturan' && (
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
              {!isReadOnly && (
                <>
                  <input type="file" id="import-aturan-file" accept=".xlsx, .xls, .csv" onChange={handleImportAturan} style={{ display: 'none' }} />
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => downloadTemplateExcel('aturan')}>
                    <Download size={16} /> Template Impor
                  </button>
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => document.getElementById('import-aturan-file').click()}>
                    <FileSpreadsheet size={16} /> Impor Excel
                  </button>
                </>
              )}
              <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportAturan}>
                <FileSpreadsheet size={16} /> Ekspor Excel
              </button>
              {!isReadOnly && (
                <button className="btn-primary flex items-center gap-2" onClick={() => setShowRuleModal(true)}>
                  <Plus size={18} /> Tambah Aturan Poin
                </button>
              )}
            </div>
          )}

          {activeTab === 'ekskul' && (
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
              {!isReadOnly && (
                <>
                  <input type="file" id="import-ekskul-file" accept=".xlsx, .xls, .csv" onChange={handleImportEkskul} style={{ display: 'none' }} />
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => downloadTemplateExcel('ekskul')}>
                    <Download size={16} /> Template Impor
                  </button>
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => document.getElementById('import-ekskul-file').click()}>
                    <FileSpreadsheet size={16} /> Impor Excel
                  </button>
                </>
              )}
              <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportEkskul}>
                <FileSpreadsheet size={16} /> Ekspor Excel
              </button>
              {!isReadOnly && (
                <button className="btn-primary flex items-center gap-2" onClick={() => setShowEkskulModal(true)}>
                  <Plus size={18} /> Tambah Ekskul
                </button>
              )}
            </div>
          )}

          {activeTab === 'pelanggaran' && (
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
              {!isReadOnly && (
                <>
                  <input type="file" id="import-pelanggaran-file" accept=".xlsx, .xls, .csv" onChange={handleImportPelanggaran} style={{ display: 'none' }} />
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => downloadTemplateExcel('pelanggaran')}>
                    <Download size={16} /> Template Impor
                  </button>
                  <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={() => document.getElementById('import-pelanggaran-file').click()}>
                    <FileSpreadsheet size={16} /> Impor Excel
                  </button>
                </>
              )}
              <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportPelanggaran}>
                <FileSpreadsheet size={16} /> Ekspor Laporan
              </button>
            </div>
          )}

          {activeTab === 'perizinan' && (
            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
              <button className="btn-secondary flex items-center gap-2" style={{background: 'transparent', border: '1px solid var(--surface-border)'}} onClick={handleExportPermissions}>
                <FileSpreadsheet size={16} /> Ekspor Excel
              </button>
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

        {loading ? (
          <div className="text-center text-muted py-10">Memuat data...</div>
        ) : (
          <div className="data-table-container">

            {/* TAB SISWA */}
            {activeTab === 'siswa' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th>NISN / NIS</th>
                    <th>Kelas</th>
                    <th>JK</th>
                    {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter(s => s.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .filter(s => filterClass ? s.class_id === filterClass : true)
                    .map((s) => (
                    <tr key={s.profile_id}>
                      <td>
                        <div style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{s.profile?.full_name}</div>
                        <div style={{fontSize: 12, color: 'var(--text-muted)'}}>{s.profile?.email}</div>
                      </td>
                      <td>
                        <div>{s.nisn || '-'}</div>
                        <div style={{fontSize: 12, color: 'var(--text-muted)'}}>NIS: {s.nis || '-'}</div>
                      </td>
                      <td><span className="badge badge-success">{s.kelas?.name || 'Belum ada kelas'}</span></td>
                      <td>{s.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                      {!isReadOnly && (
                        <td style={{textAlign: 'right'}}>
                          <button onClick={() => editSiswa(s)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}>Edit</button>
                          <button onClick={() => deleteSiswa(s.profile_id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {students.length === 0 && <tr><td colSpan="5" className="text-center text-muted">Belum ada data siswa.</td></tr>}
                </tbody>
              </table>
            )}

            {/* TAB ATURAN POIN */}
            {activeTab === 'aturan' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Deskripsi Aturan</th>
                    <th>Jenis</th>
                    <th>Bobot Poin</th>
                    {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {pointRules.filter(r => r.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((r) => (
                    <tr key={r.id}>
                      <td><span style={{fontFamily: 'monospace', color: 'var(--text-muted)'}}>{r.code}</span></td>
                      <td style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{r.name}</td>
                      <td>
                        <span className={`badge ${
                          r.type === 'POSITIF' ? 'badge-primary' : 
                          r.type === 'NEGATIF' ? 'badge-warning' : 'badge-success'
                        }`}>
                          {r.type}
                        </span>
                      </td>
                      <td>
                        <span style={{color: r.type === 'NEGATIF' ? '#ef4444' : '#10b981', fontWeight: 'bold', fontSize: 16}}>
                          {r.type === 'NEGATIF' ? '-' : '+'}{r.default_point}
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td style={{textAlign: 'right'}}>
                          <button onClick={() => editRule(r)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}>Edit</button>
                          <button onClick={() => deleteRule(r.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {pointRules.length === 0 && <tr><td colSpan="5" className="text-center text-muted">Belum ada aturan poin.</td></tr>}
                </tbody>
              </table>
            )}

            {/* TAB EKSKUL */}
            {activeTab === 'ekskul' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nama Ekstrakurikuler</th>
                    <th>Sifat / Kategori</th>
                    <th>Guru Pembina</th>
                    {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {extracurriculars.filter(e => e.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((e) => (
                    <tr key={e.id}>
                      <td style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{e.name}</td>
                      <td><span className="badge badge-success">{e.category}</span></td>
                      <td>{e.coach?.full_name || <span className="text-muted italic">Belum ditentukan</span>}</td>
                      {!isReadOnly && (
                        <td style={{textAlign: 'right'}}>
                          <button onClick={() => editEkskul(e)} className="text-muted hover:text-primary" style={{background: 'transparent', color: 'var(--primary-color)', marginRight: 15}}>Edit</button>
                          <button onClick={() => deleteEkskul(e.id)} className="text-muted hover:text-red-500" style={{background: 'transparent', color: 'var(--danger-color)'}}>Hapus</button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {extracurriculars.length === 0 && <tr><td colSpan="4" className="text-center text-muted">Belum ada data ekskul.</td></tr>}
                </tbody>
              </table>
            )}

            {/* INPUT PELANGGARAN */}
            {activeTab === 'pelanggaran' && (
              isReadOnly ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <p style={{ margin: 0, fontSize: 14 }}>Pencatatan pelanggaran dinonaktifkan untuk akun Kepala Sekolah (Read-Only).</p>
                </div>
              ) : (
                <form onSubmit={savePelanggaran} style={{maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16}}>
                  <h3 style={{fontSize: 18, marginBottom: 8}}>Catat Pelanggaran Kedisiplinan Siswa</h3>
                  
                  <div className="form-group">
                    <label>Pilih Siswa Pelanggar</label>
                    <select 
                      className="form-input" 
                      required 
                      value={pelanggaranForm.student_id} 
                      onChange={e => setPelanggaranForm({...pelanggaranForm, student_id: e.target.value})}
                    >
                      <option value="">-- Pilih Siswa --</option>
                      {studentProfiles.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.class_name || 'Tidak Ada Kelas'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Jenis Pelanggaran (Aturan Tata Tertib)</label>
                    <select 
                      className="form-input" 
                      required 
                      value={pelanggaranForm.rule_id} 
                      onChange={e => setPelanggaranForm({...pelanggaranForm, rule_id: e.target.value})}
                    >
                      <option value="">-- Pilih Jenis Pelanggaran --</option>
                      {pointRules.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} (Kurang {r.default_point} Poin)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{display: 'flex', gap: 15}}>
                    <div className="form-group" style={{flex: 1}}>
                      <label>Tanggal Kejadian</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        required 
                        value={pelanggaranForm.event_date} 
                        onChange={e => setPelanggaranForm({...pelanggaranForm, event_date: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Kronologi / Keterangan Kejadian</label>
                    <textarea 
                      className="form-input" 
                      rows="3" 
                      required 
                      value={pelanggaranForm.description} 
                      onChange={e => setPelanggaranForm({...pelanggaranForm, description: e.target.value})}
                      placeholder="Contoh: Siswa melompati pagar samping saat jam pelajaran..."
                      style={{resize: 'vertical', minHeight: 80, fontFamily: 'inherit'}}
                    />
                  </div>

                  <button type="submit" className="btn-primary" disabled={saving} style={{padding: 14, fontSize: 15, marginTop: 10}}>
                    {saving ? 'Menyimpan Pelanggaran...' : 'Catat Pelanggaran & Potong Poin'}
                  </button>
                </form>
              )
            )}

            {/* PERIZINAN PIKET */}
            {activeTab === 'perizinan' && (
              <div>
                <h3 style={{fontSize: 18, marginBottom: 12}}>Daftar Pengajuan Izin Siswa (Piket)</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Waktu Mengajukan</th>
                      <th>Siswa</th>
                      <th>Jenis Izin</th>
                      <th>Durasi / Waktu Izin</th>
                      <th>Alasan</th>
                      <th>Status</th>
                      {!isReadOnly && <th style={{textAlign: 'right'}}>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((perm) => (
                      <tr key={perm.id}>
                        <td>{new Date(perm.created_at).toLocaleString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</td>
                        <td>
                          <div style={{fontWeight: 'bold', color: 'var(--text-light)'}}>{perm.student?.full_name}</div>
                          <div className="text-muted" style={{fontSize: 12}}>{perm.student?.class_name}</div>
                        </td>
                        <td><span className="badge badge-warning">{perm.tipe}</span></td>
                        <td><strong>{perm.waktu}</strong></td>
                        <td style={{maxWidth: 200}}>{perm.alasan}</td>
                        <td>
                          <span className={`badge ${
                            perm.status === 'DISETUJUI' ? 'badge-success' :
                            perm.status === 'DITOLAK' ? 'badge-danger' : 'badge-warning'
                          }`}>
                            {perm.status}
                          </span>
                        </td>
                        {!isReadOnly && (
                          <td style={{textAlign: 'right'}}>
                            {perm.status === 'PENDING' ? (
                              <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end'}}>
                                <button 
                                  onClick={() => handleApprovePermission(perm.id, 'DISETUJUI')}
                                  style={{background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', border: 'none'}}
                                >
                                  <Check size={14} /> Setujui
                                </button>
                                <button 
                                  onClick={() => handleApprovePermission(perm.id, 'DITOLAK')}
                                  style={{background: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '6px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', border: 'none'}}
                                >
                                  <X size={14} /> Tolak
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted italic" style={{fontSize: 12}}>Diproses</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {permissions.length === 0 && <tr><td colSpan="7" className="text-center text-muted py-8">Belum ada pengajuan izin dari siswa.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB PERSETUJUAN LAPORAN (QUEUE APPROVAL) */}
            {activeTab === 'persetujuan' && (
              <div>
                <h3 style={{ fontSize: 18, marginBottom: 12 }}>Antrean Persetujuan Laporan Pelanggaran Guru</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Tanggal Lapor</th>
                      <th>Siswa Pelanggar</th>
                      <th>Pelanggaran & Bobot</th>
                      <th>Kronologi Kejadian</th>
                      <th>Guru Pelapor</th>
                      <th style={{ textAlign: 'center' }}>Bukti Foto</th>
                      {!isReadOnly && <th style={{ textAlign: 'right' }}>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingViolations.map((act) => (
                      <tr key={act.id}>
                        <td style={{ fontSize: 12 }}>
                          {new Date(act.event_date || act.created_at).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })} WIB
                        </td>
                        <td>
                          <div style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>{act.student?.full_name}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{act.student?.class_name || 'Tanpa Kelas'}</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 'bold', color: '#ef4444' }}>{act.rule?.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Poin -{act.rule?.default_point}</div>
                        </td>
                        <td style={{ maxWidth: 200, fontSize: 12, wordBreak: 'break-word' }}>
                          {act.description}
                        </td>
                        <td>
                          <div style={{ fontWeight: 'bold', color: 'var(--text-light)', fontSize: 12 }}>{act.teacher?.full_name || 'Guru'}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {act.attachment_url ? (
                            <a 
                              href={act.attachment_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn-secondary"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, background: 'rgba(255,255,255,0.05)', borderColor: 'var(--surface-border)' }}
                            >
                              <ImageIcon size={12} /> Lihat Foto
                            </a>
                          ) : (
                            <span className="text-muted italic" style={{ fontSize: 11 }}>Tidak ada</span>
                          )}
                        </td>
                        {!isReadOnly && (
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => handleApproveViolation(act, 'APPROVED')}
                                style={{
                                  background: 'rgba(16,185,129,0.2)', color: '#34d399', 
                                  padding: '6px 12px', borderRadius: 6, display: 'flex', 
                                  alignItems: 'center', gap: 4, cursor: 'pointer', border: 'none',
                                  fontWeight: 'bold', fontSize: 11
                                }}
                              >
                                <Check size={12} /> Setujui
                              </button>
                              <button 
                                onClick={() => handleApproveViolation(act, 'REJECTED')}
                                style={{
                                  background: 'rgba(239,68,68,0.2)', color: '#f87171', 
                                  padding: '6px 12px', borderRadius: 6, display: 'flex', 
                                  alignItems: 'center', gap: 4, cursor: 'pointer', border: 'none',
                                  fontWeight: 'bold', fontSize: 11
                                }}
                              >
                                <X size={12} /> Tolak
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {pendingViolations.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center text-muted py-8" style={{ fontStyle: 'italic', fontSize: 13 }}>
                          Tidak ada laporan pelanggaran guru yang memerlukan persetujuan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB PERSETUJUAN AKTIVITAS */}
            {activeTab === 'persetujuan_aktivitas' && (
              <div>
                <h3 style={{ fontSize: 18, marginBottom: 12 }}>Persetujuan Aktivitas Positif Siswa</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Waktu Pengajuan</th>
                      <th>Siswa</th>
                      <th>Kategori / Poin</th>
                      <th>Keterangan</th>
                      <th style={{ textAlign: 'center' }}>Bukti Foto</th>
                      {!isReadOnly && <th style={{ textAlign: 'right' }}>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {positiveActivities.map((act) => (
                      <tr key={act.id}>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {new Date(act.event_date || act.created_at).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })} WIB
                        </td>
                        <td>
                          <div style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>{act.sr_profiles?.full_name}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>{act.sr_profiles?.class_name || 'Tanpa Kelas'}</div>
                        </td>
                        <td>
                          <span className="badge badge-success">
                            {act.sr_point_rules?.name || act.type} (+{act.point_override || act.sr_point_rules?.default_point || 0} Poin)
                          </span>
                        </td>
                        <td style={{ maxWidth: 200, fontSize: 12, wordBreak: 'break-word' }}>
                          {act.description}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {act.attachment_url ? (
                            <a 
                              href={act.attachment_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn-secondary"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, background: 'rgba(255,255,255,0.05)', borderColor: 'var(--surface-border)' }}
                            >
                              <ImageIcon size={12} /> Lihat Foto
                            </a>
                          ) : (
                            <span className="text-muted italic" style={{ fontSize: 11 }}>Tidak ada</span>
                          )}
                        </td>
                        {!isReadOnly && (
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => handleApprovePositiveActivity(act.id, 'APPROVED')}
                                style={{
                                  background: 'rgba(16,185,129,0.2)', color: '#34d399', 
                                  padding: '6px 12px', borderRadius: 6, display: 'flex', 
                                  alignItems: 'center', gap: 4, cursor: 'pointer', border: 'none',
                                  fontWeight: 'bold', fontSize: 11
                                }}
                              >
                                <Check size={12} /> Setujui
                              </button>
                              <button 
                                onClick={() => handleApprovePositiveActivity(act.id, 'REJECTED')}
                                style={{
                                  background: 'rgba(239,68,68,0.2)', color: '#f87171', 
                                  padding: '6px 12px', borderRadius: 6, display: 'flex', 
                                  alignItems: 'center', gap: 4, cursor: 'pointer', border: 'none',
                                  fontWeight: 'bold', fontSize: 11
                                }}
                              >
                                <X size={12} /> Tolak
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {positiveActivities.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-8" style={{ fontStyle: 'italic', fontSize: 13 }}>
                          Tidak ada pengajuan aktivitas positif yang memerlukan persetujuan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB LAPORAN & RAPOR */}
            {activeTab === 'rapor' && (
              <div>
                <h3 style={{ fontSize: 18, marginBottom: 12 }}>Cetak Rapor Karakter & Ekskul Siswa</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nama Lengkap</th>
                      <th>Kelas</th>
                      <th>NISN</th>
                      <th style={{ textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students
                      .filter(s => s.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || s.kelas?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                      .filter(s => filterClass ? s.class_id === filterClass : true)
                      .map((s) => (
                        <tr key={s.profile_id}>
                          <td style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>{s.profile?.full_name}</td>
                          <td><span className="badge badge-primary">{s.kelas?.name || 'Belum Diatur'}</span></td>
                          <td className="text-muted">{s.nisn || '-'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button 
                              onClick={() => router.push(`/admin/reports/${s.profile_id}`)} 
                              className="btn-primary" 
                              style={{ padding: '6px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 'bold' }}
                            >
                              <Printer size={14} /> Buka Rapor
                            </button>
                          </td>
                        </tr>
                      ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan="4" className="text-center text-muted py-4">Tidak ada data siswa ditemukan.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* MODAL SISWA */}
      {showSiswaModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Data Siswa' : 'Registrasi Siswa Baru'}</h2>
              <button onClick={() => {setShowSiswaModal(false); setEditingId(null); setSiswaForm({ full_name: '', email: '', nisn: '', nis: '', gender: 'L', class_id: '' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveSiswa}>
              <div className="modal-body">
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Nama Lengkap</label>
                    <input type="text" className="form-input" required value={siswaForm.full_name} onChange={e => setSiswaForm({...siswaForm, full_name: e.target.value})} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Email Akademik (Login)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={editingId ? siswaForm.email : (siswaForm.nisn ? `${siswaForm.nisn}@lensa.smanda.id` : '')} 
                      disabled 
                      placeholder="Auto-generated dari NISN" 
                    />
                  </div>
                </div>
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>NISN</label>
                    <input type="text" className="form-input" required value={siswaForm.nisn} onChange={e => setSiswaForm({...siswaForm, nisn: e.target.value})} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Jenis Kelamin</label>
                    <select className="form-input" value={siswaForm.gender} onChange={e => setSiswaForm({...siswaForm, gender: e.target.value})}>
                      <option value="L">Laki-Laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Kelas Saat Ini</label>
                  <select className="form-input" required value={siswaForm.class_id} onChange={e => setSiswaForm({...siswaForm, class_id: e.target.value})}>
                    <option value="">-- Pilih Kelas --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {!editingId && (
                  <div className="p-2 mt-2 rounded" style={{background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: 12, color: 'var(--text-muted)'}}>
                    ℹ️ Akun login & Password default akan di-generate otomatis menggunakan NISN.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowSiswaModal(false); setEditingId(null); setSiswaForm({ full_name: '', email: '', nisn: '', nis: '', gender: 'L', class_id: '' });}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Memproses...' : editingId ? 'Simpan Perubahan' : 'Daftarkan Siswa'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ATURAN POIN */}
      {showRuleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Aturan Poin' : 'Tambah Aturan Poin Baru'}</h2>
              <button onClick={() => {setShowRuleModal(false); setEditingId(null); setRuleForm({ code: '', name: '', type: 'NEGATIF', default_point: 5 });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveRule}>
              <div className="modal-body">
                {errorMsg && (
                  <div className="p-3 mb-4 rounded" style={{background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)'}}>
                    {errorMsg}
                  </div>
                )}
                <div className="form-group">
                  <label>Kode Pelanggaran/Prestasi</label>
                  <input type="text" className="form-input" required value={ruleForm.code} onChange={e => {setRuleForm({...ruleForm, code: e.target.value}); setErrorMsg('');}} placeholder="Cth: PLG-01 atau PRS-01" />
                </div>
                <div className="form-group">
                  <label>Deskripsi Aturan</label>
                  <input type="text" className="form-input" required value={ruleForm.name} onChange={e => {setRuleForm({...ruleForm, name: e.target.value}); setErrorMsg('');}} placeholder="Cth: Terlambat Masuk Sekolah" />
                </div>
                <div style={{display: 'flex', gap: 15}}>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Jenis Poin</label>
                    <select className="form-input" value={ruleForm.type} onChange={e => setRuleForm({...ruleForm, type: e.target.value})}>
                      <option value="NEGATIF">Poin Negatif (Pelanggaran)</option>
                      <option value="POSITIF">Poin Positif (Prestasi)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Bobot Poin</label>
                    <input type="number" className="form-input" required value={ruleForm.default_point} onChange={e => setRuleForm({...ruleForm, default_point: e.target.value})} min="1" max="1000" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowRuleModal(false); setEditingId(null); setRuleForm({ code: '', name: '', type: 'NEGATIF', default_point: 5 }); setErrorMsg('');}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Sedang Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Aturan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EKSKUL */}
      {showEkskulModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: 18}}>{editingId ? 'Edit Unit Ekstrakurikuler' : 'Tambah Unit Ekstrakurikuler'}</h2>
              <button onClick={() => {setShowEkskulModal(false); setEditingId(null); setEkskulForm({ name: '', category: 'Pilihan', coach_id: '' });}} style={{background: 'transparent', color: 'var(--text-muted)'}}><X size={24} /></button>
            </div>
            <form onSubmit={saveEkskul}>
              <div className="modal-body">
                {errorMsg && (
                  <div className="p-3 mb-4 rounded" style={{background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)'}}>
                    {errorMsg}
                  </div>
                )}
                <div className="form-group">
                  <label>Nama Ekstrakurikuler</label>
                  <input type="text" className="form-input" required value={ekskulForm.name} onChange={e => {setEkskulForm({...ekskulForm, name: e.target.value}); setErrorMsg('');}} placeholder="Cth: Pasukan Pengibar Bendera" />
                </div>
                <div className="form-group">
                  <label>Kategori/Sifat</label>
                  <select className="form-input" value={ekskulForm.category} onChange={e => setEkskulForm({...ekskulForm, category: e.target.value})}>
                    <option value="Wajib">Wajib</option>
                    <option value="Pilihan">Pilihan Ekstra</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Guru Pembina</label>
                  <select className="form-input" value={ekskulForm.coach_id} onChange={e => setEkskulForm({...ekskulForm, coach_id: e.target.value})}>
                    <option value="">-- Belum Ditentukan --</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => {setShowEkskulModal(false); setEditingId(null); setEkskulForm({ name: '', category: 'Pilihan', coach_id: '' }); setErrorMsg('');}}>Batal</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Sedang Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Ekskul'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
