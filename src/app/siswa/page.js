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
  X,
  Sun,
  Moon,
  User,
  ClipboardList,
  BookOpen,
  Trophy,
  FileText,
  Heart,
  GraduationCap,
  MoreHorizontal,
  Bot,
  Phone,
  MessageSquare,
  MessageCircle,
  Send,
  Image as ImageIcon
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();

  const services = [
    { name: 'e-Library', icon: BookOpen, path: null, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { name: 'Perizinan', icon: ClipboardList, path: '/siswa/perizinan', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)' },
    { name: 'Ekskul', icon: Trophy, path: null, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
    { name: 'Layanan TU', icon: FileText, path: null, color: '#0d9488', bg: 'rgba(13, 148, 136, 0.1)' },
    { name: 'Layanan UKS', icon: Heart, path: null, color: '#db2777', bg: 'rgba(219, 39, 119, 0.1)' },
    { name: 'Akademik', icon: GraduationCap, path: null, color: '#059669', bg: 'rgba(5, 150, 105, 0.1)' },
    { name: 'Hallo BK', icon: MessageSquare, action: 'bk', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
    { name: 'Hotline', icon: Phone, action: 'hotline', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { name: 'Q&A', icon: Bot, action: 'chatbot', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    { name: 'Livechat', icon: MessageCircle, action: 'whatsapp', color: '#25d366', bg: 'rgba(37, 211, 102, 0.1)' },
    { name: 'Lainnya', icon: MoreHorizontal, path: null, color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' }
  ];

  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [showBKModal, setShowBKModal] = useState(false);
  const [showHotlineModal, setShowHotlineModal] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Halo! Saya asisten Q&A SMANDA. Ada yang bisa saya bantu hari ini? Tanyakan seputar point, izin, atau presensi harian Anda.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [announcements, setAnnouncements] = useState([
    {
      id: 'default-1',
      title: 'Uji Coba Portal Web Smart-Report',
      content: 'Kini presensi & perizinan terintegrasi web responsif.',
      category: 'SOSIALISASI SISTEM'
    }
  ]);
  const [selectedAnn, setSelectedAnn] = useState(null);

  const handleServiceClick = (service) => {
    if (service.action === 'bk') {
      setShowBKModal(true);
    } else if (service.action === 'hotline') {
      setShowHotlineModal(true);
    } else if (service.action === 'chatbot') {
      setShowChatbot(!showChatbot);
    } else if (service.action === 'whatsapp') {
      window.open('https://wa.me/6281234567890?text=Halo%20Humas%20SMAN%202%20Bandung%2C%20saya%20siswa%20ingin%20bertanya%20mengenai%20layanan%20sekolah...', '_blank');
    } else if (service.path) {
      router.push(service.path);
    } else {
      setSelectedService(service);
      setShowPremiumModal(true);
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const newMessages = [...chatMessages, { sender: 'user', text: userText }];
    setChatMessages(newMessages);
    setChatInput('');

    setTimeout(() => {
      let botResponse = 'Maaf, saya tidak memahami pertanyaan tersebut. Silakan hubungi Layanan Hotline atau WhatsApp Humas untuk bantuan langsung.';
      const text = userText.toLowerCase();

      if (text.includes('point') || text.includes('poin') || text.includes('skor') || text.includes('karakter')) {
        botResponse = `Skor poin karakter Anda saat ini adalah ${totalPoints} Poin. Teruskan perilaku positif ya!`;
      } else if (text.includes('izin') || text.includes('perizinan') || text.includes('sakit')) {
        botResponse = 'Anda dapat mengajukan perizinan secara langsung melalui menu "Perizinan" di halaman utama dasbor Anda.';
      } else if (text.includes('presensi') || text.includes('hadir') || text.includes('masuk')) {
        botResponse = todayAttendance.done 
          ? `Presensi masuk harian Anda hari ini tercatat pada pukul ${todayAttendance.time} dengan status: ${todayAttendance.label}.`
          : 'Hari ini Anda belum melakukan presensi harian masuk. Silakan gunakan menu presensi.';
      } else if (text.includes('halo') || text.includes('hai')) {
        botResponse = 'Halo! Saya asisten Q&A SMANDA. Ada yang bisa saya bantu terkait kebutuhan sekolah Anda?';
      }

      setChatMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    }, 800);
  };

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
        fetchNotifications(),
        fetchLatestAnnouncement()
      ]);
    } catch (e) {
      console.error("Error loading student home data:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestAnnouncement = async () => {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        const active = data.filter(item => item.is_active && item.target_audience === 'SEMUA');
        if (active.length > 0) {
          setAnnouncements(active);
        }
      }
    } catch (e) {
      console.error("Gagal memuat pengumuman dinamis:", e);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Foto Pengguna / Avatar */}
          <div style={{
            width: 48, height: 48, borderRadius: 'var(--radius-md)',
            background: 'var(--surface-dark)', border: '1px solid var(--banner-border)',
            boxShadow: 'var(--shadow-glass)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)',
            overflow: 'hidden', flexShrink: 0
          }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={24} />
            )}
          </div>
          <div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{todayStr}</span>
            <h2 style={{ fontSize: 22, fontWeight: '800', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              Halo, <span style={{ color: 'var(--banner-accent)' }}>{profile?.full_name?.split(' ')[0] || 'Siswa'}</span>!
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Semangat belajar hari ini!
            </p>
          </div>
        </div>
        
        {/* Theme Toggle & Notification Bell Container */}
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)'
            }}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {/* Notification Bell */}
          <button 
            onClick={() => { setShowNotif(true); setHasUnread(false); }}
            style={{
              position: 'relative', width: 44, height: 44, borderRadius: 12,
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)'
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
      </div>

      {/* Announcement Horizontal Carousel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          overflowX: 'auto',
          gap: 12,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 4
        }}>
          {announcements.map((ann) => (
            <div 
              key={ann.id || ann.title}
              onClick={() => setSelectedAnn(ann)}
              style={{
                background: 'var(--banner-bg)',
                border: '1px solid var(--banner-border)',
                borderLeft: '4px solid var(--banner-accent)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-glass)',
                flex: '0 0 100%',
                scrollSnapAlign: 'start',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ flexGrow: 1, minWidth: 0, paddingRight: 10 }}>
                <span style={{ 
                  fontSize: 9, fontWeight: 'bold', background: 'var(--banner-accent)', 
                  color: 'white', padding: '3px 8px', borderRadius: 6, display: 'inline-block', marginBottom: 8 
                }}>
                  {ann.category || 'INFORMASI'}
                </span>
                <h3 style={{ fontSize: 14, fontWeight: '700', margin: 0, color: 'var(--banner-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ann.title}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--banner-text-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ann.content}
                </p>
                {ann.flyer_url && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10,
                    color: 'var(--banner-accent)',
                    fontWeight: 'bold',
                    marginTop: 6
                  }}>
                    <ImageIcon size={12} />
                    <span>Ada Flyer Pengumuman (Klik untuk detail)</span>
                  </span>
                )}
              </div>
              <ArrowRight size={20} color="var(--banner-text)" style={{ flexShrink: 0 }} />
            </div>
          ))}
        </div>
        {announcements.length > 1 && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'flex-end', marginTop: 2 }}>
            Geser kesamping untuk melihat lainnya ({announcements.length}) →
          </span>
        )}
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
            background: 'var(--card-inner-bg)', border: '1px solid var(--surface-border)',
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
              <span style={{ color: 'var(--text-light)', fontWeight: 'bold' }}>{todayAttendance.time}</span>
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
              <span style={{ fontSize: 44, fontWeight: '900', color: 'var(--text-light)', letterSpacing: -1 }}>{totalPoints}</span>
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

      {/* Layanan Lainnya Section */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>Layanan Lainnya</h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px 12px',
          justifyItems: 'center'
        }}>
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div 
                key={index}
                onClick={() => handleServiceClick(service)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'transform 0.2s ease'
                }}
                className="service-item"
              >
                <div 
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: service.bg,
                    color: service.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--surface-border)',
                    boxShadow: 'var(--shadow-glass)',
                    transition: 'all 0.2s ease'
                  }}
                  className="service-icon-wrapper"
                >
                  <Icon size={24} />
                </div>
                <span style={{
                  fontSize: 10,
                  color: 'var(--text-light)',
                  marginTop: 8,
                  textAlign: 'center',
                  fontWeight: '500',
                  lineHeight: 1.2
                }}>
                  {service.name}
                </span>
              </div>
            );
          })}
        </div>
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
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', color: 'var(--text-light)' }}>Notifikasi Anda</h3>
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
                        <p style={{ fontSize: 12, color: 'var(--text-light)', margin: 0, lineHeight: 1.5 }}>
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

      {/* Custom Premium/Development Modal */}
      {showPremiumModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(10px)',
          zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="glass-panel" style={{
            maxWidth: 400, width: '100%', padding: 24, textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            boxShadow: 'var(--shadow-glass)', border: '1px solid var(--surface-border)'
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: 20, 
              background: selectedService?.bg || 'var(--primary-color)', 
              color: selectedService?.color || 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {selectedService && React.createElement(selectedService.icon, { size: 32 })}
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 'bold', color: 'white' }}>Layanan {selectedService?.name}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Layanan {selectedService?.name} SMAN 2 Bandung saat ini sedang disiapkan oleh tim Humas & Akademik dan masih dalam tahap pengembangan.
            </p>
            <button 
              onClick={() => setShowPremiumModal(false)}
              className="btn-primary" 
              style={{ width: '100%', padding: '12px 0', fontSize: 14 }}
            >
              Kembali ke Dasbor
            </button>
          </div>
        </div>
      )}

      {/* Hallo BK Modal */}
      {showBKModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(10px)',
          zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="glass-panel" style={{
            maxWidth: 400, width: '100%', padding: 24, textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            boxShadow: 'var(--shadow-glass)', border: '1px solid var(--surface-border)'
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: 20, 
              background: 'rgba(168, 85, 247, 0.1)', 
              color: '#a855f7',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <MessageSquare size={32} />
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 'bold', color: 'white' }}>Layanan Hallo BK</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Layanan konsultasi online bimbingan konseling ("Hallo BK") SMAN 2 Bandung saat ini sedang dipersiapkan oleh guru BK dan masih dalam tahap pengembangan.
            </p>
            <button 
              onClick={() => setShowBKModal(false)}
              className="btn-primary" 
              style={{ width: '100%', padding: '12px 0', fontSize: 14 }}
            >
              Kembali ke Dasbor
            </button>
          </div>
        </div>
      )}

      {/* Hotline Modal */}
      {showHotlineModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(10px)',
          zIndex: 1001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="glass-panel" style={{
            maxWidth: 400, width: '100%', padding: 24,
            display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: 'var(--shadow-glass)', border: '1px solid var(--surface-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 16, 
                background: 'rgba(245, 158, 11, 0.1)', 
                color: '#f59e0b',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Phone size={24} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 'bold', color: 'white' }}>Hotline SMAN 2 Bandung</h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hubungi Humas & Administrasi</span>
              </div>
            </div>
            
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5, textAlign: 'left' }}>
              Layanan hotline resmi sekolah dikelola langsung oleh tim Humas SMAN 2 Bandung. Hubungi kami untuk info KBM, perizinan khusus, dan pelayanan lainnya.
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--surface-border)',
              borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Nomor WhatsApp:</span>
                <span style={{ color: 'white', fontWeight: 'bold' }}>+62 812-3456-7890</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Jam Operasional:</span>
                <span style={{ color: 'white' }}>07:00 - 15:00 WIB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>Aktif (Respon Cepat)</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button 
                onClick={() => setShowHotlineModal(false)}
                className="btn-primary" 
                style={{ flex: 1, padding: '12px 0', fontSize: 14, background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-light)' }}
              >
                Tutup
              </button>
              <a 
                href="https://wa.me/6281234567890?text=Halo%20Humas%20SMAN%202%20Bandung%2C%20saya%20siswa%20ingin%20bertanya..." 
                target="_blank" rel="noreferrer"
                className="btn-primary" 
                style={{ flex: 1, padding: '12px 0', fontSize: 14, background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none', color: 'white', fontWeight: 'bold' }}
              >
                <MessageCircle size={16} /> Hubungi WA
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Q&A Chat Window */}
      {showChatbot && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, width: 330, height: 420,
          background: 'var(--surface-dark)', border: '1px solid var(--surface-border)',
          borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{
            background: 'var(--banner-bg)', borderBottom: '1px solid var(--banner-border)',
            padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{fontWeight: 'bold', color: 'white', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6}}>
              <MessageSquare size={16} /> Q&A Siswa SMANDA
            </span>
            <button onClick={() => setShowChatbot(false)} style={{background: 'transparent', border: 'none', color: 'white', cursor: 'pointer'}}>
              <X size={16} />
            </button>
          </div>

          <div style={{flexGrow: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left'}}>
            {chatMessages.map((msg, index) => (
              <div 
                key={index}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.sender === 'user' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--surface-border)',
                  color: 'white', padding: '8px 12px', borderRadius: 12, fontSize: 12, maxWidth: '85%', lineHeight: 1.4
                }}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendChat} style={{borderTop: '1px solid var(--surface-border)', padding: 10, display: 'flex', gap: 8, background: 'rgba(0,0,0,0.1)'}}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Tanyakan point, izin, atau presensi..." 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)}
              style={{flexGrow: 1, height: 36, fontSize: 12}}
            />
            <button type="submit" className="btn-primary" style={{width: 36, height: 36, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Announcement Detail Modal */}
      {selectedAnn && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(10px)',
          zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: 'var(--surface-dark)', border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 500,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid var(--surface-border)'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', color: 'var(--text-light)' }}>
                Detail Pengumuman Sekolah
              </h3>
              <button 
                onClick={() => setSelectedAnn(null)}
                style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20, overflowY: 'auto', maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ 
                  fontSize: 10, fontWeight: 'bold', background: 'var(--banner-accent)', 
                  color: 'white', padding: '3px 8px', borderRadius: 6
                }}>
                  {selectedAnn.category || 'INFORMASI'}
                </span>
                {selectedAnn.created_at && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(selectedAnn.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 'bold', margin: 0, color: 'var(--text-light)' }}>
                {selectedAnn.title}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {selectedAnn.content}
              </p>

              {selectedAnn.flyer_url && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--text-light)' }}>Flyer Lampiran:</label>
                  <div style={{ padding: 10, background: '#000', borderRadius: 8, display: 'flex', justifyContent: 'center' }}>
                    <img 
                      src={selectedAnn.flyer_url} 
                      alt="Flyer Lampiran" 
                      style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 4 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
