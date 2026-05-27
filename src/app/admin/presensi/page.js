"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Plus, Clock, Users, Calendar, QrCode, Play, StopCircle, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export default function PresensiSessions() {
  const { user } = useAuth();
  
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [attendeeCount, setAttendeeCount] = useState(0);

  // Form State
  const [sessionType, setSessionType] = useState('HARIAN_MASUK');
  const [targetClass, setTargetClass] = useState('SEMUA');
  const [durationMins, setDurationMins] = useState(60);

  useEffect(() => {
    if (user?.id) {
      fetchClasses();
      fetchSessions();
    }
  }, [user]);

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
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sr_attendance_sessions')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSessions(data);
        
        // Find if there is a currently running session (now is between start and end time)
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
      // Fetch records with student profiles
      const { data, error } = await supabase
        .from('sr_attendance_records')
        .select(`
          id, status, created_at,
          student:student_id (full_name, class_name)
        `)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAttendees(data);
        setAttendeeCount(data.filter(r => r.status !== 'DITOLAK').length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + durationMins * 60 * 1000);
      
      // Generate a unique token
      const randToken = Math.random().toString(36).substring(2, 8).toUpperCase();
      const qrToken = `SR-${sessionType}-${targetClass.replace(/\s+/g, '')}-${randToken}`;

      const { data, error } = await supabase
        .from('sr_attendance_sessions')
        .insert([{
          teacher_id: user.id,
          session_type: sessionType,
          target_class: targetClass,
          start_time: now.toISOString(),
          end_time: endTime.toISOString(),
          qr_token: qrToken
        }])
        .select()
        .single();

      if (error) throw error;

      alert("Sesi presensi QR berhasil diaktifkan!");
      setActiveSession(data);
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
      // Update end_time to now to expire the session
      const { error } = await supabase
        .from('sr_attendance_sessions')
        .update({ end_time: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34d399' }}>
              <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: 12 }}>SESI SEDANG BERJALAN</span>
            </div>
            
            <h3 style={{ margin: 0, fontSize: 18, color: 'white' }}>
              {activeSession.session_type === 'HARIAN_MASUK' ? 'Presensi Masuk Harian' : activeSession.session_type === 'HARIAN_PULANG' ? 'Presensi Pulang Harian' : 'Presensi Sesi Kelas'}
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
              <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold', color: 'white', letterSpacing: 1 }}>
                {activeSession.qr_token}
              </span>
            </div>

            <button 
              onClick={() => handleEndSession(activeSession.id)}
              className="btn-danger w-full"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, fontWeight: 'bold' }}
            >
              <StopCircle size={18} /> Akhiri Sesi Sekarang
            </button>
          </div>

          {/* Attendees List */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyBetween: true, alignItems: 'center' }}>
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
                      <div style={{ fontWeight: 'bold', fontSize: 13, color: 'white' }}>{rec.student?.full_name}</div>
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
          
          <form onSubmit={handleCreateSession} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={18} color="var(--primary-color)" /> Buat Sesi Baru
            </h3>
            
            <div className="form-group">
              <label>Jenis Sesi Presensi</label>
              <select 
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="form-input"
                required
              >
                <option value="HARIAN_MASUK">Presensi Masuk Harian (Pagi)</option>
                <option value="HARIAN_PULANG">Presensi Pulang Harian (Sore)</option>
                <option value="SESI_KELAS">Presensi Sesi Jam Pelajaran / Mapel</option>
              </select>
            </div>

            <div className="form-group">
              <label>Kelas Target Sasaran</label>
              <select 
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                className="form-input"
                required
              >
                <option value="SEMUA">Semua Kelas (Presensi Harian Umum)</option>
                {classes.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
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
                        <strong>{s.session_type === 'HARIAN_MASUK' ? 'Masuk Harian' : s.session_type === 'HARIAN_PULANG' ? 'Pulang Harian' : 'Sesi Kelas'}</strong>
                      </td>
                      <td><span className="badge badge-primary">{s.target_class}</span></td>
                      <td>
                        <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                          {isActive ? 'AKTIF' : 'SELESAI / EXPIRED'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{s.qr_token}</td>
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
