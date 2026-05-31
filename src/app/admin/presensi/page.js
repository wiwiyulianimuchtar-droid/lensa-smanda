"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Plus, Clock, Users, Calendar, QrCode, Play, StopCircle, RefreshCw, CheckCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '@/lib/excelHelper';

export default function PresensiSessions() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const isReadOnly = profile?.is_kepsek;
  
  const getSessionTypeLabel = (session_type, title = '') => {
    let label = '';
    switch (session_type) {
      case 'HARIAN_MASUK':
        label = 'Masuk Harian';
        break;
      case 'HARIAN_PULANG':
        label = 'Pulang Harian';
        break;
      case 'MAPEL':
        label = 'Mapel KBM';
        break;
      case 'KEGIATAN':
        label = 'Kegiatan';
        break;
      case 'UJIAN':
        label = 'Ujian';
        break;
      case 'EKSKUL':
        label = 'Ekskul';
        break;
      default:
        label = 'Sesi Kelas';
    }
    if (title) {
      return `${label} - ${title}`;
    }
    return label;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  };
  
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [attendeeCount, setAttendeeCount] = useState(0);

  // Form State
  const [sessionType, setSessionType] = useState('HARIAN_MASUK');
  const [selectedClasses, setSelectedClasses] = useState(['SEMUA']);
  const [durationMins, setDurationMins] = useState(60);

  // Auxiliary States
  const [subjects, setSubjects] = useState([]);
  const [events, setEvents] = useState([]);
  const [exams, setExams] = useState([]);
  const [ekskuls, setEkskuls] = useState([]);
  const [hasExamAssignment, setHasExamAssignment] = useState(false);
  const [checkingAssignment, setCheckingAssignment] = useState(true);
  const [assignedExamIds, setAssignedExamIds] = useState([]);

  // Form State extensions
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedEkskulId, setSelectedEkskulId] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  const handleExportAttendees = () => {
    if (!activeSession) return;
    const typeLabel = getSessionTypeLabel(activeSession.session_type, activeSession.title);
    const exportData = attendees.map(rec => ({
      'Nama Siswa': rec.student?.full_name || '',
      'Kelas': rec.student?.class_name || '',
      'Status': rec.status || '',
      'Waktu Presensi': rec.created_at ? new Date(rec.created_at).toLocaleTimeString('id-ID') + ' WIB' : ''
    }));
    exportToExcel(exportData, `Presensi_${typeLabel}_Kelas_${activeSession.target_class}_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportSessionHistory = () => {
    const exportData = sessions.map(s => {
      const now = new Date();
      const start = new Date(s.start_time);
      const end = new Date(s.end_time);
      const isActive = now >= start && now <= end;
      return {
        'Waktu Sesi Dibuat': new Date(s.created_at).toLocaleString('id-ID'),
        'Jenis Presensi': getSessionTypeLabel(s.session_type, s.title),
        'Target Kelas': s.target_class || '',
        'Status Sesi': isActive ? 'AKTIF' : 'SELESAI / EXPIRED',
        'Token Presensi': s.qr_token || ''
      };
    });
    exportToExcel(exportData, `Riwayat_Sesi_Presensi_QR_${new Date().toISOString().split('T')[0]}`);
  };

  useEffect(() => {
    async function checkExamAssignments() {
      if (user?.id) {
        try {
          const res = await fetch('/api/exams?type=teachers');
          if (res.ok) {
            const data = await res.json();
            const myAss = data.filter(item => item.teacher_id === user.id);
            setAssignedExamIds(myAss.map(item => item.exam_id));
            setHasExamAssignment(myAss.length > 0);
          }
        } catch (err) {
          console.error("Gagal memeriksa tugas pengawas:", err);
        }
      }
      setCheckingAssignment(false);
    }
    if (!authLoading) {
      if (user) {
        checkExamAssignments();
      } else {
        setCheckingAssignment(false);
      }
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && !checkingAssignment) {
      const isWaka = profile?.role === 'GURU' && profile?.is_manajemen && profile?.is_waka;
      const isPiket = profile?.is_piket;
      const isKepsek = profile?.is_kepsek;
      const isAdmin = profile?.role === 'ADMIN';
      
      if (!profile || (!isAdmin && !isKepsek && !isWaka && !isPiket && !hasExamAssignment)) {
        router.replace('/admin');
      }
    }
  }, [profile, authLoading, checkingAssignment, hasExamAssignment, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const typeParam = params.get('type');
      const examIdParam = params.get('exam_id');
      if (typeParam) {
        setSessionType(typeParam);
        if (typeParam === 'HARIAN_MASUK' || typeParam === 'HARIAN_PULANG') {
          setSelectedClasses(['SEMUA']);
        }
      }
      if (examIdParam) {
        setSelectedExamId(examIdParam);
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.id) {
      fetchClasses();
      fetchSessions();
      fetchAuxiliaryData();
    }
  }, [user, profile, authLoading]);

  const fetchAuxiliaryData = async () => {
    try {
      const { data: subData } = await supabase.from('sr_subjects').select('*').order('name');
      if (subData) setSubjects(subData);

      const evRes = await fetch('/api/events');
      if (evRes.ok) setEvents(await evRes.json());

      const exRes = await fetch('/api/exams');
      if (exRes.ok) setExams(await exRes.json());

      const { data: eksData } = await supabase.from('sr_extracurriculars').select('*').order('name');
      if (eksData) setEkskuls(eksData);
    } catch (e) {
      console.error("Gagal mengambil data bantu presensi:", e);
    }
  };

  // Poll for attendees if there is an active session
  useEffect(() => {
    let interval;
    if (activeSession) {
      fetchAttendees(activeSession.id);
      interval = setInterval(() => {
        fetchAttendees(activeSession.id);
      }, 5000); // Poll every 5s
    } else {
      setAttendees([]);
      setAttendeeCount(0);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchClasses = async () => {
    try {
      const { data } = await supabase.from('sr_classes').select('name').order('name');
      if (data) {
        setClasses(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const isPimpinan = profile?.role === 'ADMIN' || profile?.is_kepsek;
      const url = isPimpinan ? '/api/sessions' : `/api/sessions?teacher_id=${user.id}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        
        // Find if there is a currently running session
        const now = new Date();
        const active = data.find(s => {
          const start = new Date(s.start_time);
          const end = new Date(s.end_time);
          return now >= start && now <= end;
        });
        if (active) {
          setActiveSession(active);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendees = async (sessionId) => {
    try {
      const res = await fetch(`/api/records?session_id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setAttendees(data);
        setAttendeeCount(data.filter(r => r.status !== 'DITOLAK').length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (selectedClasses.length === 0) {
      alert("Pilih minimal satu kelas target sasaran.");
      return;
    }
    setCreating(true);

    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + durationMins * 60 * 1000);
      
      const randToken = Math.random().toString(36).substring(2, 8).toUpperCase();
      const classesString = selectedClasses.includes('SEMUA') ? 'SEMUA' : selectedClasses.join(', ');
      const qrToken = `SR-${sessionType}-${classesString.replace(/\s+/g, '')}-${randToken}`;

      const payload = {
        teacher_id: user.id,
        session_type: sessionType,
        target_class: classesString,
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
        qr_token: qrToken,
        title: customTitle || null,
        subject_id: sessionType === 'MAPEL' && selectedSubjectId ? selectedSubjectId : null,
        event_id: sessionType === 'KEGIATAN' && selectedEventId ? selectedEventId : null,
        exam_id: sessionType === 'UJIAN' && selectedExamId ? selectedExamId : null,
        extracurricular_id: sessionType === 'EKSKUL' && selectedEkskulId ? selectedEkskulId : null
      };

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal membuat sesi");
      }

      const response = await res.json();
      alert("Sesi presensi QR berhasil diaktifkan!");
      setActiveSession(response.data);
      fetchSessions();
    } catch (err) {
      console.error(err);
      alert("Gagal membuat sesi presensi: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEndSession = async (sessionId) => {
    if (!confirm("Apakah Anda yakin ingin segera mengakhiri sesi presensi ini?")) return;
    try {
      const payload = {
        ...activeSession,
        end_time: new Date().toISOString()
      };

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal mengakhiri sesi");
      }

      alert("Sesi presensi telah diakhiri.");
      setActiveSession(null);
      fetchSessions();
    } catch (err) {
      console.error(err);
      alert("Gagal mengakhiri sesi: " + err.message);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 60 }}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1>Sesi Presensi QR</h1>
          <p className="text-muted">Buat dan pantau sesi presensi siswa secara real-time</p>
        </div>
      </div>

      {/* Active Session Display */}
      {activeSession ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 30 }}>
          
          {/* QR Display */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              {(() => {
                const now = new Date();
                const start = new Date(activeSession.start_time);
                const end = new Date(activeSession.end_time);
                const isActive = now >= start && now <= end;
                return (
                  <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`} style={{ padding: '6px 12px', fontSize: 12 }}>
                    {isActive ? 'SESI SEDANG BERJALAN' : 'SESI SELESAI / EXPIRED'}
                  </span>
                );
              })()}
              <button 
                onClick={() => setActiveSession(null)}
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: 11, background: 'transparent', border: '1px solid var(--surface-border)', margin: 0 }}
              >
                Tutup
              </button>
            </div>
            
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-light)' }}>
              {getSessionTypeLabel(activeSession.session_type, activeSession.title)}
            </h3>
            
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Kelas Sasaran: <strong style={{ color: 'var(--primary-color)' }}>{activeSession.target_class}</strong>
            </p>

            {/* QR Image */}
            <div style={{
              background: 'white', padding: 12, borderRadius: 16, boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${activeSession.qr_token}`}
                alt="QR Code Presensi"
                style={{ width: 220, height: 220 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Token Sesi:</span>
              <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold', color: 'var(--text-light)', letterSpacing: 1 }}>
                {activeSession.qr_token}
              </span>
            </div>

            {!isReadOnly && (
              <button 
                onClick={() => handleEndSession(activeSession.id)}
                className="btn-danger w-full"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, fontWeight: 'bold' }}
              >
                <StopCircle size={18} /> Akhiri Sesi Sekarang
              </button>
            )}
          </div>

          {/* Attendees List */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold' }}>Daftar Hadir Siswa</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 24, fontWeight: '900', color: 'var(--primary-color)' }}>{attendeeCount}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Siswa Hadir</span>
              </div>
            </div>

            <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: 380, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {attendees.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
                  <RefreshCw className="animate-spin" size={24} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ fontSize: 13 }}>Menunggu siswa memindai QR Code...</p>
                </div>
              ) : (
                attendees.map((rec) => (
                  <div 
                    key={rec.id}
                    style={{
                      padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--surface-border)', display: 'flex', justifyBetween: true, alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: 13, color: 'var(--text-light)' }}>{rec.student?.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{rec.student?.class_name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className={`badge ${
                        rec.status === 'HADIR' ? 'badge-success' : rec.status === 'TERLAMBAT' ? 'badge-warning' : 'badge-danger'
                      }`} style={{ fontSize: 10 }}>
                        {rec.status}
                      </span>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        {new Date(rec.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      ) : (
        /* Create Session Form */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 30 }}>
          {isReadOnly ? (
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '40px 20px', textAlign: 'center' }}>
              <QrCode size={48} color="var(--primary-color)" style={{ opacity: 0.8 }} />
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-light)' }}>Monitor Presensi QR</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, maxWidth: 300, lineHeight: 1.5 }}>
                Silakan pilih salah satu sesi presensi aktif atau riwayat sesi di bawah untuk memantau daftar hadir siswa secara real-time.
              </p>
            </div>
          ) : (
            <>
              <form onSubmit={handleCreateSession} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Plus size={18} color="var(--primary-color)" /> Buat Sesi Baru
                </h3>
            
            <div className="form-group">
              <label>Jenis Sesi Presensi</label>
              <select 
                value={sessionType}
                onChange={(e) => {
                  setSessionType(e.target.value);
                  if (e.target.value === 'HARIAN_MASUK' || e.target.value === 'HARIAN_PULANG') {
                    setSelectedClasses(['SEMUA']);
                  }
                }}
                className="form-input"
                required
              >
                <option value="HARIAN_MASUK">Presensi Masuk Harian (Pagi)</option>
                <option value="HARIAN_PULANG">Presensi Pulang Harian (Sore)</option>
                <option value="MAPEL">Presensi Jam Kelas (Mapel)</option>
                <option value="KEGIATAN">Presensi Kegiatan Insidental</option>
                <option value="UJIAN">Presensi Sesi Ujian</option>
                <option value="EKSKUL">Presensi Kegiatan Ekskul</option>
              </select>
            </div>

            {sessionType === 'MAPEL' && (
              <>
                <div className="form-group">
                  <label>Pilih Mata Pelajaran</label>
                  <select 
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="form-input"
                    required
                  >
                    <option value="">-- Pilih Mapel --</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Judul Sesi (Opsional)</label>
                  <input 
                    type="text" 
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Cth: Pertemuan Ke-1, Kuis Fisika"
                    className="form-input"
                  />
                </div>
              </>
            )}

            {sessionType === 'KEGIATAN' && (
              <>
                <div className="form-group">
                  <label>Pilih Kegiatan Sekolah</label>
                  <select 
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="form-input"
                    required
                  >
                    <option value="">-- Pilih Kegiatan --</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.name} ({formatDate(ev.event_date)}{ev.end_date && ev.end_date !== ev.event_date ? ` s.d. ${formatDate(ev.end_date)}` : ''})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Judul Sesi (Opsional)</label>
                  <input 
                    type="text" 
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Cth: Rapat Panitia, Seminar"
                    className="form-input"
                  />
                </div>
              </>
            )}

            {sessionType === 'UJIAN' && (
              <>
                <div className="form-group">
                  <label>Pilih Sesi Ujian</label>
                  <select 
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="form-input"
                    required
                  >
                    <option value="">-- Pilih Ujian --</option>
                    {exams
                      .filter(ex => {
                        const isPimpinanOrPiket = profile?.role === 'ADMIN' || profile?.is_kepsek || profile?.is_piket || (profile?.role === 'GURU' && profile?.is_manajemen && profile?.is_waka);
                        return isPimpinanOrPiket || assignedExamIds.includes(ex.id);
                      })
                      .map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nama Sesi / Ruang Ujian (Harus Diisi)</label>
                  <input 
                    type="text" 
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Cth: Sesi 1 - Ruang 3 (Matematika)"
                    className="form-input"
                  />
                </div>
              </>
            )}

            {sessionType === 'EKSKUL' && (
              <>
                <div className="form-group">
                  <label>Pilih Kegiatan Ekskul</label>
                  <select 
                    value={selectedEkskulId}
                    onChange={(e) => setSelectedEkskulId(e.target.value)}
                    className="form-input"
                    required
                  >
                    <option value="">-- Pilih Ekskul --</option>
                    {ekskuls.map(ek => (
                      <option key={ek.id} value={ek.id}>{ek.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Judul Sesi (Opsional)</label>
                  <input 
                    type="text" 
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Cth: Latihan Rutin Mingguan"
                    className="form-input"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: 6 }}>Kelas Target Sasaran</label>
              <div style={{ 
                display: 'flex', flexDirection: 'column', gap: 6, 
                maxHeight: 185, overflowY: 'auto', padding: '10px 12px', 
                border: '1px solid var(--surface-border)', borderRadius: 8, 
                background: 'var(--input-bg)',
                color: 'var(--input-color)' 
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-light)' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedClasses.includes('SEMUA')} 
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedClasses(['SEMUA']);
                      } else {
                        setSelectedClasses([]);
                      }
                    }}
                  />
                  <span>Semua Kelas</span>
                </label>
                <div style={{ borderTop: '1px solid var(--surface-border)', margin: '4px 0' }} />
                {classes.map(c => (
                  <label key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-light)' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedClasses.includes(c.name)}
                      disabled={selectedClasses.includes('SEMUA')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedClasses([...selectedClasses.filter(x => x !== 'SEMUA'), c.name]);
                        } else {
                          setSelectedClasses(selectedClasses.filter(x => x !== c.name));
                        }
                      }}
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Masa Berlaku Sesi (Menit)</label>
              <input 
                type="number" 
                min="10" 
                max="360"
                value={durationMins}
                onChange={(e) => setDurationMins(parseInt(e.target.value) || 60)}
                className="form-input"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={creating}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, fontWeight: 'bold', marginTop: 8 }}
            >
              <Play size={18} /> {creating ? "Mengaktifkan..." : "Aktifkan Sesi Presensi QR"}
            </button>
              </form>

              {/* Guidelines info card */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'rgba(59,130,246,0.02)' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--secondary-color)' }}>
                  <QrCode size={18} /> Panduan Guru
                </h3>
                <ul style={{ fontSize: 13, color: 'var(--text-muted)', paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, lineHeight: 1.5 }}>
                  <li><strong>Pilih jenis presensi:</strong> Gunakan harian masuk untuk presensi pagi siswa.</li>
                  <li><strong>Mulai sesi:</strong> Sesi QR akan langsung aktif dan token unik di-generate.</li>
                  <li><strong>Tampilkan QR:</strong> Tampilkan QR Code di proyektor kelas atau layar monitor agar siswa dapat memindainya melalui HP mereka.</li>
                  <li><strong>Real-time update:</strong> Anda dapat memantau nama-nama siswa yang berhasil check-in di panel sebelah kanan secara live tanpa perlu reload halaman.</li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      {/* History of sessions */}
      <h2>Riwayat Sesi Presensi Anda</h2>
      <div className="glass-panel mt-4">
        {loading ? (
          <p className="text-center text-muted">Memuat riwayat sesi...</p>
        ) : sessions.length === 0 ? (
          <p className="text-center text-muted" style={{ padding: '20px 0' }}>Belum ada sesi presensi yang dibuat sebelumnya.</p>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Waktu Dibuat</th>
                  <th>Jenis Presensi</th>
                  <th>Target Kelas</th>
                  <th>Status Sesi</th>
                  <th>Token</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const now = new Date();
                  const start = new Date(s.start_time);
                  const end = new Date(s.end_time);
                  const isActive = now >= start && now <= end;
                  
                  return (
                    <tr key={s.id}>
                      <td>{new Date(s.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB</td>
                      <td>
                        <strong>{getSessionTypeLabel(s.session_type, s.title)}</strong>
                      </td>
                      <td><span className="badge badge-primary">{s.target_class}</span></td>
                      <td>
                        <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                          {isActive ? 'AKTIF' : 'SELESAI / EXPIRED'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{s.qr_token}</td>
                      <td style={{ textAlign: 'right' }}>
                        {isActive ? (
                          <button 
                            onClick={() => {
                              setActiveSession(s);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="btn-primary"
                            style={{ padding: '4px 10px', fontSize: 11, fontWeight: 'bold' }}
                          >
                            Pantau Sesi
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              setActiveSession(s);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 11, background: 'rgba(255,255,255,0.05)', borderColor: 'var(--surface-border)', color: 'var(--text-muted)' }}
                          >
                            Lihat Detail
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
