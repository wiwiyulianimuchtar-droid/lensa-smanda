"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { 
  Award, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  User,
  Activity
} from 'lucide-react';

export default function ParentDashboard() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState(null);
  const [totalPoints, setTotalPoints] = useState(2000);
  const [recentLogs, setRecentLogs] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState({
    done: false,
    time: '--:--',
    status: '',
    label: 'Belum Presensi'
  });

  useEffect(() => {
    if (user?.id && profile?.parent_id) {
      loadChildData(profile.parent_id);
    } else if (profile && !profile.parent_id) {
      setLoading(false);
    }
  }, [user, profile]);

  const loadChildData = async (childId) => {
    setLoading(true);
    try {
      // 1. Fetch child profile
      const { data: childProfile, error: childError } = await supabase
        .from('sr_profiles')
        .select('*')
        .eq('id', childId)
        .single();

      if (childError || !childProfile) throw new Error("Profil anak tidak ditemukan.");
      setChild(childProfile);

      // 2. Fetch child points
      const { data: ledgerData } = await supabase
        .from('sr_point_ledgers')
        .select('delta_point')
        .eq('student_id', childId);

      const BASE_POINT = 2000;
      const total = BASE_POINT + (ledgerData ? ledgerData.reduce((acc, curr) => acc + curr.delta_point, 0) : 0);
      setTotalPoints(total);

      // 3. Fetch today's check-in
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data: attData } = await supabase
        .from('sr_attendance_records')
        .select(`
          status, created_at,
          session:session_id (session_type)
        `)
        .eq('student_id', childId)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      if (attData && attData.length > 0) {
        const masuk = attData.find(rec => rec.session?.session_type === 'HARIAN_MASUK');
        if (masuk) {
          const timeStr = new Date(masuk.created_at).toLocaleTimeString('id-ID', {
            hour: '2-digit', minute: '2-digit'
          }) + ' WIB';
          
          let label = 'Belum Presensi';
          if (masuk.status === 'HADIR') label = 'Tepat Waktu';
          else if (masuk.status === 'TERLAMBAT') label = 'Terlambat';
          else if (masuk.status === 'DITOLAK') label = 'Ditolak';

          setTodayAttendance({
            done: true,
            time: timeStr,
            status: masuk.status,
            label: label
          });
        }
      }

      // 4. Fetch child's recent activities
      const { data: actData } = await supabase
        .from('sr_activities')
        .select(`
          id, type, status, description, event_date,
          rule:rule_id (name, default_point)
        `)
        .eq('student_id', childId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (actData) {
        const formatted = actData.map(item => ({
          id: item.id,
          title: item.rule?.name || 'Aktivitas',
          type: item.type,
          status: item.status,
          point: item.type === 'POSITIF' ? `+${item.rule?.default_point}` : `-${item.rule?.default_point}`,
          date: new Date(item.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        }));
        setRecentLogs(formatted);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getPredicate = (points) => {
    if (points >= 2500) return { label: 'ISTIMEWA', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', status: 'normal' };
    if (points >= 2200) return { label: 'LUAR BIASA', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', status: 'normal' };
    if (points >= 1900) return { label: 'NORMAL', color: '#22c55e', bg: 'rgba(16, 185, 129, 0.15)', status: 'normal' };
    if (points >= 1800) return { label: 'PEMBINAAN 1', color: '#84cc16', bg: 'rgba(132, 204, 22, 0.15)', status: 'warning' };
    if (points >= 1700) return { label: 'PEMBINAAN 2', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)', status: 'warning' };
    if (points >= 1600) return { label: 'PEMBINAAN 3', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', status: 'warning' };
    if (points >= 1500) return { label: 'PEMBINAAN 4', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', status: 'warning' };
    return { label: 'INTERVENSI KHUSUS', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', status: 'danger' };
  };

  const predikat = getPredicate(totalPoints);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '100px 0' }}>
        <p style={{ fontSize: 14 }}>Memuat data anak Anda...</p>
      </div>
    );
  }

  if (!profile?.parent_id) {
    return (
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', mt: 40 }}>
        <ShieldAlert size={48} color="var(--danger-color)" />
        <h3 style={{ color: 'white' }}>Akun Belum Terhubung</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Akun orang tua Anda belum terhubung ke profil Siswa mana pun. Hubungi pihak sekolah (Admin IT) untuk mengaitkan akun Anda.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Greeting */}
      <div>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Portal Monitoring Orang Tua</span>
        <h2 style={{ fontSize: 24, fontWeight: '800', marginTop: 2 }}>
          Selamat Datang!
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Pantau perkembangan belajar dan kedisiplinan anak Anda secara real-time.</p>
      </div>

      {/* Child Profile Card */}
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'linear-gradient(135deg, rgba(30,58,138,0.2) 0%, rgba(245,158,11,0.02) 100%)' }}>
        <div style={{
          width: 54, height: 54, borderRadius: 12, background: 'rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)'
        }}>
          <User size={24} />
        </div>
        <div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 'bold' }}>MONITORING ANAK:</span>
          <h3 style={{ fontSize: 16, fontWeight: 'bold', color: 'white', margin: 0, marginTop: 2 }}>{child?.full_name}</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Kelas: <strong>{child?.class_name || '-'}</strong> | NISN: <strong>{child?.nomor_induk || '-'}</strong>
          </p>
        </div>
      </div>

      {/* Warning Notice Card if status is warning or danger */}
      {predikat.status !== 'normal' && (
        <div 
          onClick={() => router.push('/orangtua/perizinan')}
          style={{
            background: predikat.status === 'danger' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${predikat.color}`,
            borderRadius: 'var(--radius-md)',
            padding: 12,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            cursor: 'pointer'
          }}
        >
          <ShieldAlert size={20} color={predikat.color} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 'bold', color: 'white', margin: 0 }}>Pemberitahuan Karakter Anak</h4>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
              Skor karakter anak Anda berada di bawah normal ({totalPoints} Poin / {predikat.label}). Mohon ingatkan anak Anda untuk menghindari pelanggaran tata tertib sekolah.
            </p>
          </div>
        </div>
      )}

      {/* Points & Attendance Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Card 1: Point Rapor */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: 'rgba(139,92,246,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7'
            }}>
              <Award size={16} />
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 'bold', margin: 0 }}>Poin & Rapor Karakter</h4>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontSize: 32, fontWeight: '900', color: 'white' }}>{totalPoints}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>Poin</span>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 'bold', letterSpacing: 1,
              color: predikat.color, background: predikat.bg,
              padding: '4px 12px', borderRadius: 20
            }}>
              {predikat.label}
            </span>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
            Poin dasar anak adalah 2000. Skor ini mempengaruhi penilaian akhir rapor perkembangan kepribadian dan akhlak siswa.
          </p>
        </div>

        {/* Card 2: Today's Attendance */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: 'rgba(245, 158, 11, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)'
            }}>
              <Calendar size={16} />
            </div>
            <h4 style={{ fontSize: 14, fontWeight: 'bold', margin: 0 }}>Kehadiran Masuk Hari Ini</h4>
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.15)', border: '1px solid var(--surface-border)',
            padding: 10, borderRadius: 8, display: 'flex', justifyBetween: true, alignItems: 'center', fontSize: 12
          }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Status: </span>
              <span style={{ 
                fontWeight: 'bold', 
                color: todayAttendance.done 
                  ? (todayAttendance.status === 'HADIR' ? '#34d399' : '#f59e0b') 
                  : 'var(--text-muted)'
              }}>{todayAttendance.label}</span>
            </div>
            <span style={{ color: 'white', fontWeight: 'bold' }}>{todayAttendance.time}</span>
          </div>

          <button 
            onClick={() => router.push('/orangtua/attendance')}
            style={{
              background: 'transparent', border: '1px solid var(--surface-border)', color: 'white',
              fontSize: 12, padding: '10px 0', borderRadius: 10, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6, fontWeight: 'bold', transition: 'all 0.2s', cursor: 'pointer'
            }}
          >
            Buka Riwayat Kehadiran Lengkap <ArrowRight size={14} />
          </button>
        </div>

      </div>

      {/* Child's Recent Activities Logs */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>Aktivitas Anak Terbaru</h3>
        </div>

        {recentLogs.length === 0 ? (
          <div style={{
            border: '1px dashed var(--surface-border)', borderRadius: 12,
            padding: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            color: 'var(--text-muted)'
          }}>
            <Activity size={24} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: 12 }}>Belum ada log aktivitas tercatat.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentLogs.map(log => (
              <div 
                key={log.id} 
                className="glass-panel" 
                style={{ 
                  display: 'flex', alignItems: 'center', justifyBetween: true, 
                  padding: '12px 14px', gap: 12, borderRadius: 12
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: log.type === 'POSITIF' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: log.type === 'POSITIF' ? '#10b981' : '#ef4444', flexShrink: 0
                }}>
                  {log.type === 'POSITIF' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                </div>

                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 'bold', color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.title}
                  </h4>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Status: <span style={{ 
                      fontWeight: 'bold',
                      color: log.status === 'APPROVED' ? '#10b981' : log.status === 'REJECTED' ? '#ef4444' : '#eab308' 
                    }}>{log.status}</span>
                  </span>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ 
                    fontSize: 14, fontWeight: 'bold', 
                    color: log.type === 'POSITIF' ? '#10b981' : '#ef4444', 
                    display: 'block' 
                  }}>
                    {log.point}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{log.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
