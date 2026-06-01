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
  Activity,
  Sun,
  Moon,
  MessageSquare,
  Phone,
  X,
  Send,
  Image as ImageIcon,
  BookOpen, ClipboardList, Trophy, FileText, Heart, GraduationCap, Bot, MessageCircle, MoreHorizontal
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function ParentDashboard() {
  const { user, profile } = useAuth();
  // Services/Layanan Lainnya states
  const services = [
    { name: 'e-Library', icon: BookOpen, path: null, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { name: 'Perizinan', icon: ClipboardList, path: '/orangtua/perizinan', color: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)' },
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
  const [showHotlineModal, setShowHotlineModal] = useState(false);

  const handleServiceClick = (service) => {
    if (service.action === 'bk') {
      setShowBKModal(true);
    } else if (service.action === 'hotline') {
      setShowHotlineModal(true);
    } else if (service.action === 'chatbot') {
      setShowChatbot(!showChatbot);
    } else if (service.action === 'whatsapp') {
      window.open('https://wa.me/6281234567890?text=Halo%20Humas%20SMAN%202%20Bandung...', '_blank');
    } else if (service.path) {
      router.push(service.path);
    } else {
      setSelectedService(service);
      setShowPremiumModal(true);
    }
  };
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();

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
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnn, setSelectedAnn] = useState(null);

  // Chatbot & Hallo BK states
  const [showChatbot, setShowChatbot] = useState(false);
  const [showBKModal, setShowBKModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Halo! Saya chatbot SMANDA. Silakan coba tanyakan perkembangan atau skor poin anak Anda.' }
  ]);
  const [chatInput, setChatInput] = useState('');

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput.trim();
    const newMessages = [...chatMessages, { sender: 'user', text: userText }];
    setChatMessages(newMessages);
    setChatInput('');

    setTimeout(() => {
      let botResponse = 'Maaf, saya tidak memahami pertanyaan tersebut. Hubungi Hotline Humas untuk bantuan langsung.';
      const text = userText.toLowerCase();

      if (text.includes('point') || text.includes('poin') || text.includes('skor') || text.includes('rapor')) {
        botResponse = `Skor poin karakter anak Anda saat ini adalah ${totalPoints} Poin dengan predikat ${predikat.label}.`;
      } else if (text.includes('izin') || text.includes('perizinan') || text.includes('sakit')) {
        botResponse = 'Siswa dapat mengajukan izin melalui akun dasbor Siswa. Wali kelas atau piket akan meninjau permohonan tersebut secara real-time.';
      } else if (text.includes('presensi') || text.includes('hadir') || text.includes('masuk')) {
        botResponse = todayAttendance.done 
          ? `Anak Anda hari ini tercatat ${todayAttendance.label} pada pukul ${todayAttendance.time}.`
          : 'Hari ini anak Anda belum tercatat melakukan presensi masuk.';
      } else if (text.includes('halo') || text.includes('hai')) {
        botResponse = 'Halo! Saya chatbot SMANDA. Ada yang bisa saya bantu terkait laporan perkembangan anak Anda?';
      }

      setChatMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    }, 800);
  };

  const fetchLatestAnnouncement = async () => {
    try {
      const res = await fetch('/api/announcements');
      if (res.ok) {
        const data = await res.json();
        const active = data.filter(item => item.is_active && item.target_audience === 'SEMUA');
        setAnnouncements(active);
      }
    } catch (e) {
      console.error("Gagal memuat pengumuman dinamis:", e);
    }
  };

  useEffect(() => {
    fetchLatestAnnouncement();
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
        <h3 style={{ color: 'var(--text-light)' }}>Akun Belum Terhubung</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Akun orang tua Anda belum terhubung ke profil Siswa mana pun. Hubungi pihak sekolah (Admin IT) untuk mengaitkan akun Anda.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Portal Monitoring Orang Tua</span>
            <h2 style={{ fontSize: 22, fontWeight: '800', marginTop: 2, margin: 0 }}>
              Selamat Datang, <span style={{ color: 'var(--banner-accent)' }}>{profile?.full_name?.split(' ')[0] || 'Orang Tua'}</span>!
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Pantau aktivitas & perkembangan anak.
            </p>
          </div>
        </div>
        <button 
          onClick={toggleTheme}
          style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)',
            flexShrink: 0
          }}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Child Profile Card */}
      <div className="glass-panel" style={{ 
        display: 'flex', alignItems: 'center', gap: 16, 
        background: 'var(--banner-bg)', border: '1px solid var(--banner-border)',
        borderLeft: '4px solid var(--banner-accent)'
      }}>
        <div style={{
          width: 54, height: 54, borderRadius: 12, background: 'rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--banner-text)'
        }}>
          <User size={24} />
        </div>
        <div>
          <span style={{ fontSize: 11, color: 'var(--banner-text-muted)', fontWeight: 'bold' }}>MONITORING ANAK:</span>
          <h3 style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--banner-text)', margin: 0, marginTop: 2 }}>{child?.full_name}</h3>
          <p style={{ fontSize: 12, color: 'var(--banner-text-muted)', marginTop: 2 }}>
            Kelas: <strong style={{ color: 'var(--banner-text)' }}>{child?.class_name || '-'}</strong> | NISN: <strong style={{ color: 'var(--banner-text)' }}>{child?.nomor_induk || '-'}</strong>
          </p>
        </div>
      </div>

      {/* Announcement Horizontal Carousel */}
      {announcements.length > 0 && (
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
      )}

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
            <h4 style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-light)', margin: 0 }}>Pemberitahuan Karakter Anak</h4>
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
              <span style={{ fontSize: 32, fontWeight: '900', color: 'var(--text-light)' }}>{totalPoints}</span>
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
          <button 
            onClick={() => setShowBKModal(true)}
            className="btn-primary"
            style={{ 
              background: '#8b5cf6', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', gap: 8, padding: '10px 0', fontSize: 12, fontWeight: 'bold', marginTop: 10
            }}
          >
            <MessageSquare size={14} /> Booking Konsultasi BK (Hallo BK)
          </button>
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
            background: 'var(--card-inner-bg)', border: '1px solid var(--surface-border)',
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
            <span style={{ color: 'var(--text-light)', fontWeight: 'bold' }}>{todayAttendance.time}</span>
          </div>

          <button 
            onClick={() => router.push('/orangtua/attendance')}
            style={{
              background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-light)',
              fontSize: 12, padding: '10px 0', borderRadius: 10, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6, fontWeight: 'bold', transition: 'all 0.2s', cursor: 'pointer'
            }}
          >
            Buka Riwayat Kehadiran Lengkap <ArrowRight size={14} />
          </button>
        </div>

      </div>

      {/* Layanan Lainnya Section for Orang Tua */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>Layanan Lainnya (Pengembangan Ke Depan)</h3>
        
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
                  <h4 style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-light)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

      {/* Floating WhatsApp Hotline */}
      <a 
        href="https://wa.me/6281234567890?text=Halo%20Helpline%20SMAN%202%20Bandung..." 
        target="_blank" rel="noreferrer"
        style={{
          position: 'fixed', bottom: 85, right: 20, width: 56, height: 56, borderRadius: '50%',
          background: '#25d366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)', zIndex: 999, cursor: 'pointer', transition: 'all 0.2s'
        }}
        title="WhatsApp Hotline"
      >
        <Phone size={24} />
      </a>

      {/* Floating Chatbot Bubble */}
      <button 
        onClick={() => setShowChatbot(!showChatbot)}
        style={{
          position: 'fixed', bottom: 20, right: 20, width: 56, height: 56, borderRadius: '50%',
          background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)', zIndex: 999, cursor: 'pointer', transition: 'all 0.2s', border: 'none'
        }}
        title="Chatbot Sekolah"
      >
        {showChatbot ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chatbot Window */}
      {showChatbot && (
        <div style={{
          position: 'fixed', bottom: 90, right: 20, width: 330, height: 420,
          background: 'var(--surface-dark)', border: '1px solid var(--surface-border)',
          borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{
            background: 'var(--banner-bg)', borderBottom: '1px solid var(--banner-border)',
            padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{fontWeight: 'bold', color: 'white', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6}}>
              <MessageSquare size={16} /> Chatbot Monitoring Orangtua
            </span>
            <button onClick={() => setShowChatbot(false)} style={{background: 'transparent', border: 'none', color: 'white', cursor: 'pointer'}}>
              <X size={16} />
            </button>
          </div>

          <div style={{flexGrow: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10}}>
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

      {/* Hallo BK Development Modal */}
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
              background: 'rgba(139, 92, 246, 0.1)', 
              color: '#8b5cf6',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <MessageSquare size={32} />
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 'bold', color: 'white' }}>Layanan Hallo BK</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Layanan konsultasi online bimbingan konseling ("Hallo BK") SMAN 2 Bandung saat ini sedang dipersiapkan dan masih dalam tahap pengembangan.
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

      {/* Custom Premium/Development Modal */}
      {showPremiumModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(10px)',
          zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="glass-panel" style={{
            maxWidth: 400, width: '100%', padding: 24, textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
            boxShadow: 'var(--shadow-glass)', border: '1px solid var(--surface-border)'
          }}>
            {selectedService && (
              <div style={{
                width: 60, height: 60, borderRadius: 20, 
                background: selectedService.bg, 
                color: selectedService.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {(() => { const Icon = selectedService.icon; return <Icon size={32} />; })()}
              </div>
            )}
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 'bold', color: 'white' }}>Layanan {selectedService?.name}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Layanan {selectedService?.name} SMAN 2 Bandung saat ini sedang disiapkan oleh tim Humas & Akademik dan masih dalam tahap pengembangan ke depan.
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

      {/* Hotline Modal */}
      {showHotlineModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(10px)',
          zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
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
                <span style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>+62 812-3456-7890</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Jam Kerja:</span>
                <span style={{ color: 'var(--text-light)' }}>Senin - Jumat (07:00 - 15:30 WIB)</span>
              </div>
            </div>

            <button 
              onClick={() => setShowHotlineModal(false)}
              className="btn-primary" 
              style={{ width: '100%', padding: '12px 0', fontSize: 14 }}
            >
              Kembali ke Dasbor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
