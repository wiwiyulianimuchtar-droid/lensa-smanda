"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { 
  Award, 
  MapPin, 
  PlusCircle, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Calendar,
  Sparkles,
  ArrowRight,
  Bell,
  X
} from 'lucide-react';

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(2000); // Default base point
  const [pendingCount, setPendingCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState([]);
  
  // Attendance State
  const [todayAttendance, setTodayAttendance] = useState({
    done: false,
    time: '--:--',
    status: '',
    label: 'Belum Presensi'
  });

  // Notification State
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPointsAndPending(),
        fetchTodayAttendance(),
        fetchRecentLogs(),
        fetchNotifications()
      ]);
    } catch (e) {
      console.error("Error loading student home data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Points & Pending Activities count
  const fetchPointsAndPending = async () => {
    try {
      // 1. Point Ledger
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('sr_point_ledgers')
        .select('delta_point')
        .eq('student_id', user.id);

      if (!ledgerError && ledgerData) {
        const BASE_POINT = 2000;
        const total = BASE_POINT + ledgerData.reduce((acc, curr) => acc + curr.delta_point, 0);
        setTotalPoints(total);
      }

      // 2. Pending Activities Count
      const { count, error: pendingError } = await supabase
        .from('sr_activities')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('status', 'PENDING');

      if (!pendingError) {
        setPendingCount(count || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch today's check-in status
  const fetchTodayAttendance = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('sr_attendance_records')
        .select(`
          status,
          created_at,
          session:session_id (session_type)
        `)
        .eq('student_id', user.id)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      if (!error && data && data.length > 0) {
        // Find HARIAN_MASUK record
        const masukRecord = data.find(rec => rec.session?.session_type === 'HARIAN_MASUK');
        if (masukRecord) {
          const timeStr = new Date(masukRecord.created_at).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
          }) + ' WIB';
          
          let label = 'Belum Presensi';
          if (masukRecord.status === 'HADIR') label = 'Tepat Waktu';
          else if (masukRecord.status === 'TERLAMBAT') label = 'Terlambat';
          else if (masukRecord.status === 'DITOLAK') label = 'Ditolak';

          setTodayAttendance({
            done: true,
            time: timeStr,
            status: masukRecord.status,
            label: label
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch recent activity logs
  const fetchRecentLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('sr_activities')
        .select(`
          id,
          type,
          status,
          description,
          event_date,
          rule:rule_id (name, default_point)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        const formatted = data.map(item => ({
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
    }
  };

  // Fetch system notifications (approved/rejected activities, attendance check-ins)
  const fetchNotifications = async () => {
    try {
      // Fetch recent status changes
      const { data: actData } = await supabase
        .from('sr_activities')
        .select(`
          id, type, status, description, notes, created_at,
          rule:rule_id (name)
        `)
        .eq('student_id', user.id)
        .in('status', ['APPROVED', 'REJECTED'])
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: attData } = await supabase
        .from('sr_attendance_records')
        .select(`
          id, status, created_at,
          session:session_id (session_type)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      const actItems = (actData || []).map(item => {
        const isApproved = item.status === 'APPROVED';
        return {
          id: item.id,
          message: isApproved 
            ? `Aktivitas "${item.rule?.name || item.description}" disetujui! Poin ditambahkan.`
            : `Aktivitas "${item.rule?.name || item.description}" ditolak. Catatan: ${item.notes || 'Tidak ada.'}`,
          success: isApproved,
          time: new Date(item.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date(item.created_at).getTime()
        };
      });

      const attItems = (attData || []).map(item => {
        const isHadir = item.status === 'HADIR';
        const typeStr = item.session?.session_type === 'HARIAN_MASUK' ? 'Masuk' : 'Pulang';
        return {
          id: item.id,
          message: `Kehadiran Harian ${typeStr} Anda tercatat sebagai: ${item.status}.`,
          success: isHadir,
          time: new Date(item.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date(item.created_at).getTime()
        };
      });

      const merged = [...actItems, ...attItems]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 8);

      setNotifications(merged);
      setHasUnread(merged.length > 0);
    } catch (e) {
      console.error(e);
    }
  };

  // Predicate mapper based on thresholds
  const getPredicate = (points) => {
    if (points >= 2500) return { label: 'ISTIMEWA', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
    if (points >= 2200) return { label: 'LUAR BIASA', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' };
    if (points >= 1900) return { label: 'NORMAL', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    if (points >= 1800) return { label: 'PEMBINAAN 1', color: '#84cc16', bg: 'rgba(132, 204, 22, 0.15)' };
    if (points >= 1700) return { label: 'PEMBINAAN 2', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' };
    if (points >= 1600) return { label: 'PEMBINAAN 3', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
    if (points >= 1500) return { label: 'PEMBINAAN 4', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' };
    return { label: 'INTERVENSI KHUSUS', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
  };

  const predikat = getPredicate(totalPoints);
  const todayStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Header Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{todayStr}</span>
          <h2 style={{ fontSize: 24, fontWeight: '800', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
            Halo, {profile?.full_name?.split(' ')[0] || 'Siswa'}! 
            <Sparkles size={20} color="var(--primary-color)" />
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Selamat belajar dan beraktivitas positif.</p>
        </div>
        
        {/* Notification Bell */}
        <button 
          onClick={() => { setShowNotif(true); setHasUnread(false); }}
          style={{
            position: 'relative', width: 44, height: 44, borderRadius: 12,
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
          }}
        >
          <Bell size={20} />
          {hasUnread && (
            <span style={{
              position: 'absolute', top: 12, right: 12, width: 8, height: 8,
              borderRadius: '50%', background: 'var(--danger-color)'
            }} />
          )}
        </button>
      </div>

      {/* Announcement Banner */}
      <div 
        onClick={() => router.push('/siswa/perizinan')}
        style={{
          background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.6) 0%, rgba(245, 158, 11, 0.1) 100%)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-glass)'
        }}
      >
        <div>
          <span style={{ 
            fontSize: 9, fontWeight: 'bold', background: 'var(--primary-color)', 
            color: 'white', padding: '3px 8px', borderRadius: 6, display: 'inline-block', marginBottom: 8 
          }}>
            SOSIALISASI SISTEM
          </span>
          <h3 style={{ fontSize: 15, fontWeight: '700', margin: 0, color: 'white' }}>
            Uji Coba Portal Web Smart-Report
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Kini presensi & perizinan terintegrasi web responsif.
          </p>
        </div>
        <ArrowRight size={20} color="var(--primary-color)" />
      </div>

      {/* Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Card 1: Attendance */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: 'rgba(245, 158, 11, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)'
            }}>
              <Calendar size={18} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>Presensi Masuk</h3>
          </div>

          <div style={{
            background: 'rgba(0,0,0,0.2)', border: '1px solid var(--surface-border)',
            borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Status Presensi</span>
              <span style={{ 
                fontWeight: 'bold', 
                color: todayAttendance.done 
                  ? (todayAttendance.status === 'HADIR' ? '#34d399' : '#f59e0b') 
                  : 'var(--text-muted)'
              }}>
                {todayAttendance.label}
              </span>
            </div>
            <div style={{ height: 1, background: 'var(--surface-border)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>Waktu Tercatat</span>
              <span style={{ color: 'white', fontWeight: 'bold' }}>{todayAttendance.time}</span>
            </div>
          </div>

          <button 
            onClick={() => router.push('/siswa/attendance')}
            className="btn-primary" 
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              gap: 8, padding: '12px 0', fontSize: 14, fontWeight: 'bold' 
            }}
          >
            <MapPin size={16} />
            Pindai QR Presensi
          </button>
        </div>

        {/* Card 2: Points / Karakter */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: 'rgba(139, 92, 246, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7'
            }}>
              <Award size={18} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>Jurnal Karakter</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <span style={{ fontSize: 44, fontWeight: '900', color: 'white', letterSpacing: -1 }}>{totalPoints}</span>
              <span style={{ fontSize: 14, color: 'var(--text-muted)', marginLeft: 4, fontWeight: '500' }}>Poin</span>
            </div>
            <span style={{
              marginTop: 8, fontSize: 11, fontWeight: 'bold', letterSpacing: 1,
              color: predikat.color, background: predikat.bg, 
              padding: '6px 16px', borderRadius: 20
            }}>
              PREDIKAT: {predikat.label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
              <Clock size={12} />
              <span>{pendingCount} Laporan pending persetujuan</span>
            </div>
          </div>

          <button 
            onClick={() => router.push('/siswa/activity')}
            className="btn-primary"
            style={{ 
              background: '#10b981', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', gap: 8, padding: '12px 0', fontSize: 14, fontWeight: 'bold'
            }}
          >
            <PlusCircle size={16} />
            Lapor Aktivitas Positf
          </button>
        </div>

      </div>

      {/* Recent Logs Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>Aktivitas Terbaru</h3>
          <button 
            onClick={() => router.push('/siswa/reports')}
            style={{ background: 'transparent', color: 'var(--primary-color)', fontSize: 13, fontWeight: 'bold' }}
          >
            Lihat semua
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <div style={{
            border: '1px dashed var(--surface-border)', borderRadius: 'var(--radius-md)',
            padding: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            color: 'var(--text-muted)'
          }}>
            <CheckCircle size={32} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: 13 }}>Belum ada riwayat aktivitas.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentLogs.map(log => (
              <div 
                key={log.id} 
                className="glass-panel" 
                style={{ 
                  display: 'flex', alignItems: 'center', justifyBetween: true, 
                  padding: '12px 16px', gap: 12, borderRadius: 16
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: log.type === 'POSITIF' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: log.type === 'POSITIF' ? '#10b981' : '#ef4444'
                }}>
                  {log.type === 'POSITIF' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
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

      {/* Notification Modal */}
      {showNotif && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: 'var(--surface-dark)', border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 450,
            maxHeight: '80vh', display: 'flex', flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid var(--surface-border)'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', color: 'white' }}>Notifikasi Anda</h3>
              <button 
                onClick={() => setShowNotif(false)}
                style={{ background: 'transparent', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '10px 20px 20px 20px' }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                  <Bell size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <p style={{ fontSize: 13 }}>Tidak ada notifikasi baru saat ini.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      style={{
                        padding: '12px 14px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--surface-border)',
                        display: 'flex', gap: 12, alignItems: 'flex-start'
                      }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: notif.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        color: notif.success ? '#10b981' : '#ef4444', marginTop: 2
                      }}>
                        {notif.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      </div>
                      <div style={{ flexGrow: 1 }}>
                        <p style={{ fontSize: 12, color: 'white', margin: 0, lineHeight: 1.5 }}>
                          {notif.message}
                        </p>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                          {notif.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
