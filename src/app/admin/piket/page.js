"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Search, UserCheck, Clock, AlertTriangle, AlertCircle, RefreshCw, ClipboardList, Check, X, ShieldAlert, BookOpen } from 'lucide-react';

export default function PiketDashboard() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [manualStatus, setManualStatus] = useState('HADIR');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingRecords, setUpdatingRecords] = useState(false);

  // Security Check
  useEffect(() => {
    if (!authLoading) {
      if (!profile || (profile.role !== 'ADMIN' && !profile.is_piket)) {
        router.replace('/admin');
      } else {
        initPage();
      }
    }
  }, [profile, authLoading, router]);

  const initPage = async () => {
    setLoading(true);
    try {
      // 1. Ambil atau Buat Sesi Harian Masuk hari ini
      const activeSession = await getOrCreateTodaySession();
      setSession(activeSession);

      if (activeSession) {
        // 2. Ambil semua siswa untuk pencarian presensi manual
        const { data: students, error: stdErr } = await supabase
          .from('sr_profiles')
          .select('id, full_name, email, nomor_induk, class_name')
          .eq('role', 'SISWA')
          .order('full_name');

        if (!stdErr && students) {
          setAllStudents(students);
        }

        // 3. Ambil log presensi untuk sesi hari ini
        await fetchRecords(activeSession.id);
      }
    } catch (e) {
      console.error("Gagal menginisialisasi halaman piket:", e);
    } finally {
      setLoading(false);
    }
  };

  const getOrCreateTodaySession = async () => {
    const todayStr = new Date().toLocaleDateString('en-CA'); // format YYYY-MM-DD
    const todayStart = `${todayStr}T00:00:00.000Z`;
    const todayEnd = `${todayStr}T23:59:59.999Z`;

    // Cari sesi HARIAN_MASUK hari ini
    const { data: existing, error } = await supabase
      .from('sr_attendance_sessions')
      .select('*')
      .eq('session_type', 'HARIAN_MASUK')
      .gte('start_time', todayStart)
      .lte('start_time', todayEnd)
      .limit(1);

    if (!error && existing && existing.length > 0) {
      return existing[0];
    }

    // Jika tidak ada, buat sesi baru otomatis
    const qrToken = `pagi-${todayStr}-${Math.random().toString(36).substring(2, 9)}`;
    const payload = {
      teacher_id: profile.id,
      session_type: 'HARIAN_MASUK',
      target_class: 'SEMUA',
      start_time: `${todayStr}T06:00:00.000Z`,
      end_time: `${todayStr}T08:00:00.000Z`,
      qr_token: qrToken,
      title: 'Masuk Harian Piket'
    };

    const { data: created, error: createError } = await supabase
      .from('sr_attendance_sessions')
      .insert([payload])
      .select();

    if (!createError && created && created.length > 0) {
      return created[0];
    }
    
    console.warn("Gagal insert sesi baru, fallback mock session.");
    return {
      id: 'mock-session-today',
      ...payload
    };
  };

  const fetchRecords = async (sessionId) => {
    setUpdatingRecords(true);
    const { data, error } = await supabase
      .from('sr_attendance_records')
      .select(`
        *,
        student:student_id (full_name, email, nomor_induk, class_name)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRecords(data);
    }
    setUpdatingRecords(false);
  };

  const handleManualPresensi = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !session) return;

    setSubmitting(true);
    try {
      const payload = {
        session_id: session.id,
        student_id: selectedStudent.id,
        status: manualStatus,
        reason: notes || 'Presensi manual oleh guru piket',
        latitude: null,
        longitude: null
      };

      // Cek apakah data presensi siswa untuk sesi ini sudah ada
      const { data: existingRecord } = await supabase
        .from('sr_attendance_records')
        .select('id')
        .eq('session_id', session.id)
        .eq('student_id', selectedStudent.id)
        .limit(1);

      let resError;
      if (existingRecord && existingRecord.length > 0) {
        // Update record
        const { error } = await supabase
          .from('sr_attendance_records')
          .update({
            status: manualStatus,
            reason: notes || 'Diperbarui oleh guru piket'
          })
          .eq('id', existingRecord[0].id);
        resError = error;
      } else {
        // Insert record baru
        const { error } = await supabase
          .from('sr_attendance_records')
          .insert([payload]);
        resError = error;
      }

      if (resError) {
        alert("Gagal mencatat presensi: " + resError.message);
      } else {
        alert(`Berhasil mencatat presensi ${selectedStudent.full_name} sebagai ${manualStatus}`);
        setSelectedStudent(null);
        setNotes('');
        setSearchQuery('');
        // Refresh log records
        await fetchRecords(session.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetRecord = async (recordId) => {
    if (!window.confirm("Hapus pencatatan presensi siswa ini?")) return;
    
    setUpdatingRecords(true);
    const { error } = await supabase
      .from('sr_attendance_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      alert("Gagal menghapus log: " + error.message);
    } else {
      await fetchRecords(session.id);
    }
    setUpdatingRecords(false);
  };

  // Pencarian Siswa
  const filteredStudents = searchQuery.trim() === '' ? [] : allStudents.filter(s => 
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nomor_induk?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.class_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5); // Tampilkan maksimal 5 hasil

  // Perhitungan Statistik
  const totalSiswa = allStudents.length;
  const loggedIds = records.map(r => r.student_id);
  
  const stats = {
    hadir: records.filter(r => r.status === 'HADIR').length,
    terlambat: records.filter(r => r.status === 'TERLAMBAT').length,
    izinSakit: records.filter(r => ['SAKIT', 'IZIN', 'DISPEN'].includes(r.status)).length,
    alpa: totalSiswa - records.length
  };

  if (authLoading || loading) {
    return <div className="text-center text-muted py-20">Memuat Sistem Piket...</div>;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--primary-color)', marginBottom: 4 }}>
          <ClipboardList size={20} />
          <span style={{ fontWeight: '600', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' }}>
            Panel Guru Piket Harian
          </span>
        </div>
        <h1>Presensi Pagi (Piket)</h1>
        <p className="text-muted">Kelola pencatatan masuk harian siswa secara manual dan pantau statistik real-time.</p>
      </div>

      {/* Sesi Info */}
      {session && (
        <div className="glass-panel" style={{ background: 'var(--radial-glow-1)', borderLeft: '5px solid var(--primary-color)', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, color: 'var(--text-light)' }}>Sesi Aktif: {session.title || 'Masuk Harian'}</h4>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Token QR: <code>{session.qr_token}</code> | Target: {session.target_class}</p>
          </div>
          <button 
            onClick={() => fetchRecords(session.id)}
            disabled={updatingRecords}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '6px 12px' }}
          >
            <RefreshCw size={12} className={updatingRecords ? "animate-spin" : ""} /> Refresh Data
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 15 }}>
        {/* HADIR */}
        <div className="glass-panel text-center" style={{ display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Siswa Hadir</span>
          <h2 style={{ fontSize: 32, fontWeight: 'bold', color: '#10b981', margin: 0 }}>{stats.hadir}</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tepat Waktu</span>
        </div>

        {/* TERLAMBAT */}
        <div className="glass-panel text-center" style={{ display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Terlambat</span>
          <h2 style={{ fontSize: 32, fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>{stats.terlambat}</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Butuh Pengawasan</span>
        </div>

        {/* IZIN/SAKIT */}
        <div className="glass-panel text-center" style={{ display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #60a5fa' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Izin / Sakit / Dispen</span>
          <h2 style={{ fontSize: 32, fontWeight: 'bold', color: '#60a5fa', margin: 0 }}>{stats.izinSakit}</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dengan Keterangan</span>
        </div>

        {/* ALPA */}
        <div className="glass-panel text-center" style={{ display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Belum Hadir (Alpa)</span>
          <h2 style={{ fontSize: 32, fontWeight: 'bold', color: '#ef4444', margin: 0 }}>{stats.alpa}</h2>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dari total {totalSiswa} siswa</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
        {/* Kiri: Pencatatan Manual */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <h3>Presensi Manual Siswa</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -8 }}>Cari nama siswa untuk mencatat kehadiran atau mengubah status presensinya hari ini.</p>
          
          <div className="form-input flex items-center gap-2" style={{ width: '100%' }}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Cari siswa berdasarkan nama / NISN..." 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-light)', width: '100%', outline: 'none' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Hasil Pencarian */}
          {filteredStudents.length > 0 && (
            <div style={{ background: 'var(--card-inner-bg)', border: '1px solid var(--surface-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {filteredStudents.map(student => (
                <div 
                  key={student.id} 
                  onClick={() => {
                    setSelectedStudent(student);
                    const record = records.find(r => r.student_id === student.id);
                    if (record) {
                      setManualStatus(record.status);
                      setNotes(record.reason || '');
                    } else {
                      setManualStatus('HADIR');
                      setNotes('');
                    }
                  }}
                  style={{ padding: '10px 14px', borderBottom: '1px solid var(--surface-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}
                  className="search-row-hover"
                >
                  <div>
                    <div style={{ fontWeight: '600', color: 'var(--text-light)' }}>{student.full_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>NISN: {student.nomor_induk || '-'} | Kelas: {student.class_name || '-'}</div>
                  </div>
                  {records.some(r => r.student_id === student.id) ? (
                    <span style={{ fontSize: 10, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: 10, fontWeight: 'bold' }}>Sudah Input</span>
                  ) : (
                    <span style={{ fontSize: 10, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: 10, fontWeight: 'bold' }}>Belum Hadir</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Form Pencatatan Siswa Terpilih */}
          {selectedStudent && (
            <form onSubmit={handleManualPresensi} className="animate-fade-in" style={{ background: 'var(--card-inner-bg)', border: '1px solid var(--primary-color)', borderRadius: 'var(--radius-md)', padding: 15, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, color: 'var(--text-light)', fontWeight: 'bold' }}>{selectedStudent.full_name}</h4>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>NISN: {selectedStudent.nomor_induk} | Kelas: {selectedStudent.class_name}</p>
                </div>
                <button type="button" onClick={() => setSelectedStudent(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Pilih Status Presensi</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {['HADIR', 'TERLAMBAT', 'SAKIT', 'IZIN', 'DISPEN', 'ALPA'].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setManualStatus(status)}
                      style={{
                        padding: '6px 4px', fontSize: 11, fontWeight: 'bold', borderRadius: 6, border: '1px solid var(--surface-border)',
                        background: manualStatus === status ? 'var(--primary-color)' : 'rgba(0,0,0,0.1)',
                        color: manualStatus === status ? 'white' : 'var(--text-light)',
                        cursor: 'pointer'
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Catatan / Alasan Kehadiran</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Siswa terlambat karena ban bocor, atau manual presensi karena lupa membawa ponsel."
                  style={{
                    width: '100%', height: 60, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)',
                    borderRadius: 6, color: 'var(--text-light)', padding: 8, fontSize: 12, resize: 'none', outline: 'none'
                  }}
                />
              </div>

              <button 
                type="submit" 
                disabled={submitting} 
                className="btn-primary" 
                style={{ width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {submitting ? 'Menyimpan...' : 'Simpan Presensi'}
              </button>
            </form>
          )}
        </div>

        {/* Kanan: Log Presensi Hari Ini */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <h3>Log Presensi Hari Ini ({records.length})</h3>
          
          <div className="data-table-container" style={{ maxHeight: 450, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Siswa & Kelas</th>
                  <th>Status</th>
                  <th>Waktu & Keterangan</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>{record.student?.full_name || 'Tidak Ada Nama'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{record.student?.class_name || '-'} | NISN: {record.student?.nomor_induk || '-'}</div>
                    </td>
                    <td>
                      <span className={`badge ${
                        record.status === 'HADIR' ? 'badge-success' :
                        record.status === 'TERLAMBAT' ? 'badge-warning' :
                        record.status === 'ALPA' ? 'badge-danger' : 'badge-primary'
                      }`} style={{ fontSize: 10, padding: '2px 6px' }}>
                        {record.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, color: 'var(--text-light)' }}>
                        {new Date(record.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {record.reason && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.reason}>
                          {record.reason}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleResetRecord(record.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger-color)', cursor: 'pointer', padding: 4 }}
                        title="Hapus Log Kehadiran"
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center text-muted py-10">Belum ada siswa yang hadir hari ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* CSS internal khusus untuk hover pencarian */}
      <style jsx global>{`
        .search-row-hover:hover {
          background: rgba(37, 99, 235, 0.1) !important;
        }
      `}</style>
    </div>
  );
}
