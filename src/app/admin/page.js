"use client";
import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Users, User, AlertTriangle, ShieldCheck, MapPin, QrCode, ClipboardList, 
  Send, Activity, Plus, FileSpreadsheet, Download, Calendar, Sparkles, 
  BookOpen, UserCheck, ShieldAlert, Image as ImageIcon, CheckCircle, 
  Clock, XCircle, StopCircle, RefreshCw, Smartphone, Eye, Award, LogOut,
  Megaphone, Bell, Sun, Moon, X, ChevronDown, ChevronUp, Archive,
  Trophy, FileText, Heart, GraduationCap, MessageSquare, Bot, MessageCircle, MoreHorizontal, Phone
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useTheme } from '@/components/ThemeProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { exportToExcel } from '@/lib/excelHelper';
import { compressImage } from '@/lib/imageCompressor';

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', gap: 16, color: 'var(--text-muted)'
      }}>
        <RefreshCw size={36} className="animate-spin text-primary" />
        <span>Memuat Dasbor Smart-Report...</span>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}

function AdminDashboardContent() {
  const { profile, loading: authLoading } = useAuth();
  // Services/Layanan Lainnya states
  const services = [
    { name: 'e-Library', icon: BookOpen, path: null, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { name: 'Perizinan', icon: ClipboardList, path: null, color: '#ea580c', bg: 'rgba(234, 88, 12, 0.1)' },
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
    { sender: 'bot', text: 'Halo! Saya chatbot SMANDA. Silakan coba tanyakan hal-hal seputar sekolah (contoh: "point", "izin", "hadir").' }
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
      let botResponse = 'Maaf, saya tidak memahami pertanyaan tersebut. Silakan tanyakan hal-hal lain atau hubungi Hotline Humas.';
      const text = userText.toLowerCase();

      if (text.includes('point') || text.includes('poin') || text.includes('skor') || text.includes('rapor')) {
        botResponse = 'Anda dapat melihat poin karakter siswa melalui tab "Pelanggaran & Karakter" pada dasbor atau menu Laporan.';
      } else if (text.includes('izin') || text.includes('perizinan') || text.includes('sakit')) {
        botResponse = 'Guru dan staf piket dapat menyetujui atau menolak permohonan izin siswa langsung melalui menu Perizinan di dasbor.';
      } else if (text.includes('presensi') || text.includes('hadir') || text.includes('masuk')) {
        botResponse = 'Sistem mencatat presensi harian siswa secara real-time via scan QR code atau presensi kelas oleh pendidik.';
      } else if (text.includes('halo') || text.includes('hai')) {
        botResponse = 'Halo! Saya chatbot SMANDA. Ada yang bisa saya bantu terkait dasbor Pendidik & Tenaga Kependidikan?';
      }

      setChatMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    }, 800);
  };

  const handleServiceClick = (service) => {
    if (service.action === 'bk') {
      setShowBKModal(true);
    } else if (service.action === 'hotline') {
      setShowHotlineModal(true);
    } else if (service.action === 'chatbot') {
      setShowChatbot(!showChatbot);
    } else if (service.action === 'whatsapp') {
      window.open('https://wa.me/6281234567890?text=Halo%20Humas%20SMAN%202%20Bandung...', '_blank');
    } else {
      setSelectedService(service);
      setShowPremiumModal(true);
    }
  };
  const { isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Role helper flags
  const isSuperAdmin = profile?.role === 'ADMIN';
  const isKesiswaan = profile?.role === 'ADMIN' || profile?.is_kepsek || (profile?.is_manajemen && profile?.manajemen_role === 'KESISWAAN');
  const isKurikulum = profile?.role === 'ADMIN' || profile?.is_kepsek || (profile?.is_manajemen && profile?.manajemen_role === 'KURIKULUM');
  const isSarpras = profile?.role === 'ADMIN' || profile?.is_kepsek || (profile?.is_manajemen && profile?.manajemen_role === 'SARPRAS');
  const isHumas = profile?.role === 'ADMIN' || profile?.is_kepsek || (profile?.is_manajemen && profile?.manajemen_role === 'HUMAS');

  // Admin/Manajemen Stats States
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalGuru: 0,
    totalPelanggaran: 0,
    geofenceActive: true
  });
  
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);
  const [isActivitiesExpanded, setIsActivitiesExpanded] = useState(false);

  // New notification and layout states
  const [showNotif, setShowNotif] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [bellNotifications, setBellNotifications] = useState([]);
  const [selectedPresensiType, setSelectedPresensiType] = useState('MAPEL');
  const [tempAvatarFile, setTempAvatarFile] = useState(null);
  const [tempAvatarPreview, setTempAvatarPreview] = useState(null);

  // Guru & Wali Kelas Tab System State
  const [guruActiveTab, setGuruActiveTab] = useState('dashboard');
  const [myAssignments, setMyAssignments] = useState([]);
  const [myExams, setMyExams] = useState([]);
  const [allStudents, setAllStudents] = useState([]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };
  const [negativeRules, setNegativeRules] = useState([]);
  const [reporting, setReporting] = useState(false);
  const [teacherViolationForm, setTeacherViolationForm] = useState({
    student_id: '', rule_id: '', description: ''
  });
  const [violationFile, setViolationFile] = useState(null);
  const [violationPreview, setViolationPreview] = useState(null);

  // Collapsible panel states for clean mobile layout
  const [isPresensiExpanded, setIsPresensiExpanded] = useState(false);
  const [isViolationExpanded, setIsViolationExpanded] = useState(false);
  const [isAbsenceExpanded, setIsAbsenceExpanded] = useState(false);

  // Wali Kelas Quick Absence Input State
  const [walikelasAbsenceForm, setWalikelasAbsenceForm] = useState({ student_id: '', status: 'SAKIT' });
  const [submittingAbsence, setSubmittingAbsence] = useState(false);

  // KBM & Custom Attendance States
  const [teacherSchedules, setTeacherSchedules] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [myEkskuls, setMyEkskuls] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [sessionDuration, setSessionDuration] = useState(15);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [selectedCustomClasses, setSelectedCustomClasses] = useState(['SEMUA']);
  
  const [customSessionForm, setCustomSessionForm] = useState({
    session_type: 'MAPEL',
    class_name: '',
    subject_id: '',
    jam_ke: '',
    extracurricular_id: '',
    exam_id: '',
    title: ''
  });
  const [isGeneratingSession, setIsGeneratingSession] = useState(false);

  // Laporan & History States
  const [sessionsHistory, setSessionsHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [rekapFilters, setRekapFilters] = useState({
    subject_id: '',
    class_name: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [rekapData, setRekapData] = useState([]);
  const [rekapDates, setRekapDates] = useState([]);
  const [isLoadingRekap, setIsLoadingRekap] = useState(false);

  // Profile Edit States
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    nip: '',
    nuptk: '',
    gender: 'L',
    birth_date: '',
    employment_status: 'PNS',
    phone: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  // Wali Kelas Tab Binaan States
  const [wlStudents, setWlStudents] = useState([]);
  const [wlAttendanceMatrix, setWlAttendanceMatrix] = useState([]);
  const [wlActivities, setWlActivities] = useState([]);
  const [wlNotifications, setWlNotifications] = useState([]);
  const [isLoadingWl, setIsLoadingWl] = useState(false);

  // Information (Announcements) & Notifications Feed
  const [announcements, setAnnouncements] = useState([]);

  // Collapsible states for division summary dashboards
  const [kesiswaanExpandAbsence, setKesiswaanExpandAbsence] = useState(false);
  const [kesiswaanExpandTatib, setKesiswaanExpandTatib] = useState(false);
  const [kesiswaanExpandEkskul, setKesiswaanExpandEkskul] = useState(false);
  const [kurikulumExpandAkademik, setKurikulumExpandAkademik] = useState(false);
  const [kurikulumExpandKbm, setKurikulumExpandKbm] = useState(false);
  const [sarprasExpandAset, setSarprasExpandAset] = useState(false);
  const [sarprasExpandPinjam, setSarprasExpandPinjam] = useState(false);
  const [humasExpandAnn, setHumasExpandAnn] = useState(false);
  const [reportedActivities, setReportedActivities] = useState([]);
  const [selectedFlyer, setSelectedFlyer] = useState(null);

  useEffect(() => {
    if (profile) {
      if (profile.role === 'ADMIN' || profile.is_manajemen || profile.is_kepsek) {
        fetchAdminStats();
      }
      if (profile.role === 'GURU') {
        fetchTeacherDashboardData();
      }
    }
  }, [profile]);

  // Redirection to master pages removed so that manajemen/waka can stay on main overview dashboards

  // Sync tab option from URL search query parameter (e.g. from Sidebar shortcut)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'profil') {
      router.push('/admin/profile');
    } else if (tab && ['dashboard', 'tugas_tambahan', 'laporan', 'kelas_binaan'].includes(tab)) {
      setGuruActiveTab(tab);
    } else {
      setGuruActiveTab('dashboard');
    }
  }, [searchParams]);

  // Sync Bell Notifications for Teacher
  useEffect(() => {
    const notifs = [];
    
    if (profile?.is_walikelas && wlNotifications) {
      wlNotifications.forEach(notif => {
        notifs.push({
          id: `wl-${notif.id}`,
          message: `Siswa Binaan Anda (${notif.student?.full_name}) melanggar: ${notif.rule?.name || notif.description} (-${notif.rule?.default_point || 0} Poin)`,
          time: new Date(notif.event_date || notif.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
          timestamp: new Date(notif.event_date || notif.created_at).getTime(),
          success: false
        });
      });
    }
    
    if (reportedActivities) {
      reportedActivities.forEach(act => {
        if (act.status !== 'PENDING') {
          const isApproved = act.status === 'APPROVED';
          notifs.push({
            id: `rep-${act.id}`,
            message: `Laporan pelanggaran ${act.student?.full_name} telah ${isApproved ? 'DISETUJUI' : 'DITOLAK'} oleh Kesiswaan.`,
            time: new Date(act.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(act.created_at).getTime(),
            success: isApproved
          });
        }
      });
    }
    
    notifs.sort((a, b) => b.timestamp - a.timestamp);
    setBellNotifications(notifs);
    setHasUnread(notifs.length > 0);
  }, [wlNotifications, reportedActivities, profile]);

  // Real-time Attendee Polling effect
  useEffect(() => {
    let interval;
    if (activeSession) {
      fetchAttendees(activeSession.id);
      interval = setInterval(() => {
        fetchAttendees(activeSession.id);
      }, 3000);
    } else {
      setSessionLogs([]);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchAdminStats = async () => {
    try {
      // 1. Total Siswa
      let siswaCount = 0;
      try {
        const { count } = await supabase.from('sr_profiles').select('*', { count: 'exact', head: true }).eq('role', 'SISWA');
        siswaCount = count || 0;
      } catch (err) { console.warn(err); }

      // 2. Total Guru
      let guruCount = 0;
      try {
        const { count } = await supabase.from('sr_profiles').select('*', { count: 'exact', head: true }).eq('role', 'GURU');
        guruCount = count || 0;
      } catch (err) { console.warn(err); }

      // 3. Total Pelanggaran
      let pelanggaranCount = 0;
      try {
        const { count } = await supabase.from('sr_activities').select('*', { count: 'exact', head: true }).eq('type', 'NEGATIF').eq('status', 'APPROVED');
        pelanggaranCount = count || 0;
      } catch (err) { console.warn(err); }

      // 4. Total Prestasi
      let prestasiCount = 0;
      try {
        const { count } = await supabase.from('sr_activities').select('*', { count: 'exact', head: true }).eq('type', 'POSITIF').eq('status', 'APPROVED');
        prestasiCount = count || 0;
      } catch (err) { console.warn(err); }

      // 5. Total Ekskul
      let ekskulCount = 4; // fallback
      try {
        const { count } = await supabase.from('sr_extracurriculars').select('*', { count: 'exact', head: true });
        if (count !== null) ekskulCount = count;
      } catch (err) { console.warn(err); }

      // 6. Total Kelas
      let kelasCount = 12; // fallback
      try {
        const { count } = await supabase.from('sr_classes').select('*', { count: 'exact', head: true });
        if (count !== null) kelasCount = count;
      } catch (err) { console.warn(err); }

      // 7. Total Mapel
      let mapelCount = 20; // fallback
      try {
        const { count } = await supabase.from('sr_subjects').select('*', { count: 'exact', head: true });
        if (count !== null) mapelCount = count;
      } catch (err) { console.warn(err); }

      // 8. Total Sesi Today
      let sesiCount = 0;
      try {
        const { count } = await supabase.from('sr_attendance_sessions').select('*', { count: 'exact', head: true });
        sesiCount = count || 0;
      } catch (err) { console.warn(err); }

      // 9. Absensi Harian Today
      const attendanceSummary = { HADIR: 0, TERLAMBAT: 0, SAKIT: 0, IZIN: 0, ALPA: 0, DISPEN: 0 };
      try {
        const { data: attData } = await supabase.from('sr_attendance_records').select('status, created_at');
        const todayStr = new Date().toLocaleDateString('en-CA');
        const todayRecs = (attData || []).filter(r => new Date(r.created_at).toLocaleDateString('en-CA') === todayStr);
        todayRecs.forEach(r => {
          if (attendanceSummary[r.status] !== undefined) {
            attendanceSummary[r.status]++;
          }
        });
      } catch (err) { console.warn(err); }

      // 10. Humas Info
      let totalInformasi = 1;
      let totalInformasiActive = 1;
      try {
        const { data: infoData } = await supabase.from('sr_announcements').select('is_active');
        if (infoData) {
          totalInformasi = infoData.length;
          totalInformasiActive = infoData.filter(i => i.is_active).length;
        }
      } catch (err) { console.warn(err); }

      setStats({
        totalSiswa: siswaCount,
        totalGuru: guruCount,
        totalPelanggaran: pelanggaranCount,
        totalPrestasi: prestasiCount,
        geofenceActive: true,
        attendanceSummary,
        totalEkskul: ekskulCount,
        totalKelas: kelasCount,
        totalMapel: mapelCount,
        totalSesiToday: sesiCount,
        
        // Sarpras
        totalAset: 5,
        asetCondition: { Baik: 4, Rusak: 0, ButuhPerbaikan: 1 },
        totalPeminjamanPending: 2,
        totalKerusakanPending: 1,

        totalInformasi,
        totalInformasiActive
      });

      // Fetch school announcements / information
      const annRes = await fetch('/api/announcements');
      if (annRes.ok) {
        const annData = await annRes.json();
        setAnnouncements(annData.filter(item => item.is_active && (item.target_audience === 'SEMUA' || item.target_audience === 'GURU')));
      }

      // Fetch recent violations/activities
      const actRes = await fetch('/api/activities?type=all_violations');
      if (actRes.ok) {
        const actData = await actRes.json();
        setRecentActivities(actData || []);
      }

      // Load classes, subjects, assignments, and schedules for Admin/Waka shortcut
      const { data: clsData } = await supabase.from('sr_classes').select('id, name').order('name');
      if (clsData) setAllClasses(clsData);

      const { data: subData } = await supabase.from('sr_subjects').select('id, name, code').order('name');
      if (subData) setAllSubjects(subData);

      const assRes = await fetch('/api/assignments');
      if (assRes.ok) {
        const assData = await assRes.json();
        const filtered = assData.filter(item => item.teacher_id === profile.id);
        setMyAssignments(filtered);
      }

      const { data: schedData } = await supabase
        .from('sr_teaching_schedules')
        .select(`
          id, day_of_week, start_period, end_period, semester,
          subject:subject_id (id, name, code),
          class:class_id (id, name)
        `)
        .eq('teacher_id', profile.id);
      if (schedData) setTeacherSchedules(schedData);

      const { data: eksData } = await supabase.from('sr_extracurriculars').select('*').eq('coach_id', profile.id);
      if (eksData) setMyEkskuls(eksData);

      // Fetch exam assignments (pengawas/panitia ujian) via API for Admin/Manajemen
      try {
        const extRes = await fetch('/api/exams?type=teachers');
        if (extRes.ok) {
          const extData = await extRes.json();
          const myExamData = extData.filter(item => item.teacher_id === profile.id);
          setMyExams(myExamData.map(item => item.exam).filter(Boolean));
        }
      } catch (err) {
        console.error("Gagal mengambil tugas pengawas:", err);
      }

      await fetchSessionsHistory();

      // Fetch all students for violation selection
      const { data: stdData } = await supabase.from('sr_profiles').select('id, full_name, class_name').eq('role', 'SISWA').order('full_name');
      if (stdData) setAllStudents(stdData);

      // Fetch negative rules
      const { data: rulesData } = await supabase.from('sr_point_rules').select('id, name, default_point').eq('type', 'NEGATIF').order('name');
      if (rulesData) setNegativeRules(rulesData);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch classes & subjects
      const { data: clsData } = await supabase.from('sr_classes').select('id, name').order('name');
      if (clsData) setAllClasses(clsData);

      const { data: subData } = await supabase.from('sr_subjects').select('id, name, code').order('name');
      if (subData) setAllSubjects(subData);

      // 2. Fetch assignments (via endpoint)
      const assRes = await fetch('/api/assignments');
      if (assRes.ok) {
        const assData = await assRes.json();
        const filtered = assData.filter(item => item.teacher_id === profile.id);
        setMyAssignments(filtered);
      }

      // 3. Fetch all students for violation selection
      const { data: stdData } = await supabase.from('sr_profiles').select('id, full_name, class_name').eq('role', 'SISWA').order('full_name');
      if (stdData) setAllStudents(stdData);

      // 4. Fetch negative rules
      const { data: rulesData } = await supabase.from('sr_point_rules').select('id, name, default_point').eq('type', 'NEGATIF').order('name');
      if (rulesData) setNegativeRules(rulesData);

      // 5. Fetch teacher schedules
      const { data: schedData } = await supabase
        .from('sr_teaching_schedules')
        .select(`
          id, day_of_week, start_period, end_period, semester,
          subject:subject_id (id, name, code),
          class:class_id (id, name)
        `)
        .eq('teacher_id', profile.id);
      if (schedData) setTeacherSchedules(schedData);

      // 6. Fetch extracurriculars coached
      const { data: eksData } = await supabase.from('sr_extracurriculars').select('*').eq('coach_id', profile.id);
      if (eksData) setMyEkskuls(eksData);

      // 6b. Fetch exam assignments (pengawas/panitia ujian) via API
      try {
        const extRes = await fetch('/api/exams?type=teachers');
        if (extRes.ok) {
          const extData = await extRes.json();
          const myExamData = extData.filter(item => item.teacher_id === profile.id);
          setMyExams(myExamData.map(item => item.exam).filter(Boolean));
        }
      } catch (err) {
        console.error("Gagal mengambil tugas pengawas:", err);
      }

      // 7. Fetch active sessions & history
      await fetchSessionsHistory();

      // 8. Fetch teacher details for Profile Tab
      const { data: detailsData } = await supabase.from('sr_teacher_details').select('*').eq('profile_id', profile.id).maybeSingle();
      
      setProfileForm({
        full_name: profile.full_name || '',
        nip: detailsData?.nip || '',
        nuptk: detailsData?.nuptk || '',
        gender: detailsData?.gender || 'L',
        birth_date: detailsData?.birth_date || '',
        employment_status: detailsData?.employment_status || 'PNS',
        phone: detailsData?.phone || ''
      });

      // 9. Fetch school announcements / information
      const annRes = await fetch('/api/announcements');
      if (annRes.ok) {
        const annData = await annRes.json();
        setAnnouncements(annData.filter(item => item.is_active && (item.target_audience === 'SEMUA' || item.target_audience === 'GURU')));
      }

      // 10. Fetch teacher's reported violations (to show notifications)
      const { data: reportedActs } = await supabase
        .from('sr_activities')
        .select(`
          id, student_id, type, description, status, event_date, created_at,
          rule:rule_id (name, default_point),
          student:student_id (full_name, class_name)
        `)
        .eq('teacher_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (reportedActs) setReportedActivities(reportedActs);

      // 11. If Homeroom teacher, load homeroom data
      if (profile.is_walikelas && profile.kelas_binaan) {
        await fetchWaliKelasData();
      }

    } catch (err) {
      console.error("Gagal memuat data dashboard guru:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionsHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const url = profile.is_kepsek ? '/api/sessions' : `/api/sessions?teacher_id=${profile.id}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSessionsHistory(data);
        
        // Check if there is an active session currently running
        const now = new Date();
        const active = data.find(s => {
          const start = new Date(s.start_time);
          const end = new Date(s.end_time);
          return now >= start && now <= end;
        });
        if (active) {
          setActiveSession(active);
        } else {
          setActiveSession(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchAttendees = async (sessionId) => {
    try {
      const res = await fetch(`/api/records?session_id=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out status = DITOLAK
        setSessionLogs(data.filter(r => r.status !== 'DITOLAK'));
      }
    } catch (e) {
      console.error("Gagal fetch real-time attendees:", e);
    }
  };

  const handleGenerateSession = async (e) => {
    e.preventDefault();
    setIsGeneratingSession(true);

    try {
      const now = new Date();
      const endTime = new Date(now.getTime() + sessionDuration * 60 * 1000);
      const randToken = Math.random().toString(36).substring(2, 8).toUpperCase();

      let payload = {
        teacher_id: profile.id,
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
        qr_token: '',
        title: ''
      };

      if (selectedScheduleId) {
        // Load config from teaching schedule
        const sched = teacherSchedules.find(s => s.id === selectedScheduleId);
        if (!sched) throw new Error("Jadwal tidak ditemukan.");

        payload.session_type = 'MAPEL';
        payload.target_class = sched.class?.name || 'SEMUA';
        payload.subject_id = sched.subject?.id;
        payload.jam_ke = `${sched.start_period}-${sched.end_period}`;
        payload.title = `KBM: ${sched.subject?.name} (${sched.class?.name})`;
        payload.qr_token = `SR-KBM-${sched.class?.name.replace(/\s+/g, '')}-${randToken}`;
      } else {
        // Custom manual session
        const form = customSessionForm;
        let targetClassVal = form.class_name;
        if (form.session_type === 'MAPEL') {
          if (selectedCustomClasses.length === 0) throw new Error("Pilih Kelas Sasaran.");
          targetClassVal = selectedCustomClasses.includes('SEMUA') ? 'SEMUA' : selectedCustomClasses.join(', ');
        } else {
          if (!form.class_name) throw new Error("Pilih Kelas Sasaran.");
        }
        
        payload.session_type = form.session_type;
        payload.target_class = targetClassVal;
        payload.jam_ke = form.jam_ke || null;

        if (form.session_type === 'MAPEL') {
          if (!form.subject_id) throw new Error("Pilih Mata Pelajaran.");
          const sub = allSubjects.find(s => s.id === form.subject_id);
          payload.subject_id = form.subject_id;
          payload.title = `KBM: ${sub?.name || 'Mapel'} (${targetClassVal})`;
        } else if (form.session_type === 'EKSKUL') {
          if (!form.extracurricular_id) throw new Error("Pilih Ekstrakurikuler.");
          const eks = myEkskuls.find(ek => ek.id === form.extracurricular_id);
          payload.extracurricular_id = form.extracurricular_id;
          payload.title = `Ekskul: ${eks?.name || 'Kegiatan'}`;
        } else if (form.session_type === 'UJIAN') {
          payload.exam_id = form.exam_id || null;
          payload.title = form.title || 'Ujian';
        } else {
          payload.title = form.title || `Presensi ${form.session_type}`;
        }
        
        payload.qr_token = `SR-${form.session_type}-${targetClassVal.replace(/\s+/g, '')}-${randToken}`;
      }

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan sesi di database");
      }

      const resData = await res.json();
      alert("Sesi presensi QR berhasil digenerate!");
      setActiveSession(resData.data);
      setSelectedScheduleId('');
      setCustomSessionForm({
        session_type: 'MAPEL',
        class_name: '',
        subject_id: '',
        jam_ke: '',
        extracurricular_id: '',
        title: ''
      });
      setSelectedCustomClasses(['SEMUA']);
      await fetchSessionsHistory();
    } catch (err) {
      alert("Gagal membuat sesi: " + err.message);
    } finally {
      setIsGeneratingSession(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    if (!confirm("Apakah Anda yakin ingin segera mengakhiri sesi presensi QR ini?")) return;
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

      if (!res.ok) throw new Error("Gagal mengakhiri sesi");
      
      alert("Sesi presensi QR telah berakhir.");
      setActiveSession(null);
      await fetchSessionsHistory();
    } catch (e) {
      alert(e.message);
    }
  };

  // Student Violation Submit (with client-side Canvas Compression)
  const handleTeacherViolationSubmit = async (e) => {
    e.preventDefault();
    if (!teacherViolationForm.student_id) return alert("Pilih Siswa terlebih dahulu.");
    if (!teacherViolationForm.rule_id) return alert("Pilih jenis pelanggaran.");

    setReporting(true);
    try {
      let attachmentUrl = null;

      if (violationFile) {
        // Upload compressed file to Supabase Storage
        const fileExt = violationFile.name.split('.').pop() || 'jpg';
        const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
        const filePath = `activities/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('sr_attachments')
          .upload(filePath, violationFile);

        if (uploadError) {
          console.warn("Storage upload failed, falling back to mock attachment link.", uploadError);
          attachmentUrl = "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600";
        } else {
          const { data: urlData } = supabase.storage
            .from('sr_attachments')
            .getPublicUrl(filePath);
          attachmentUrl = urlData.publicUrl;
        }
      }

      // Insert Activity Record (Status = PENDING, awaiting Kesiswaan review)
      const { error: insertErr } = await supabase.from('sr_activities').insert([
        {
          student_id: teacherViolationForm.student_id,
          teacher_id: profile.id,
          rule_id: teacherViolationForm.rule_id,
          type: 'NEGATIF',
          description: teacherViolationForm.description,
          attachment_url: attachmentUrl,
          status: 'PENDING',
          event_date: new Date().toISOString()
        }
      ]);

      if (insertErr) throw insertErr;

      alert("Laporan pelanggaran berhasil dikirim ke antrean Kesiswaan.");
      setTeacherViolationForm({ student_id: '', rule_id: '', description: '' });
      setViolationFile(null);
      setViolationPreview(null);
      setIsViolationExpanded(false); // Auto-collapse on success
      
      // Reload teacher reported activities feed
      await fetchTeacherDashboardData();
    } catch (err) {
      alert("Gagal mengirim laporan: " + err.message);
    } finally {
      setReporting(false);
    }
  };

  const handleViolationFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Compress client-side automatically to max width 800px, quality 0.7
      const compressed = await compressImage(file, 800, 0.7);
      setViolationFile(compressed);
      
      // Set preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setViolationPreview(reader.result);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error("Compression error:", err);
      setViolationFile(file);
      setViolationPreview(URL.createObjectURL(file));
    }
  };

  const handleWaliKelasAbsenceSubmit = async (e) => {
    e.preventDefault();
    if (!walikelasAbsenceForm.student_id) return alert("Pilih Siswa.");

    setSubmittingAbsence(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date();
      todayEnd.setHours(23,59,59,999);

      // 1. Get or Create HARIAN_MASUK session for today
      const { data: existingSessions, error: sessionErr } = await supabase
        .from('sr_attendance_sessions')
        .select('id')
        .eq('session_type', 'HARIAN_MASUK')
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString())
        .limit(1);

      if (sessionErr) throw sessionErr;

      let sessionId;
      if (existingSessions && existingSessions.length > 0) {
        sessionId = existingSessions[0].id;
      } else {
        const { data: newSession, error: createSessionErr } = await supabase
          .from('sr_attendance_sessions')
          .insert([{
            teacher_id: profile.id,
            session_type: 'HARIAN_MASUK',
            target_class: 'SEMUA',
            start_time: todayStart.toISOString(),
            end_time: todayEnd.toISOString(),
            qr_token: `HARIAN-MANUAL-${Date.now()}`
          }])
          .select();

        if (createSessionErr) throw createSessionErr;
        sessionId = newSession[0].id;
      }

      // 2. Delete existing record for student today to avoid conflict
      await supabase
        .from('sr_attendance_records')
        .delete()
        .eq('session_id', sessionId)
        .eq('student_id', walikelasAbsenceForm.student_id);

      // 3. Save attendance record
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          student_id: walikelasAbsenceForm.student_id,
          status: walikelasAbsenceForm.status,
          reason: `Wali Kelas (${profile.full_name}): Input manual`
        })
      });

      if (!res.ok) throw new Error("Gagal mencatat kehadiran manual");

      alert(`Sukses mencatat ketidakhadiran siswa dengan status: ${walikelasAbsenceForm.status}`);
      setWalikelasAbsenceForm({ student_id: '', status: 'SAKIT' });
      setIsAbsenceExpanded(false); // Auto-collapse on success
      
      if (profile.is_walikelas) {
        await fetchWaliKelasData();
      }
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setSubmittingAbsence(false);
    }
  };

  // Tab Laporan: Generate matrix report
  const handleGenerateRekap = async () => {
    if (!rekapFilters.class_name) return alert("Pilih Kelas.");
    
    setIsLoadingRekap(true);
    try {
      // 1. Fetch sessions matching class & date range
      let query = supabase.from('sr_attendance_sessions')
        .select('id, start_time, session_type, title, subject:subject_id(name)')
        .or(`target_class.eq.${rekapFilters.class_name},target_class.eq.SEMUA,target_class.ilike.%${rekapFilters.class_name}%`)
        .gte('start_time', `${rekapFilters.startDate}T00:00:00.000Z`)
        .lte('start_time', `${rekapFilters.endDate}T23:59:59.999Z`);
      
      if (rekapFilters.subject_id) {
        query = query.eq('subject_id', rekapFilters.subject_id);
      }
      
      const { data: sessions, error: sessErr } = await query.order('start_time', { ascending: true });
      if (sessErr) throw sessErr;

      // 2. Fetch class students
      const { data: students, error: stdErr } = await supabase.from('sr_profiles')
        .select('id, full_name')
        .eq('role', 'SISWA')
        .eq('class_name', rekapFilters.class_name)
        .order('full_name');
      if (stdErr) throw stdErr;

      if (sessions.length === 0) {
        setRekapData([]);
        setRekapDates([]);
        alert("Tidak ada sesi presensi ditemukan untuk filter ini.");
        return;
      }

      // 3. Fetch attendance records for these sessions
      const sessionIds = sessions.map(s => s.id);
      const { data: records, error: recErr } = await supabase.from('sr_attendance_records')
        .select('session_id, student_id, status')
        .in('session_id', sessionIds);
      if (recErr) throw recErr;

      // 4. Extract unique session dates
      const dates = sessions.map(s => {
        const dObj = new Date(s.start_time);
        return {
          sessionId: s.id,
          label: dObj.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' }),
          fullName: dObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ` (${s.subject?.name || s.session_type})`
        };
      });
      setRekapDates(dates);

      // 5. Build cross-tab grid
      const matrix = students.map(student => {
        const studentRecs = records.filter(r => r.student_id === student.id);
        const row = {
          id: student.id,
          name: student.full_name,
          H: 0, S: 0, I: 0, A: 0, D: 0, T: 0
        };

        dates.forEach(d => {
          const rec = studentRecs.find(r => r.session_id === d.sessionId);
          const status = rec ? rec.status : '-';
          row[d.sessionId] = status;
          if (status === 'HADIR') row.H++;
          if (status === 'SAKIT') row.S++;
          if (status === 'IZIN') row.I++;
          if (status === 'ALPA') row.A++;
          if (status === 'DISPEN') row.D++;
          if (status === 'TERLAMBAT') row.T++;
        });

        return row;
      });

      setRekapData(matrix);
    } catch (err) {
      alert("Gagal memuat rekap: " + err.message);
    } finally {
      setIsLoadingRekap(false);
    }
  };

  const handleExportRekapExcel = () => {
    if (rekapData.length === 0) return alert("Tampilkan rekap data terlebih dahulu.");

    // Map rows for Excel helper
    const excelRows = rekapData.map(row => {
      const output = {
        'Nama Siswa': row.name
      };

      // Add columns for each date session
      rekapDates.forEach(d => {
        output[d.fullName] = row[d.sessionId];
      });

      // Add totals
      output['Hadir (H)'] = row.H;
      output['Terlambat (T)'] = row.T;
      output['Sakit (S)'] = row.S;
      output['Izin (I)'] = row.I;
      output['Alpa (A)'] = row.A;
      output['Dispen (D)'] = row.D;

      return output;
    });

    exportToExcel(excelRows, `Rekap_Presensi_${rekapFilters.class_name}_${new Date().toISOString().split('T')[0]}`);
  };

  // Tab 3: Update Profile Info
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      // 1. Update full_name in profiles
      const { error: profileErr } = await supabase.from('sr_profiles')
        .update({ full_name: profileForm.full_name })
        .eq('id', profile.id);
      if (profileErr) throw profileErr;

      // 2. Upsert details
      const { error: detailsErr } = await supabase.from('sr_teacher_details').upsert({
        profile_id: profile.id,
        nip: profileForm.nip || null,
        nuptk: profileForm.nuptk || null,
        gender: profileForm.gender,
        birth_date: profileForm.birth_date || null,
        employment_status: profileForm.employment_status,
        phone: profileForm.phone || null
      });
      if (detailsErr) throw detailsErr;

      alert("Profil Anda berhasil disimpan!");
      await fetchTeacherDashboardData();
    } catch (err) {
      alert("Gagal memperbarui profil: " + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Tab 3: Select Avatar file and set preview
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 300, 0.8);
      setTempAvatarFile(compressed);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempAvatarPreview(reader.result);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error("Compression error:", err);
      setTempAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Tab 3: Upload selected avatar to Supabase
  const handleUploadAvatar = async () => {
    if (!tempAvatarPreview) return;

    setIsSavingAvatar(true);
    try {
      const { error: updateErr } = await supabase.from('sr_profiles')
        .update({ avatar_url: tempAvatarPreview })
        .eq('id', profile.id);

      if (updateErr) throw updateErr;

      alert("Foto profil berhasil diperbarui!");
      setTempAvatarFile(null);
      setTempAvatarPreview(null);
      window.location.reload();
    } catch (err) {
      alert("Gagal memperbarui foto profil: " + err.message);
    } finally {
      setIsSavingAvatar(false);
    }
  };

  // Tab 4: Homeroom (Wali Kelas) Loading Logic
  const fetchWaliKelasData = async () => {
    setIsLoadingWl(true);
    try {
      // 1. Get Homeroom students
      const { data: students, error: stdErr } = await supabase.from('sr_profiles')
        .select('id, full_name, nomor_induk')
        .eq('role', 'SISWA')
        .eq('class_name', profile.kelas_binaan)
        .order('full_name');
      if (stdErr) throw stdErr;
      setWlStudents(students || []);

      if (!students || students.length === 0) {
        setIsLoadingWl(false);
        return;
      }

      const studentIds = students.map(s => s.id);

      // 2. Fetch KBM attendance records for homeroom class students
      const { data: attendance, error: attErr } = await supabase.from('sr_attendance_records')
        .select(`
          id, status, created_at, student_id,
          session:session_id (
            id, session_type, title, subject:subject_id(name)
          )
        `)
        .in('student_id', studentIds);
      if (attErr) throw attErr;

      const matrix = students.map(student => {
        const studentRecs = (attendance || []).filter(r => r.student_id === student.id);
        const sums = {
          id: student.id,
          name: student.full_name,
          H: 0, S: 0, I: 0, A: 0, D: 0, T: 0
        };
        studentRecs.forEach(r => {
          if (r.status === 'HADIR') sums.H++;
          if (r.status === 'SAKIT') sums.S++;
          if (r.status === 'IZIN') sums.I++;
          if (r.status === 'ALPA') sums.A++;
          if (r.status === 'DISPEN') sums.D++;
          if (r.status === 'TERLAMBAT') sums.T++;
        });
        return sums;
      });
      setWlAttendanceMatrix(matrix);

      // 3. Fetch all positive & negative activity logs of class students
      const { data: activities, error: actErr } = await supabase.from('sr_activities')
        .select(`
          id, student_id, type, description, status, event_date,
          rule:rule_id(name, default_point),
          student:student_id(full_name),
          teacher:teacher_id(full_name)
        `)
        .in('student_id', studentIds)
        .order('event_date', { ascending: false });
      if (actErr) throw actErr;
      setWlActivities(activities || []);

      // 4. Notifications for APPROVED violations
      const notifications = (activities || []).filter(a => a.type === 'NEGATIF' && a.status === 'APPROVED');
      setWlNotifications(notifications);

    } catch (err) {
      console.error("Gagal memuat data Wali Kelas:", err);
    } finally {
      setIsLoadingWl(false);
    }
  };

  const handleExportWlExcel = () => {
    if (wlAttendanceMatrix.length === 0) return alert("Data wali kelas kosong.");
    
    const rows = wlAttendanceMatrix.map(row => ({
      'Nama Siswa': row.name,
      'Hadir (H)': row.H,
      'Terlambat (T)': row.T,
      'Sakit (S)': row.S,
      'Izin (I)': row.I,
      'Alpa (A)': row.A,
      'Dispensasi (D)': row.D
    }));

    exportToExcel(rows, `Rekap_Kehadiran_WaliKelas_${profile.kelas_binaan}_${new Date().toISOString().split('T')[0]}`);
  };

  const handleLogoutClick = async () => {
    if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
      await supabase.auth.signOut();
      router.replace('/login');
    }
  };

  const getSessionTypeLabel = (type, title) => {
    if (title) return title;
    if (type === 'HARIAN_MASUK') return 'Presensi Harian Masuk';
    if (type === 'HARIAN_PULANG') return 'Presensi Harian Pulang';
    if (type === 'MAPEL') return 'Presensi KBM';
    if (type === 'EKSKUL') return 'Presensi Ekstrakurikuler';
    if (type === 'UJIAN') return 'Presensi Ujian';
    if (type === 'KEGIATAN') return 'Presensi Kegiatan';
    return type;
  };

  if (authLoading || loading || !profile) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', gap: 16, color: 'var(--text-muted)'
      }}>
        <RefreshCw size={36} className="animate-spin text-primary" />
        <span>Memuat Dasbor Smart-Report...</span>
      </div>
    );
  }

  // JIKA USER ADALAH ADMIN, MANAJEMEN SEKOLAH, ATAU KEPALA SEKOLAH
  if ((profile.role === 'ADMIN' || profile.is_manajemen || profile.is_kepsek) && guruActiveTab === 'dashboard') {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Header Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
              <h1 style={{ margin: 0, fontSize: 22, color: 'var(--text-light)' }}>
                Halo, <span style={{ color: 'var(--banner-accent)' }}>{profile.full_name}</span>!
              </h1>
              <p className="text-muted" style={{ margin: 0, fontSize: 13, marginTop: 2 }}>
                {profile.role === 'ADMIN' ? 'Dashboard Administrator' : (
                  profile.is_kepsek ? 'Kepala Sekolah' :
                  profile.manajemen_role === 'KURIKULUM' ? `${profile.is_waka ? 'Waka' : 'Staf'} Kurikulum` :
                  profile.manajemen_role === 'KESISWAAN' ? `${profile.is_waka ? 'Waka' : 'Staf'} Kesiswaan` :
                  profile.manajemen_role === 'SARPRAS' ? `${profile.is_waka ? 'Waka' : 'Staf'} Sarana Prasarana (Sarpras)` :
                  profile.manajemen_role === 'HUMAS' ? `${profile.is_waka ? 'Waka' : 'Staf'} Humas & Layanan` : `${profile.is_waka ? 'Waka' : 'Staf'} Manajemen`
                )} SMAN 2 Bandung
              </p>
              {profile.is_walikelas && (
                <button 
                  onClick={() => setGuruActiveTab('kelas_binaan')}
                  style={{
                    marginTop: 8, padding: '6px 12px', fontSize: 11, fontWeight: 'bold',
                    borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.2)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
                  }}
                >
                  <Users size={12} />
                  <span>Buka Dasbor Kewalikelasan ({profile.kelas_binaan})</span>
                </button>
              )}
            </div>
          </div>

          {/* Theme Toggle, Bell, Reports and Logout Container */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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
              onClick={() => { setShowNotif(true); }}
              style={{
                position: 'relative', width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-light)'
              }}
            >
              <Bell size={20} />
            </button>

            {/* Rekap Laporan Quick Button */}
            <button 
              onClick={() => router.push('/admin/kesiswaan?tab=rapor')} 
              className="btn-primary flex items-center gap-2"
              style={{ height: 44, padding: '0 16px', fontWeight: 'bold' }}
            >
              <ShieldCheck size={18} />
              <span>Rekap Laporan</span>
            </button>

            {/* Logout Button */}
            <button 
              onClick={handleLogoutClick} 
              className="btn-danger flex items-center gap-2" 
              style={{ border: 'none', height: 44, padding: '0 16px', fontWeight: 'bold' }}
            >
              <LogOut size={16} />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Informasi Card (Humas & Pengumuman Sekolah) */}
        <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--banner-bg)', border: '1px solid var(--banner-border)', borderLeft: '5px solid var(--banner-accent)', boxShadow: 'var(--shadow-glass)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--banner-text)' }}>
            <Megaphone size={18} className="animate-pulse" style={{ color: 'var(--banner-accent)' }} /> Informasi & Pengumuman Sekolah
          </h3>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'row', 
            overflowX: 'auto', 
            gap: 12,
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: 6
          }}>
            {announcements.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--banner-text-muted)', fontStyle: 'italic', width: '100%' }}>
                Belum ada pengumuman terbaru dari Humas.
              </p>
            ) : (
              announcements.map((ann) => {
                return (
                  <div 
                    key={ann.id} 
                    style={{
                      padding: 14, borderRadius: 12, 
                      background: 'rgba(255, 255, 255, 0.08)', 
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      flex: '0 0 100%',
                      scrollSnapAlign: 'start',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ 
                          fontSize: 9, fontWeight: 'bold', background: 'var(--banner-accent)', 
                          color: 'white', padding: '3px 8px', borderRadius: 6
                        }}>
                          {ann.category || 'INFORMASI'}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--banner-text-muted)' }}>
                        {new Date(ann.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <h4 style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 'bold', color: 'var(--banner-text)' }}>{ann.title}</h4>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--banner-text-muted)', lineHeight: '1.5' }}>{ann.content}</p>
                    {ann.flyer_url && (
                      <button
                        onClick={() => setSelectedFlyer(ann.flyer_url)}
                        style={{
                          alignSelf: 'flex-start',
                          marginTop: 8,
                          padding: '6px 12px',
                          fontSize: 11,
                          fontWeight: 'bold',
                          borderRadius: 8,
                          background: 'var(--primary-color)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: 'var(--shadow-glass)'
                        }}
                      >
                        <ImageIcon size={14} />
                        <span>Tampilkan Flyer</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {announcements.length > 1 && (
            <span style={{ fontSize: 10, color: 'var(--banner-text-muted)', alignSelf: 'flex-end', marginTop: -6 }}>
              Geser kesamping untuk melihat lainnya ({announcements.length}) →
            </span>
          )}
        </div>

        {/* Presensi QR & Laporkan Pelanggaran Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 10 }}>
           
           {/* COLLAPSIBLE QR PRESENSI CARD */}
           <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12, borderColor: activeSession ? 'var(--success-color)' : 'var(--surface-border)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                 <QrCode size={18} className="text-primary" /> Sesi Presensi QR
               </h3>
               {activeSession && (
                 <span className="badge badge-success flex items-center gap-1" style={{ fontSize: 10, padding: '2px 8px' }}>
                   ● Sesi Aktif
                 </span>
               )}
             </div>
             
             <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
               {activeSession 
                 ? `Sesi berjalan: ${getSessionTypeLabel(activeSession.session_type, activeSession.title)} (${activeSession.target_class})` 
                 : (profile.is_kepsek ? "Tidak ada sesi presensi QR aktif saat ini." : "Aktifkan QR Code di dalam kelas agar siswa dapat melakukan presensi secara mandiri dengan geofence sekolah.")
               }
             </p>

             {!profile.is_kepsek && (
               <button 
                 onClick={() => setIsPresensiExpanded(!isPresensiExpanded)}
                 className="btn-primary" 
                 style={{ 
                   display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, 
                   padding: '10px 12px', fontSize: 13, width: '100%', fontWeight: 'bold'
                 }}
               >
                 <QrCode size={16} />
                 <span>{activeSession ? "Monitor Presensi (Aktif)" : "Generate Presensi"}</span>
               </button>
             )}

             {((isPresensiExpanded && !profile.is_kepsek) || (profile.is_kepsek && activeSession)) && (
               <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 15, marginTop: 5, display: 'flex', flexDirection: 'column', gap: 15 }}>
                 {activeSession ? (
                   // ACTIVE SESSION PANEL
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                       <span style={{ color: 'var(--text-muted)' }}>Waktu Mulai: {new Date(activeSession.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                       <span style={{ color: '#f87171', fontWeight: 'bold' }}>
                         Berakhir: {new Date(activeSession.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                       </span>
                     </div>

                     <div style={{ display: 'flex', justifyContent: 'center', background: 'white', padding: 12, borderRadius: 12, width: 200, margin: '0 auto' }}>
                       <img 
                         src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${activeSession.qr_token}`} 
                         alt="QR Presensi" 
                         style={{ width: '100%', height: 'auto' }} 
                       />
                     </div>

                     <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                       Token: <code style={{ fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }}>{activeSession.qr_token}</code>
                     </div>

                     {!profile.is_kepsek && (
                       <button 
                         onClick={handleEndSession}
                         className="btn-primary" 
                         style={{ background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 }}
                       >
                         <StopCircle size={16} /> Selesai & Akhiri Sesi QR
                       </button>
                     )}

                     {/* Real-time Attendees list */}
                     <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 12 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, fontWeight: 'bold' }}>
                         <span>Siswa Terpresensi Realtime</span>
                         <span style={{ color: 'var(--primary-color)' }}>{sessionLogs.length} Siswa</span>
                       </div>
                       
                       <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                         {sessionLogs.length === 0 ? (
                           <div style={{ textAlign: 'center', padding: '15px 0', fontSize: 11, color: 'var(--text-muted)' }}>
                             Menunggu siswa melakukan scan...
                           </div>
                         ) : (
                           sessionLogs.map((log, idx) => (
                             <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 6, fontSize: 11 }}>
                               <span>{idx+1}. {log.student?.full_name}</span>
                               <span style={{ 
                                 color: log.status === 'HADIR' ? '#34d399' : '#f59e0b',
                                 fontWeight: 'bold'
                               }}>{log.status}</span>
                             </div>
                           ))
                         )}
                       </div>
                     </div>
                   </div>
                 ) : (
                   // GENERATE SESSION PANEL
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                     {/* Schedule quick option */}
                     {teacherSchedules.length > 0 && (
                       <div className="form-group" style={{ background: 'rgba(245, 158, 11, 0.03)', padding: 12, borderRadius: 8, border: '1px solid rgba(245,158,11,0.1)' }}>
                         <label style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--primary-color)' }}>Pilih dari Jadwal Mengajar KBM Hari Ini</label>
                         <select 
                           className="form-input"
                           value={selectedScheduleId}
                           onChange={e => {
                             setSelectedScheduleId(e.target.value);
                             setSelectedPresensiType('MAPEL');
                           }}
                           style={{ fontSize: 12, height: 36, marginTop: 4 }}
                         >
                           <option value="">-- Pilih sesuai jadwal (Otomatis) --</option>
                           {teacherSchedules.map(s => (
                             <option key={s.id} value={s.id}>
                               {s.day_of_week}, Jam Ke-{s.start_period}-{s.end_period} | {s.subject?.name} ({s.class?.name})
                             </option>
                           ))}
                         </select>
                       </div>
                     )}

                     <form onSubmit={handleGenerateSession} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                       {!selectedScheduleId && (
                         <>
                           <div className="form-group">
                             <label style={{ fontSize: 12 }}>Jenis Presensi / Tugas</label>
                             <select 
                               className="form-input" 
                               value={selectedPresensiType}
                               onChange={e => {
                                 const val = e.target.value;
                                 setSelectedPresensiType(val);
                                 
                                 if (val === 'MAPEL') {
                                    setCustomSessionForm({
                                      session_type: 'MAPEL',
                                      class_name: '',
                                      subject_id: '',
                                      jam_ke: '',
                                      extracurricular_id: '',
                                      exam_id: '',
                                      title: ''
                                    });
                                  } else if (val === 'WALIKELAS') {
                                    setCustomSessionForm({
                                      session_type: 'KEGIATAN',
                                      class_name: profile.kelas_binaan || 'SEMUA',
                                      subject_id: '',
                                      jam_ke: '',
                                      extracurricular_id: '',
                                      exam_id: '',
                                      title: `Kegiatan Wali Kelas ${profile.kelas_binaan || ''}`
                                    });
                                  } else if (val.startsWith('ekskul-')) {
                                    const ekId = val.substring(7);
                                    const ek = myEkskuls.find(item => item.id === ekId);
                                    setCustomSessionForm({
                                      session_type: 'EKSKUL',
                                      class_name: 'SEMUA',
                                      subject_id: '',
                                      jam_ke: '',
                                      extracurricular_id: ekId,
                                      exam_id: '',
                                      title: `Ekskul: ${ek?.name || 'Kegiatan'}`
                                    });
                                  } else if (val.startsWith('tugas-')) {
                                    const assId = val.substring(6);
                                    const ass = myAssignments.find(item => item.id === assId);
                                    const isUjian = ass?.type?.name?.toLowerCase().includes('ujian') || ass?.type?.name?.toLowerCase().includes('pengawas');
                                    setCustomSessionForm({
                                      session_type: isUjian ? 'UJIAN' : 'KEGIATAN',
                                      class_name: ass?.details || 'SEMUA',
                                      subject_id: '',
                                      jam_ke: '',
                                      extracurricular_id: '',
                                      exam_id: '',
                                      title: ass?.type?.name || 'Tugas Tambahan'
                                    });
                                  } else if (val.startsWith('ujian-')) {
                                    const exId = val.substring(6);
                                    const ex = myExams.find(item => item.id === exId);
                                    setCustomSessionForm({
                                      session_type: 'UJIAN',
                                      class_name: 'SEMUA',
                                      subject_id: '',
                                      jam_ke: '',
                                      extracurricular_id: '',
                                      exam_id: exId,
                                      title: `Pengawasan Ujian: ${ex?.name || 'Ujian'}`
                                    });
                                  }
                                }}
                                style={{ fontSize: 12, height: 36 }}
                              >
                                <option value="MAPEL">Presensi KBM Kelas (Mata Pelajaran)</option>
                                {profile.is_walikelas && (
                                  <option value="WALIKELAS">Wali Kelas - Kelas {profile.kelas_binaan}</option>
                                )}
                                {myEkskuls.map(ek => (
                                  <option key={ek.id} value={`ekskul-${ek.id}`}>Pembina Ekskul - {ek.name}</option>
                                ))}
                                {myExams.map(ex => (
                                  <option key={ex.id} value={`ujian-${ex.id}`}>Pengawas Ujian - {ex.name}</option>
                                ))}
                                {myAssignments.map(ass => (
                                  <option key={ass.id} value={`tugas-${ass.id}`}>Tugas: {ass.type?.name} {ass.details ? `(${ass.details})` : ''}</option>
                                ))}</select>
                           </div>

                           {selectedPresensiType === 'MAPEL' && (
                             <>
                               <div className="form-group">
                                 <label style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>Kelas Sasaran</label>
                                 <div style={{ 
                                   display: 'flex', flexDirection: 'column', gap: 6, 
                                   maxHeight: 150, overflowY: 'auto', padding: '10px 12px', 
                                   border: '1px solid var(--surface-border)', borderRadius: 8, 
                                   background: 'var(--input-bg)',
                                   color: 'var(--input-color)' 
                                 }}>
                                   <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-light)' }}>
                                     <input 
                                       type="checkbox" 
                                       checked={selectedCustomClasses.includes('SEMUA')} 
                                       onChange={(e) => {
                                         if (e.target.checked) {
                                           setSelectedCustomClasses(['SEMUA']);
                                         } else {
                                           setSelectedCustomClasses([]);
                                         }
                                       }}
                                     />
                                     <span>Semua Kelas</span>
                                   </label>
                                   <div style={{ borderTop: '1px solid var(--surface-border)', margin: '4px 0' }} />
                                   {allClasses.map(c => (
                                     <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-light)' }}>
                                       <input 
                                         type="checkbox" 
                                         checked={selectedCustomClasses.includes(c.name)}
                                         disabled={selectedCustomClasses.includes('SEMUA')}
                                         onChange={(e) => {
                                           if (e.target.checked) {
                                             setSelectedCustomClasses([...selectedCustomClasses.filter(x => x !== 'SEMUA'), c.name]);
                                           } else {
                                             setSelectedCustomClasses(selectedCustomClasses.filter(x => x !== c.name));
                                           }
                                         }}
                                       />
                                       <span>{c.name}</span>
                                     </label>
                                   ))}
                                 </div>
                               </div>

                               <div className="form-group">
                                 <label style={{ fontSize: 12 }}>Mata Pelajaran</label>
                                 <select 
                                   className="form-input" 
                                   required
                                   value={customSessionForm.subject_id}
                                   onChange={e => setCustomSessionForm({...customSessionForm, subject_id: e.target.value})}
                                   style={{ fontSize: 12, height: 36 }}
                                 >
                                   <option value="">-- Pilih Mapel --</option>
                                   {allSubjects.map(s => (
                                     <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                   ))}
                                 </select>
                               </div>

                               <div className="form-group">
                                 <label style={{ fontSize: 12 }}>Jam Ke- (cth: 1-3)</label>
                                 <input 
                                   type="text" 
                                   className="form-input"
                                   placeholder="cth: 1-2"
                                   value={customSessionForm.jam_ke}
                                   onChange={e => setCustomSessionForm({...customSessionForm, jam_ke: e.target.value})}
                                   style={{ fontSize: 12 }}
                                 />
                               </div>
                             </>
                           )}

                           {selectedPresensiType !== 'MAPEL' && (
                             <div className="form-group">
                               <label style={{ fontSize: 12 }}>Rincian Detail Sesi</label>
                               <div style={{
                                 padding: '10px 12px', borderRadius: 8, background: 'var(--card-inner-bg)',
                                 border: '1px solid var(--surface-border)', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6
                               }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                   <span style={{ color: 'var(--text-muted)' }}>Judul Presensi:</span>
                                   <span style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>{customSessionForm.title}</span>
                                 </div>
                                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                   <span style={{ color: 'var(--text-muted)' }}>Target Kelas:</span>
                                   <span style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>{customSessionForm.class_name}</span>
                                 </div>
                               </div>
                             </div>
                           )}
                         </>
                       )}

                       <div className="form-group">
                         <label style={{ fontSize: 12 }}>Durasi Sesi Aktif (Menit)</label>
                         <select 
                           className="form-input"
                           value={sessionDuration}
                           onChange={e => setSessionDuration(parseInt(e.target.value))}
                           style={{ fontSize: 12, height: 36 }}
                         >
                           <option value={10}>10 Menit</option>
                           <option value={15}>15 Menit</option>
                           <option value={30}>30 Menit</option>
                           <option value={45}>45 Menit</option>
                           <option value={60}>60 Menit</option>
                           <option value={120}>120 Menit</option>
                         </select>
                       </div>

                       <button 
                         type="submit" 
                         className="btn-primary" 
                         style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, width: '100%', fontWeight: 'bold' }}
                         disabled={isGeneratingSession}
                       >
                         <QrCode size={16} /> {isGeneratingSession ? 'Membuat Sesi...' : 'Generate Presensi'}
                       </button>
                     </form>
                   </div>
                 )}
               </div>
             )}
           </div>

           {/* COLLAPSIBLE VIOLATION CARD */}
           <div className="glass-panel" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: 12 }}>
             <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: '#f87171' }}>
               <AlertTriangle size={20} /> Laporkan Pelanggaran Siswa
             </h3>
             <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
               Laporkan tindakan pelanggaran tata tertib siswa langsung ke antrean Kesiswaan.
             </p>

             <button 
               onClick={() => setIsViolationExpanded(!isViolationExpanded)}
               className="btn-primary" 
               style={{ 
                 display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, 
                 padding: '10px 12px', fontSize: 13, width: '100%', fontWeight: 'bold',
                 background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                 border: 'none',
                 boxShadow: '0 4px 14px 0 rgba(234, 88, 12, 0.3)'
               }}
             >
               <AlertTriangle size={16} />
               <span>Lapor Pelanggaran</span>
             </button>

             {isViolationExpanded && (
               <form onSubmit={handleTeacherViolationSubmit} style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 15, marginTop: 5, display: 'flex', flexDirection: 'column', gap: 12 }}>
                 <div className="form-group">
                   <label style={{ fontSize: 12 }}>Pilih Siswa</label>
                   <select 
                     className="form-input"
                     required
                     value={teacherViolationForm.student_id}
                     onChange={e => setTeacherViolationForm({...teacherViolationForm, student_id: e.target.value})}
                     style={{ fontSize: 12, height: 36 }}
                   >
                     <option value="">-- Pilih Siswa --</option>
                     {allStudents.map(s => (
                       <option key={s.id} value={s.id}>{s.full_name} ({s.class_name || 'Tanpa Kelas'})</option>
                     ))}
                   </select>
                 </div>

                 <div className="form-group">
                   <label style={{ fontSize: 12 }}>Jenis Pelanggaran</label>
                   <select 
                     className="form-input"
                     required
                     value={teacherViolationForm.rule_id}
                     onChange={e => setTeacherViolationForm({...teacherViolationForm, rule_id: e.target.value})}
                     style={{ fontSize: 12, height: 36 }}
                   >
                     <option value="">-- Pilih Aturan Tata Tertib --</option>
                     {negativeRules.map(r => (
                       <option key={r.id} value={r.id}>{r.name} (-{r.default_point} Poin)</option>
                     ))}
                   </select>
                 </div>

                 <div className="form-group">
                   <label style={{ fontSize: 12 }}>Uraian Kejadian</label>
                   <textarea 
                     className="form-input"
                     required
                     rows={3}
                     placeholder="Contoh: Kedapatan membuang sampah sembarangan di halaman sekolah..."
                     value={teacherViolationForm.description}
                     onChange={e => setTeacherViolationForm({...teacherViolationForm, description: e.target.value})}
                     style={{ fontSize: 12, fontFamily: 'inherit', resize: 'none' }}
                   />
                 </div>

                 {/* Upload Foto Bukti with client-side compression */}
                 <div className="form-group">
                   <label style={{ fontSize: 12 }}>Foto Bukti Pelanggaran (Opsional)</label>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                     <label 
                       htmlFor="admin-violation-file-upload" 
                       className="btn-secondary" 
                       style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8, cursor: 'pointer', fontSize: 12 }}
                     >
                       <ImageIcon size={16} /> Pilih / Ambil Foto
                     </label>
                     <input 
                       type="file" 
                       id="admin-violation-file-upload" 
                       accept="image/*" 
                       onChange={handleViolationFileChange} 
                       style={{ display: 'none' }} 
                     />

                     {violationPreview && (
                       <div style={{ position: 'relative', width: '100%', maxHeight: 150, overflow: 'hidden', borderRadius: 8, border: '1px solid var(--surface-border)' }}>
                         <img src={violationPreview} alt="Preview Bukti" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
                         <button 
                           type="button" 
                           onClick={() => { setViolationFile(null); setViolationPreview(null); }}
                           style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', padding: 4 }}
                         >
                           <XCircle size={16} />
                         </button>
                       </div>
                     )}

                     {violationFile && (
                       <span style={{ fontSize: 10, color: '#34d399', textAlign: 'center' }}>
                         Foto dikompresi: {(violationFile.size / 1024).toFixed(1)} KB (Max 200KB)
                       </span>
                     )}
                   </div>
                 </div>

                 <button 
                   type="submit" 
                   className="btn-primary" 
                   style={{ 
                     background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
                     border: 'none', display: 'flex', alignItems: 'center', 
                     justifyContent: 'center', gap: 8, padding: 12, width: '100%', 
                     fontWeight: 'bold', color: 'white' 
                   }}
                   disabled={reporting}
                 >
                   <AlertTriangle size={16} /> {reporting ? 'Mengirim...' : 'Lapor Pelanggaran'}
                 </button>
               </form>
             )}
           </div>

        </div>

        {/* DASHBOARD KONTEN BERDASARKAN ROLE */}
        {isSuperAdmin && (
          <>
            {/* Dashboard Grid (Statistics) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
              {/* Card 1: Total Siswa */}
              <div className="glass-panel" style={{ display: 'flex', gap: 15, alignItems: 'center', background: 'rgba(255, 255, 255, 0.01)', borderLeft: '4px solid var(--primary-color)', boxShadow: 'var(--shadow-glass)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', width: 50, height: 50, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Users size={24} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: '500' }}>Total Siswa</span>
                  <span style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text-light)', marginTop: 2 }}>{stats.totalSiswa}</span>
                </div>
              </div>
              
              {/* Card 2: Total Guru */}
              <div className="glass-panel" style={{ display: 'flex', gap: 15, alignItems: 'center', background: 'rgba(255, 255, 255, 0.01)', borderLeft: '4px solid #10b981', boxShadow: 'var(--shadow-glass)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', width: 50, height: 50, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ShieldCheck size={24} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: '500' }}>Total Guru & Pegawai</span>
                  <span style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text-light)', marginTop: 2 }}>{stats.totalGuru}</span>
                </div>
              </div>
              
              {/* Card 3: Pelanggaran */}
              <div className="glass-panel" style={{ display: 'flex', gap: 15, alignItems: 'center', background: 'rgba(255, 255, 255, 0.01)', borderLeft: '4px solid #ef4444', boxShadow: 'var(--shadow-glass)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', width: 50, height: 50, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlertTriangle size={24} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: '500' }}>Pelanggaran Disetujui</span>
                  <span style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text-light)', marginTop: 2 }}>{stats.totalPelanggaran}</span>
                </div>
              </div>

              {/* Card 4: Geofence */}
              <div className="glass-panel" style={{ display: 'flex', gap: 15, alignItems: 'center', background: 'rgba(255, 255, 255, 0.01)', borderLeft: '4px solid #f59e0b', boxShadow: 'var(--shadow-glass)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', width: 50, height: 50, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={24} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: '500' }}>Status Geofence Sekolah</span>
                  <span style={{ fontSize: 14, fontWeight: 'bold', color: '#34d399', marginTop: 6 }}>
                    {stats.geofenceActive ? 'Aktif (100m)' : 'Nonaktif'}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div>
              <h2 style={{ fontSize: 18, margin: '10px 0 12px', color: 'var(--text-light)' }}>Aktivitas Terbaru</h2>
              <div className="glass-panel">
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Waktu</th>
                        <th>Keterangan</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivities.length > 0 ? (
                        (isActivitiesExpanded ? recentActivities : recentActivities.slice(0, 3)).map((act) => {
                          const isPending = act.status === 'PENDING';
                          const isApproved = act.status === 'APPROVED';
                          let badgeClass = 'badge-success';
                          let statusLabel = 'SELESAI';
                          if (isPending) {
                            badgeClass = 'badge-warning';
                            statusLabel = 'PENDING';
                          } else if (act.status === 'REJECTED') {
                            badgeClass = 'badge-danger';
                            statusLabel = 'DITOLAK';
                          } else if (isApproved) {
                            badgeClass = 'badge-success';
                            statusLabel = 'DISETUJUI';
                          }
                          return (
                            <tr key={act.id}>
                              <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {new Date(act.event_date || act.created_at).toLocaleString('id-ID', {
                                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })} WIB
                              </td>
                              <td>
                                <div style={{ fontWeight: 'bold', color: 'var(--text-light)', fontSize: 12 }}>
                                  {act.student?.full_name || 'Siswa'} ({act.student?.class_name || 'Tanpa Kelas'})
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                  {act.rule?.name || act.description} {act.rule?.default_point ? `(-${act.rule.default_point} Poin)` : ''}
                                </div>
                              </td>
                              <td>
                                <span className={`badge ${badgeClass}`} style={{ fontSize: 10, padding: '3px 8px' }}>
                                  {statusLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Hari ini, 07:00 WIB</td>
                          <td style={{ fontWeight: 'bold', color: 'var(--text-light)', fontSize: 12 }}>Sistem Smart-Report aktif melayani presensi kehadiran siswa.</td>
                          <td><span className="badge badge-success" style={{ fontSize: 10, padding: '3px 8px' }}>AKTIF</span></td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {recentActivities.length > 3 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 15 }}>
                    <button
                      onClick={() => setIsActivitiesExpanded(!isActivitiesExpanded)}
                      className="btn-primary"
                      style={{
                        padding: '8px 24px',
                        fontSize: 12,
                        fontWeight: 'bold',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-glass)',
                        background: 'linear-gradient(135deg, var(--primary-color) 0%, rgba(59, 130, 246, 0.8) 100%)'
                      }}
                    >
                      <span>{isActivitiesExpanded ? 'Tutup Riwayat' : 'Telusuri Aktivitas'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* KESISWAAN SUMMARY DASHBOARD */}
        {isKesiswaan && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Card 1: Ringkasan Kehadiran Siswa Hari Ini */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, background: 'rgba(255, 255, 255, 0.01)', borderLeft: '4px solid var(--primary-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-light)' }}>
                  <Users size={18} color="var(--primary-color)" /> Ringkasan Kehadiran Siswa Hari Ini
                </h3>
                <button 
                  onClick={() => setKesiswaanExpandAbsence(!kesiswaanExpandAbsence)}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, border: '1px solid var(--surface-border)', background: 'transparent' }}
                >
                  <span>{kesiswaanExpandAbsence ? 'Tutup Rincian' : 'Telusuri Kehadiran'}</span>
                  {kesiswaanExpandAbsence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-light)', fontWeight: 'bold' }}>
                <span className="badge badge-success">Hadir: {stats.attendanceSummary?.HADIR || 0}</span>
                <span className="badge badge-warning">Terlambat: {stats.attendanceSummary?.TERLAMBAT || 0}</span>
                <span className="badge badge-primary">Sakit: {stats.attendanceSummary?.SAKIT || 0}</span>
                <span className="badge badge-primary" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>Izin: {stats.attendanceSummary?.IZIN || 0}</span>
                <span className="badge badge-danger">Alpa: {stats.attendanceSummary?.ALPA || 0}</span>
                <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>Dispen: {stats.attendanceSummary?.DISPEN || 0}</span>
              </div>

              {kesiswaanExpandAbsence && (
                <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Persentase Kehadiran dan rincian siswa KBM berjalan:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'white', marginBottom: 2 }}>
                        <span>Rasio Kehadiran</span>
                        <span>
                          {(() => {
                            const total = Object.values(stats.attendanceSummary || {}).reduce((a, b) => a + b, 0);
                            const present = (stats.attendanceSummary?.HADIR || 0) + (stats.attendanceSummary?.TERLAMBAT || 0) + (stats.attendanceSummary?.DISPEN || 0);
                            return total > 0 ? `${Math.round((present / total) * 100)}%` : '0% (Belum ada sesi hari ini)';
                          })()}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: (() => {
                            const total = Object.values(stats.attendanceSummary || {}).reduce((a, b) => a + b, 0);
                            const present = (stats.attendanceSummary?.HADIR || 0) + (stats.attendanceSummary?.TERLAMBAT || 0) + (stats.attendanceSummary?.DISPEN || 0);
                            return total > 0 ? `${Math.round((present / total) * 100)}%` : '0%';
                          })(),
                          height: '100%',
                          background: 'var(--primary-color)'
                        }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>
                    Catatan: Data di atas dihitung secara dinamis dari log pemindaian QR presensi masuk harian hari ini.
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Ringkasan Tata Tertib & Karakter Siswa */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, background: 'rgba(255, 255, 255, 0.01)', borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-light)' }}>
                  <AlertTriangle size={18} color="#ef4444" /> Laporan Tata Tertib & Karakter
                </h3>
                <button 
                  onClick={() => setKesiswaanExpandTatib(!kesiswaanExpandTatib)}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, border: '1px solid var(--surface-border)', background: 'transparent' }}
                >
                  <span>{kesiswaanExpandTatib ? 'Tutup Rincian' : 'Telusuri Pelanggaran'}</span>
                  {kesiswaanExpandTatib ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-light)' }}>
                <div>Total Pelanggaran Disetujui: <strong style={{ color: '#f87171' }}>{stats.totalPelanggaran}</strong></div>
                <div>Total Prestasi Disetujui: <strong style={{ color: '#34d399' }}>{stats.totalPrestasi}</strong></div>
              </div>

              {kesiswaanExpandTatib && (
                <div style={{ marginTop: 10 }}>
                  <h4 style={{ fontSize: 12, color: 'var(--text-light)', marginBottom: 8, fontWeight: 'bold' }}>Aktivitas Pelanggaran Terbaru</h4>
                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Waktu</th>
                          <th>Siswa</th>
                          <th>Pelanggaran & Bobot</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentActivities.length > 0 ? (
                          recentActivities.slice(0, 5).map((act) => (
                            <tr key={act.id}>
                              <td style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {new Date(act.event_date || act.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </td>
                              <td>
                                <div style={{ fontWeight: 'bold', fontSize: 11, color: 'var(--text-light)' }}>{act.student?.full_name}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{act.student?.class_name}</div>
                              </td>
                              <td>
                                <div style={{ fontSize: 11, color: 'white' }}>{act.rule?.name || act.description}</div>
                                <div style={{ fontSize: 10, color: '#f87171' }}>-{act.rule?.default_point || 5} Poin</div>
                              </td>
                              <td>
                                <span className={`badge ${act.status === 'APPROVED' ? 'badge-success' : act.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: 9 }}>
                                  {act.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan="4" className="text-center text-muted py-4">Belum ada laporan pelanggaran terbaru.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: Ringkasan Unit Ekstrakurikuler */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, background: 'rgba(255, 255, 255, 0.01)', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-light)' }}>
                  <Award size={18} color="#10b981" /> Laporan Ekstrakurikuler
                </h3>
                <button 
                  onClick={() => setKesiswaanExpandEkskul(!kesiswaanExpandEkskul)}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, border: '1px solid var(--surface-border)', background: 'transparent' }}
                >
                  <span>{kesiswaanExpandEkskul ? 'Tutup Rincian' : 'Telusuri Ekskul'}</span>
                  {kesiswaanExpandEkskul ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-light)' }}>
                Total Unit Ekstrakurikuler Terdaftar: <strong>{stats.totalEkskul} Bidang</strong>
              </div>

              {kesiswaanExpandEkskul && (
                <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold', color: 'white' }}>Daftar Ekstrakurikuler Terpopuler:</div>
                  <ul style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <li><strong>Paskibra:</strong> Pembina Utama - Hanifah Ratih, S.Pd.</li>
                    <li><strong>Pramuka (Wajib):</strong> Pembina - Drs. M. Yusuf.</li>
                    <li><strong>PMR (Palang Merah):</strong> Pembina - Sri Widaningsih, S.Pd.</li>
                    <li><strong>Futsal & Basket Club:</strong> Pembina - Mariano N., S.Pd.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Quick Master Navigation */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 5 }}>
              <button 
                onClick={() => router.push('/admin/kesiswaan')}
                className="btn-primary flex items-center gap-2"
                style={{ padding: '10px 20px', fontWeight: 'bold', borderRadius: 12 }}
              >
                <Smartphone size={18} />
                <span>Kelola Data Master Kesiswaan (CRUD & Aksi)</span>
              </button>
            </div>
          </div>
        )}

        {/* KURIKULUM SUMMARY DASHBOARD */}
        {isKurikulum && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Card 1: Ringkasan Data Akademik */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, background: 'rgba(255, 255, 255, 0.01)', borderLeft: '4px solid var(--primary-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-light)' }}>
                  <BookOpen size={18} color="var(--primary-color)" /> Ringkasan Data Akademik Sekolah
                </h3>
                <button 
                  onClick={() => setKurikulumExpandAkademik(!kurikulumExpandAkademik)}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, border: '1px solid var(--surface-border)', background: 'transparent' }}
                >
                  <span>{kurikulumExpandAkademik ? 'Tutup Rincian' : 'Telusuri Akademik'}</span>
                  {kurikulumExpandAkademik ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-light)' }}>
                <div>Total Kelas: <strong>{stats.totalKelas}</strong></div>
                <div>Total Mapel: <strong>{stats.totalMapel}</strong></div>
                <div>Total Guru: <strong>{stats.totalGuru}</strong></div>
              </div>

              {kurikulumExpandAkademik && (
                <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.15)', fontSize: 12, color: 'var(--text-muted)' }}>
                  <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', color: 'white' }}>Rasio Akademik SMAN 2:</p>
                  <div>Rasio guru per kelas: 1 : {Math.round((stats.totalGuru / (stats.totalKelas || 1)) * 10) / 10}</div>
                  <div style={{ marginTop: 4 }}>Semua kurikulum mengacu pada Kurikulum Merdeka Fase E (Kelas 10) & Fase F (Kelas 11 & 12).</div>
                </div>
              )}
            </div>

            {/* Card 2: Laporan Presensi KBM & Pelaksanaan Sesi */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, background: 'rgba(255, 255, 255, 0.01)', borderLeft: '4px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-light)' }}>
                  <QrCode size={18} color="#10b981" /> Status Presensi KBM & Sesi Aktif
                </h3>
                <button 
                  onClick={() => setKurikulumExpandKbm(!kurikulumExpandKbm)}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, border: '1px solid var(--surface-border)', background: 'transparent' }}
                >
                  <span>{kurikulumExpandKbm ? 'Tutup Rincian' : 'Telusuri Sesi KBM'}</span>
                  {kurikulumExpandKbm ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-light)' }}>
                Total Sesi Presensi Terdaftar/Aktif: <strong>{stats.totalSesiToday} Sesi</strong>
              </div>

              {kurikulumExpandKbm && (
                <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.15)', fontSize: 12, color: 'var(--text-muted)' }}>
                  <p style={{ margin: 0 }}>Sesi presensi di-generate harian oleh tim piket kurikulum atau guru mapel yang mengajar di kelas. Untuk melihat/membuat sesi presensi silakan klik tombol **Generate Presensi** di sidebar.</p>
                </div>
              )}
            </div>

            {/* Quick Navigation */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 5 }}>
              <button 
                onClick={() => router.push('/admin/kurikulum')}
                className="btn-primary flex items-center gap-2"
                style={{ padding: '10px 20px', fontWeight: 'bold', borderRadius: 12 }}
              >
                <BookOpen size={18} />
                <span>Kelola Data Master Kurikulum (CRUD & Jadwal)</span>
              </button>
            </div>
          </div>
        )}

        {/* SARPRAS SUMMARY DASHBOARD */}
        {isSarpras && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Card 1: Ringkasan Inventaris Aset */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, background: 'rgba(255, 255, 255, 0.01)', borderLeft: '4px solid var(--primary-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-light)' }}>
                  <Archive size={18} color="var(--primary-color)" /> Ringkasan Inventaris Barang & Aset
                </h3>
                <button 
                  onClick={() => setSarprasExpandAset(!sarprasExpandAset)}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, border: '1px solid var(--surface-border)', background: 'transparent' }}
                >
                  <span>{sarprasExpandAset ? 'Tutup Rincian' : 'Telusuri Aset'}</span>
                  {sarprasExpandAset ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-light)' }}>
                <div>Total Kategori Aset: <strong>{stats.totalAset} Kategori</strong></div>
                <div>Kondisi Baik: <strong style={{ color: '#34d399' }}>{stats.asetCondition.Baik}</strong></div>
                <div>Butuh Perbaikan: <strong style={{ color: '#fbbf24' }}>{stats.asetCondition.ButuhPerbaikan}</strong></div>
              </div>

              {sarprasExpandAset && (
                <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.15)', fontSize: 12, color: 'var(--text-muted)' }}>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <li>Gedung A s.d. F SMAN 2 (Kondisi: Baik)</li>
                    <li>Proyektor Epson EB-X06 - 12 Unit (Kondisi: Baik)</li>
                    <li>AC Daikin - 8 Unit (Kondisi: 1 Butuh Perbaikan)</li>
                    <li>Laboratorium Komputer - 2 Lab (Kondisi: Baik)</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Card 2: Laporan Peminjaman Fasilitas & Kerusakan */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, background: 'rgba(255, 255, 255, 0.01)', borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-light)' }}>
                  <AlertTriangle size={18} color="#ef4444" /> Ringkasan Peminjaman & Pemeliharaan
                </h3>
                <button 
                  onClick={() => setSarprasExpandPinjam(!sarprasExpandPinjam)}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, border: '1px solid var(--surface-border)', background: 'transparent' }}
                >
                  <span>{sarprasExpandPinjam ? 'Tutup Rincian' : 'Telusuri Pemeliharaan'}</span>
                  {sarprasExpandPinjam ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-light)' }}>
                <div>Peminjaman Fasilitas: <strong style={{ color: '#fbbf24' }}>{stats.totalPeminjamanPending} Pending</strong></div>
                <div>Laporan Kerusakan: <strong style={{ color: '#f87171' }}>{stats.totalKerusakanPending} Pending</strong></div>
              </div>

              {sarprasExpandPinjam && (
                <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.15)', fontSize: 12, color: 'var(--text-muted)' }}>
                  <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', color: 'white' }}>Antrean Tindakan Sarpras:</p>
                  <div>1. Peminjaman Aula SMAN 2 - Rapat Koordinasi Guru (Status: PENDING)</div>
                  <div>2. Peminjaman Lapangan Basket - Latihan OSIS (Status: PENDING)</div>
                  <div style={{ marginTop: 4 }}>3. Laporan AC X MIPA 1 mengeluarkan angin panas (Status: PENDING)</div>
                </div>
              )}
            </div>

            {/* Quick Navigation */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 5 }}>
              <button 
                onClick={() => router.push('/admin/sarpras')}
                className="btn-primary flex items-center gap-2"
                style={{ padding: '10px 20px', fontWeight: 'bold', borderRadius: 12 }}
              >
                <Archive size={18} />
                <span>Kelola Data Master Sarpras (CRUD & Tindakan)</span>
              </button>
            </div>
          </div>
        )}

        {/* HUMAS SUMMARY DASHBOARD */}
        {isHumas && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Card 1: Ringkasan Publikasi & Banner Informasi */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 18, background: 'rgba(255, 255, 255, 0.01)', borderLeft: '4px solid var(--primary-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-light)' }}>
                  <Megaphone size={18} color="var(--primary-color)" /> Ringkasan Informasi & Berita Terbit
                </h3>
                <button 
                  onClick={() => setHumasExpandAnn(!humasExpandAnn)}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', fontSize: 11, border: '1px solid var(--surface-border)', background: 'transparent' }}
                >
                  <span>{humasExpandAnn ? 'Tutup Rincian' : 'Telusuri Berita'}</span>
                  {humasExpandAnn ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-light)' }}>
                <div>Total Informasi Terbit: <strong>{stats.totalInformasiActive}</strong></div>
                <div>Total Draft Informasi: <strong>{stats.totalInformasi - stats.totalInformasiActive}</strong></div>
              </div>

              {humasExpandAnn && (
                <div style={{ marginTop: 10, padding: 12, borderRadius: 8, background: 'rgba(0,0,0,0.15)', fontSize: 12, color: 'var(--text-muted)' }}>
                  <p style={{ margin: 0 }}>Pengumuman sekolah ditayangkan secara real-time pada halaman beranda siswa dan guru. Anda dapat mengubah status keaktifan publikasi pengumuman dari menu Humas.</p>
                </div>
              )}
            </div>

            {/* Quick Navigation */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 5 }}>
              <button 
                onClick={() => router.push('/admin/humas')}
                className="btn-primary flex items-center gap-2"
                style={{ padding: '10px 20px', fontWeight: 'bold', borderRadius: 12 }}
              >
                <Megaphone size={18} />
                <span>Kelola Data Master Humas & Publikasi (CRUD)</span>
              </button>
            </div>
          </div>
        )}

        {/* Layanan Lainnya Section for Admin/Manajemen */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>Layanan Lainnya (Pengembangan Ke Depan)</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
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

        {/* Modals for Notifications and Flyers */}
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
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', color: 'var(--text-light)' }}>Notifikasi Dashboard</h3>
                <button 
                  onClick={() => setShowNotif(false)}
                  style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                  <Bell size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <p style={{ fontSize: 13 }}>Tidak ada notifikasi baru saat ini.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedFlyer && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(10px)',
            zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
          }}>
            <div style={{
              background: 'var(--surface-dark)', border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 650,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)'
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 20px', borderBottom: '1px solid var(--surface-border)'
              }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', color: 'var(--text-light)' }}>Flyer Pengumuman</h3>
                <button 
                  onClick={() => setSelectedFlyer(null)}
                  style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
              <div style={{ padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000', maxHeight: '70vh', overflow: 'auto' }}>
                <img 
                  src={selectedFlyer} 
                  alt="Flyer Pengumuman" 
                  style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 8 }} 
                />
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // LAYOUT GURU PENDIDIK / GURU MAPEL / WALI KELAS
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
            <h1 style={{ margin: 0, fontSize: 22, color: 'var(--text-light)' }}>
              Halo, <span style={{ color: 'var(--banner-accent)' }}>{profile.full_name}</span>!
            </h1>
            <p className="text-muted" style={{ margin: 0, fontSize: 13, marginTop: 2 }}>
              {profile.is_kepsek ? 'Kepala Sekolah' : profile.is_manajemen ? (
                profile.manajemen_role === 'KURIKULUM' ? `${profile.is_waka ? 'Waka' : 'Staf'} Kurikulum` :
                profile.manajemen_role === 'KESISWAAN' ? `${profile.is_waka ? 'Waka' : 'Staf'} Kesiswaan` :
                profile.manajemen_role === 'SARPRAS' ? `${profile.is_waka ? 'Waka' : 'Staf'} Sarana Prasarana (Sarpras)` :
                profile.manajemen_role === 'HUMAS' ? `${profile.is_waka ? 'Waka' : 'Staf'} Humas & Layanan` : 'Manajemen Sekolah'
              ) : profile.is_walikelas ? `Wali Kelas ${profile.kelas_binaan}` : 'Guru Pendidik'} SMAN 2 Bandung
            </p>
          </div>
        </div>

        {/* Theme Toggle, Bell, and Logout Container */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
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

          <button 
            onClick={handleLogoutClick} 
            className="btn-danger flex items-center gap-2" 
            style={{ border: 'none', height: 44, padding: '0 16px', fontWeight: 'bold' }}
          >
            <LogOut size={16} />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-container" style={{ margin: '10px 0' }}>
        <button 
          className={`tab-button flex items-center gap-2 ${guruActiveTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setGuruActiveTab('dashboard')}
        >
          <QrCode size={18} /> Dashboard KBM
        </button>
        <button 
          className={`tab-button flex items-center gap-2 ${guruActiveTab === 'tugas_tambahan' ? 'active' : ''}`}
          onClick={() => setGuruActiveTab('tugas_tambahan')}
        >
          <Award size={18} /> Tugas Tambahan
        </button>
        <button 
          className={`tab-button flex items-center gap-2 ${guruActiveTab === 'laporan' ? 'active' : ''}`}
          onClick={() => setGuruActiveTab('laporan')}
        >
          <FileSpreadsheet size={18} /> Laporan Presensi
        </button>
        <button 
          className={`tab-button flex items-center gap-2 ${guruActiveTab === 'profil' ? 'active' : ''}`}
          onClick={() => router.push('/admin/profile')}
        >
          <User size={18} /> Profil Pendidik
        </button>
        {profile.is_walikelas && (
          <button 
            className={`tab-button flex items-center gap-2 ${guruActiveTab === 'kelas_binaan' ? 'active' : ''}`}
            onClick={() => setGuruActiveTab('kelas_binaan')}
          >
            <Users size={18} /> Kelas Binaan ({profile.kelas_binaan})
          </button>
        )}
      </div>

      {/* TAB CONTENT 1: DASHBOARD KBM */}
      {guruActiveTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Informasi Card (Humas & Pengumuman Sekolah) */}
          <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--banner-bg)', border: '1px solid var(--banner-border)', borderLeft: '5px solid var(--banner-accent)', boxShadow: 'var(--shadow-glass)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--banner-text)' }}>
              <Megaphone size={18} className="animate-pulse" style={{ color: 'var(--banner-accent)' }} /> Informasi & Pengumuman Sekolah
            </h3>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              overflowX: 'auto', 
              gap: 12,
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: 6
            }}>
              {announcements.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--banner-text-muted)', fontStyle: 'italic', width: '100%' }}>
                  Belum ada pengumuman terbaru dari Humas.
                </p>
              ) : (
                announcements.map((ann) => {
                  const isForGuru = ann.title?.toLowerCase().includes('guru') || 
                                    ann.content?.toLowerCase().includes('guru') || 
                                    ann.title?.toLowerCase().includes('rapat') ||
                                    ann.title?.toLowerCase().includes('pendidik') ||
                                    ann.category === 'INFORMASI GURU';
                  
                  return (
                    <div 
                      key={ann.id} 
                      style={{
                        padding: 14, borderRadius: 12, 
                        background: 'rgba(255, 255, 255, 0.08)', 
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        flex: '0 0 100%',
                        scrollSnapAlign: 'start',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ 
                            fontSize: 9, fontWeight: 'bold', background: 'var(--banner-accent)', 
                            color: 'white', padding: '3px 8px', borderRadius: 6
                          }}>
                            {ann.category || 'INFORMASI'}
                          </span>
                          {isForGuru && (
                            <span style={{ 
                              fontSize: 9, fontWeight: 'bold', background: 'var(--danger-color)', 
                              color: 'white', padding: '3px 8px', borderRadius: 6
                            }}>
                              KHUSUS GURU
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 10, color: 'var(--banner-text-muted)' }}>
                          {new Date(ann.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <h4 style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 'bold', color: 'var(--banner-text)' }}>{ann.title}</h4>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--banner-text-muted)', lineHeight: '1.5' }}>{ann.content}</p>
                      {ann.flyer_url && (
                        <button
                          onClick={() => setSelectedFlyer(ann.flyer_url)}
                          style={{
                            alignSelf: 'flex-start',
                            marginTop: 8,
                            padding: '6px 12px',
                            fontSize: 11,
                            fontWeight: 'bold',
                            borderRadius: 8,
                            background: 'var(--primary-color)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: 'var(--shadow-glass)'
                          }}
                        >
                          <ImageIcon size={14} />
                          <span>Tampilkan Flyer</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            {announcements.length > 1 && (
              <span style={{ fontSize: 10, color: 'var(--banner-text-muted)', alignSelf: 'flex-end', marginTop: -6 }}>
                Geser kesamping untuk melihat lainnya ({announcements.length}) →
              </span>
            )}
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            
            {/* Column Left: Kelola Presensi & Wali Kelas Quick Absence */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* COLLAPSIBLE QR PRESENSI CARD */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12, borderColor: activeSession ? 'var(--success-color)' : 'var(--surface-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                    <QrCode size={18} className="text-primary" /> Sesi Presensi QR
                  </h3>
                  {activeSession && (
                    <span className="badge badge-success flex items-center gap-1" style={{ fontSize: 10, padding: '2px 8px' }}>
                      ● Sesi Aktif
                    </span>
                  )}
                </div>
                
                <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
                  {activeSession 
                    ? `Sesi berjalan: ${getSessionTypeLabel(activeSession.session_type, activeSession.title)} (${activeSession.target_class})` 
                    : "Aktifkan QR Code di dalam kelas agar siswa dapat melakukan presensi secara mandiri dengan geofence sekolah."
                  }
                </p>

                <button 
                  onClick={() => setIsPresensiExpanded(!isPresensiExpanded)}
                  className="btn-primary" 
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, 
                    padding: '10px 12px', fontSize: 13, width: '100%', fontWeight: 'bold'
                  }}
                >
                  <QrCode size={16} />
                  <span>{activeSession ? "Monitor Presensi Aktif" : "Generate Presensi"}</span>
                </button>

                {isPresensiExpanded && (
                  <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 15, marginTop: 5, display: 'flex', flexDirection: 'column', gap: 15 }}>
                    {activeSession ? (
                      // ACTIVE SESSION PANEL
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Waktu Mulai: {new Date(activeSession.start_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                          <span style={{ color: '#f87171', fontWeight: 'bold' }}>
                            Berakhir: {new Date(activeSession.end_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', background: 'white', padding: 12, borderRadius: 12, width: 200, margin: '0 auto' }}>
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${activeSession.qr_token}`} 
                            alt="QR Presensi" 
                            style={{ width: '100%', height: 'auto' }} 
                          />
                        </div>

                        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                          Token: <code style={{ fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }}>{activeSession.qr_token}</code>
                        </div>

                        <button 
                          onClick={handleEndSession}
                          className="btn-primary" 
                          style={{ background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 }}
                        >
                          <StopCircle size={16} /> Selesai & Akhiri Sesi QR
                        </button>

                        {/* Real-time Attendees list */}
                        <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8, fontWeight: 'bold' }}>
                            <span>Siswa Terpresensi Realtime</span>
                            <span style={{ color: 'var(--primary-color)' }}>{sessionLogs.length} Siswa</span>
                          </div>
                          
                          <div style={{ maxHeight: 150, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {sessionLogs.length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '15px 0', fontSize: 11, color: 'var(--text-muted)' }}>
                                Menunggu siswa melakukan scan...
                              </div>
                            ) : (
                              sessionLogs.map((log, idx) => (
                                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 6, fontSize: 11 }}>
                                  <span>{idx+1}. {log.student?.full_name}</span>
                                  <span style={{ 
                                    color: log.status === 'HADIR' ? '#34d399' : '#f59e0b',
                                    fontWeight: 'bold'
                                  }}>{log.status}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // GENERATE SESSION PANEL
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                        {/* Schedule quick option */}
                        {teacherSchedules.length > 0 && (
                          <div className="form-group" style={{ background: 'rgba(245, 158, 11, 0.03)', padding: 12, borderRadius: 8, border: '1px solid rgba(245,158,11,0.1)' }}>
                            <label style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--primary-color)' }}>Pilih dari Jadwal Mengajar KBM Hari Ini</label>
                            <select 
                              className="form-input"
                              value={selectedScheduleId}
                              onChange={e => {
                                setSelectedScheduleId(e.target.value);
                                setCustomSessionForm(prev => ({ ...prev, session_type: 'MAPEL' }));
                              }}
                              style={{ fontSize: 12, height: 36, marginTop: 4 }}
                            >
                              <option value="">-- Pilih sesuai jadwal (Otomatis) --</option>
                              {teacherSchedules.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.day_of_week}, Jam Ke-{s.start_period}-{s.end_period} | {s.subject?.name} ({s.class?.name})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <form onSubmit={handleGenerateSession} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {!selectedScheduleId && (
                            <>
                              <div className="form-group">
                                <label style={{ fontSize: 12 }}>Jenis Presensi / Tugas</label>
                                <select 
                                  className="form-input" 
                                  value={selectedPresensiType}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setSelectedPresensiType(val);
                                    
                                    if (val === 'MAPEL') {
                                      setCustomSessionForm({
                                        session_type: 'MAPEL',
                                        class_name: '',
                                        subject_id: '',
                                        jam_ke: '',
                                        extracurricular_id: '',
                                        title: ''
                                      });
                                    } else if (val === 'WALIKELAS') {
                                      setCustomSessionForm({
                                        session_type: 'KEGIATAN',
                                        class_name: profile.kelas_binaan || 'SEMUA',
                                        subject_id: '',
                                        jam_ke: '',
                                        extracurricular_id: '',
                                        title: `Kegiatan Wali Kelas ${profile.kelas_binaan || ''}`
                                      });
                                    } else if (val.startsWith('ekskul-')) {
                                      const ekId = val.substring(7);
                                      const ek = myEkskuls.find(item => item.id === ekId);
                                      setCustomSessionForm({
                                        session_type: 'EKSKUL',
                                        class_name: 'SEMUA',
                                        subject_id: '',
                                        jam_ke: '',
                                        extracurricular_id: ekId,
                                        exam_id: '',
                                        title: `Ekskul: ${ek?.name || 'Kegiatan'}`
                                      });
                                    } else if (val.startsWith('tugas-')) {
                                      const assId = val.substring(6);
                                      const ass = myAssignments.find(item => item.id === assId);
                                      const isUjian = ass?.type?.name?.toLowerCase().includes('ujian') || ass?.type?.name?.toLowerCase().includes('pengawas');
                                      setCustomSessionForm({
                                        session_type: isUjian ? 'UJIAN' : 'KEGIATAN',
                                        class_name: ass?.details || 'SEMUA',
                                        subject_id: '',
                                        jam_ke: '',
                                        extracurricular_id: '',
                                        exam_id: '',
                                        title: ass?.type?.name || 'Tugas Tambahan'
                                      });
                                    } else if (val.startsWith('ujian-')) {
                                      const exId = val.substring(6);
                                      const ex = myExams.find(item => item.id === exId);
                                      setCustomSessionForm({
                                        session_type: 'UJIAN',
                                        class_name: 'SEMUA',
                                        subject_id: '',
                                        jam_ke: '',
                                        extracurricular_id: '',
                                        exam_id: exId,
                                        title: `Pengawasan Ujian: ${ex?.name || 'Ujian'}`
                                      });
                                    }
                                  }}
                                  style={{ fontSize: 12, height: 36 }}
                                >
                                  <option value="MAPEL">Presensi KBM Kelas (Mata Pelajaran)</option>
                                  {profile.is_walikelas && (
                                    <option value="WALIKELAS">Wali Kelas - Kelas {profile.kelas_binaan}</option>
                                  )}
                                  {myEkskuls.map(ek => (
                                    <option key={ek.id} value={`ekskul-${ek.id}`}>Pembina Ekskul - {ek.name}</option>
                                  ))}
                                  {myExams.map(ex => (
                                    <option key={ex.id} value={`ujian-${ex.id}`}>Pengawas Ujian - {ex.name}</option>
                                  ))}
                                  {myAssignments.map(ass => (
                                    <option key={ass.id} value={`tugas-${ass.id}`}>Tugas: {ass.type?.name} {ass.details ? `(${ass.details})` : ''}</option>
                                  ))}
                                </select>
                              </div>

                              {selectedPresensiType === 'MAPEL' && (
                                <>
                                  <div className="form-group">
                                    <label style={{ fontSize: 12 }}>Kelas Sasaran</label>
                                    <select 
                                      className="form-input" 
                                      required
                                      value={customSessionForm.class_name}
                                      onChange={e => setCustomSessionForm({...customSessionForm, class_name: e.target.value})}
                                      style={{ fontSize: 12, height: 36 }}
                                    >
                                      <option value="">-- Pilih Kelas --</option>
                                      <option value="SEMUA">Semua Kelas</option>
                                      {allClasses.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="form-group">
                                    <label style={{ fontSize: 12 }}>Mata Pelajaran</label>
                                    <select 
                                      className="form-input" 
                                      required
                                      value={customSessionForm.subject_id}
                                      onChange={e => setCustomSessionForm({...customSessionForm, subject_id: e.target.value})}
                                      style={{ fontSize: 12, height: 36 }}
                                    >
                                      <option value="">-- Pilih Mapel --</option>
                                      {allSubjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="form-group">
                                    <label style={{ fontSize: 12 }}>Jam Ke- (cth: 1-3)</label>
                                    <input 
                                      type="text" 
                                      className="form-input"
                                      placeholder="cth: 1-2"
                                      value={customSessionForm.jam_ke}
                                      onChange={e => setCustomSessionForm({...customSessionForm, jam_ke: e.target.value})}
                                      style={{ fontSize: 12 }}
                                    />
                                  </div>
                                </>
                              )}

                              {selectedPresensiType !== 'MAPEL' && (
                                <div className="form-group">
                                  <label style={{ fontSize: 12 }}>Rincian Detail Sesi</label>
                                  <div style={{
                                    padding: '10px 12px', borderRadius: 8, background: 'var(--card-inner-bg)',
                                    border: '1px solid var(--surface-border)', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Judul Presensi:</span>
                                      <span style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>{customSessionForm.title}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Target Kelas:</span>
                                      <span style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>{customSessionForm.class_name}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          <div className="form-group">
                            <label style={{ fontSize: 12 }}>Durasi Sesi Aktif (Menit)</label>
                            <select 
                              className="form-input"
                              value={sessionDuration}
                              onChange={e => setSessionDuration(parseInt(e.target.value))}
                              style={{ fontSize: 12, height: 36 }}
                            >
                              <option value={10}>10 Menit</option>
                              <option value={15}>15 Menit</option>
                              <option value={30}>30 Menit</option>
                              <option value={45}>45 Menit</option>
                              <option value={60}>60 Menit</option>
                              <option value={120}>120 Menit</option>
                            </select>
                          </div>

                          <button 
                            type="submit" 
                            className="btn-primary" 
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, width: '100%', fontWeight: 'bold' }}
                            disabled={isGeneratingSession}
                          >
                            <QrCode size={16} /> {isGeneratingSession ? 'Membuat Sesi...' : 'Generate Presensi'}
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* COLLAPSIBLE WALI KELAS MANUAL ATTENDANCE */}
              {profile.is_walikelas && (
                <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                    <ClipboardList size={18} className="text-primary" /> Input Ketidakhadiran Manual Binaan
                  </h3>
                  <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
                    Catat langsung ketidakhadiran siswa binaan kelas <strong>{profile.kelas_binaan}</strong> hari ini.
                  </p>

                  <button 
                    onClick={() => setIsAbsenceExpanded(!isAbsenceExpanded)}
                    className="btn-secondary" 
                    style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, 
                      padding: '8px 12px', fontSize: 12, width: '100%', 
                      background: isAbsenceExpanded ? 'rgba(255,255,255,0.05)' : 'transparent', 
                      border: '1px solid var(--surface-border)', cursor: 'pointer'
                    }}
                  >
                    {isAbsenceExpanded ? "Sembunyikan Panel Input" : "Buka Input Kehadiran Manual"}
                  </button>

                  {isAbsenceExpanded && (
                    <form onSubmit={handleWaliKelasAbsenceSubmit} style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 15, marginTop: 5, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="form-group">
                        <label style={{ fontSize: 12 }}>Siswa Binaan</label>
                        <select 
                          className="form-input"
                          required
                          value={walikelasAbsenceForm.student_id}
                          onChange={e => setWalikelasAbsenceForm({...walikelasAbsenceForm, student_id: e.target.value})}
                          style={{ fontSize: 12, height: 36, width: '100%' }}
                        >
                          <option value="">-- Pilih Siswa --</option>
                          {allStudents.filter(s => s.class_name === profile.kelas_binaan).map(s => (
                            <option key={s.id} value={s.id}>{s.full_name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label style={{ fontSize: 12 }}>Keterangan Absen</label>
                        <select 
                          className="form-input"
                          required
                          value={walikelasAbsenceForm.status}
                          onChange={e => setWalikelasAbsenceForm({...walikelasAbsenceForm, status: e.target.value})}
                          style={{ fontSize: 12, height: 36, width: '100%' }}
                        >
                          <option value="SAKIT">Sakit</option>
                          <option value="IZIN">Izin</option>
                          <option value="ALPA">Alpa</option>
                          <option value="DISPEN">Dispensasi</option>
                        </select>
                      </div>

                      <button 
                        type="submit" 
                        className="btn-primary" 
                        style={{ padding: 10, fontSize: 13 }}
                        disabled={submittingAbsence}
                      >
                        {submittingAbsence ? 'Memproses...' : 'Catat Ketidakhadiran'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Column Right: COLLAPSIBLE Report Violation & Notifications Feed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* COLLAPSIBLE VIOLATION CARD */}
              <div className="glass-panel" style={{ height: 'fit-content', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: '#f87171' }}>
                  <AlertTriangle size={20} /> Laporkan Pelanggaran Siswa
                </h3>
                <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
                  Laporkan tindakan pelanggaran tata tertib siswa langsung ke antrean Kesiswaan.
                </p>

                <button 
                  onClick={() => setIsViolationExpanded(!isViolationExpanded)}
                  className="btn-primary" 
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, 
                    padding: '10px 12px', fontSize: 13, width: '100%', fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    border: 'none',
                    boxShadow: '0 4px 14px 0 rgba(234, 88, 12, 0.3)'
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>Lapor Pelanggaran</span>
                </button>

                {isViolationExpanded && (
                  <form onSubmit={handleTeacherViolationSubmit} style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 15, marginTop: 5, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label style={{ fontSize: 12 }}>Pilih Siswa</label>
                      <select 
                        className="form-input"
                        required
                        value={teacherViolationForm.student_id}
                        onChange={e => setTeacherViolationForm({...teacherViolationForm, student_id: e.target.value})}
                        style={{ fontSize: 12, height: 36 }}
                      >
                        <option value="">-- Pilih Siswa --</option>
                        {allStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.full_name} ({s.class_name || 'Tanpa Kelas'})</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: 12 }}>Jenis Pelanggaran</label>
                      <select 
                        className="form-input"
                        required
                        value={teacherViolationForm.rule_id}
                        onChange={e => setTeacherViolationForm({...teacherViolationForm, rule_id: e.target.value})}
                        style={{ fontSize: 12, height: 36 }}
                      >
                        <option value="">-- Pilih Aturan Tata Tertib --</option>
                        {negativeRules.map(r => (
                          <option key={r.id} value={r.id}>{r.name} (-{r.default_point} Poin)</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: 12 }}>Uraian Kejadian</label>
                      <textarea 
                        className="form-input"
                        required
                        rows={3}
                        placeholder="Contoh: Kedapatan membuang sampah sembarangan di halaman sekolah..."
                        value={teacherViolationForm.description}
                        onChange={e => setTeacherViolationForm({...teacherViolationForm, description: e.target.value})}
                        style={{ fontSize: 12, fontFamily: 'inherit', resize: 'none' }}
                      />
                    </div>

                    {/* Upload Foto Bukti with client-side compression */}
                    <div className="form-group">
                      <label style={{ fontSize: 12 }}>Foto Bukti Pelanggaran (Opsional)</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                        <label 
                          htmlFor="violation-file-upload" 
                          className="btn-secondary" 
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8, cursor: 'pointer', fontSize: 12 }}
                        >
                          <ImageIcon size={16} /> Pilih / Ambil Foto
                        </label>
                        <input 
                          type="file" 
                          id="violation-file-upload" 
                          accept="image/*" 
                          onChange={handleViolationFileChange} 
                          style={{ display: 'none' }} 
                        />

                        {violationPreview && (
                          <div style={{ position: 'relative', width: '100%', maxHeight: 150, overflow: 'hidden', borderRadius: 8, border: '1px solid var(--surface-border)' }}>
                            <img src={violationPreview} alt="Preview Bukti" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
                            <button 
                              type="button" 
                              onClick={() => { setViolationFile(null); setViolationPreview(null); }}
                              style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', padding: 4 }}
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        )}

                        {violationFile && (
                          <span style={{ fontSize: 10, color: '#34d399', textAlign: 'center' }}>
                            Foto dikompresi: {(violationFile.size / 1024).toFixed(1)} KB (Max 200KB)
                          </span>
                        )}
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      className="btn-primary" 
                      style={{ 
                        background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 
                        border: 'none', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', gap: 8, padding: 12, width: '100%', 
                        fontWeight: 'bold', color: 'white' 
                      }}
                      disabled={reporting}
                    >
                      <AlertTriangle size={16} /> {reporting ? 'Mengirim...' : 'Lapor Pelanggaran'}
                    </button>
                  </form>
                )}
              </div>

              {/* NOTIFIKASI & LOG STATUS LAPORAN */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, margin: 0, color: 'var(--primary-color)' }}>
                  <ShieldAlert size={18} /> Notifikasi & Status Laporan Anda
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
                  {reportedActivities.length === 0 && wlNotifications.length === 0 ? (
                    <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 11, margin: 0, textAlign: 'center', padding: '15px 0' }}>
                      Belum ada notifikasi atau laporan terbaru.
                    </p>
                  ) : (
                    <>
                      {/* Display Wali Kelas class alerts first */}
                      {profile.is_walikelas && wlNotifications.map(notif => (
                        <div 
                          key={`wk-alert-${notif.id}`} 
                          style={{
                            padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.03)', 
                            border: '1px solid rgba(239,68,68,0.1)', fontSize: 11
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                            <span style={{ fontWeight: 'bold', color: '#f87171' }}>Peringatan Wali Kelas</span>
                            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                              {new Date(notif.event_date).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-light)', fontWeight: 'bold' }}>{notif.student?.full_name}</div>
                          <div style={{ color: '#ef4444' }}>
                            Melanggar: {notif.rule?.name} (-{notif.rule?.default_point} Poin)
                          </div>
                          <p style={{ margin: '4px 0 0', fontStyle: 'italic', color: 'var(--text-muted)' }}>"{notif.description}"</p>
                        </div>
                      ))}

                      {/* Display status of teacher's reported activities */}
                      {reportedActivities.map(act => {
                        const isPending = act.status === 'PENDING';
                        const isApproved = act.status === 'APPROVED';
                        const isRejected = act.status === 'REJECTED';
                        
                        let cardBg = 'rgba(255,255,255,0.01)';
                        let borderStyle = '1px solid var(--surface-border)';
                        let statusText = '';
                        let statusColor = 'inherit';

                        if (isPending) {
                          cardBg = 'rgba(245,158,11,0.02)';
                          borderStyle = '1px solid rgba(245,158,11,0.1)';
                          statusText = 'MENUNGGU KESISWAAN';
                          statusColor = '#f59e0b';
                        } else if (isApproved) {
                          cardBg = 'rgba(16,185,129,0.02)';
                          borderStyle = '1px solid rgba(16,185,129,0.1)';
                          statusText = 'DISETUJUI & POIN DIPOTONG';
                          statusColor = '#34d399';
                        } else if (isRejected) {
                          cardBg = 'rgba(239,68,68,0.02)';
                          borderStyle = '1px solid rgba(239,68,68,0.1)';
                          statusText = 'LAPORAN DITOLAK';
                          statusColor = '#f87171';
                        }

                        return (
                          <div 
                            key={`reported-${act.id}`} 
                            style={{
                              padding: 10, borderRadius: 8, background: cardBg, 
                              border: borderStyle, fontSize: 11
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ color: statusColor, fontWeight: 'bold', fontSize: 9 }}>{statusText}</span>
                              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                                {new Date(act.event_date).toLocaleDateString('id-ID')}
                              </span>
                            </div>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>{act.student?.full_name} ({act.student?.class_name})</div>
                            <div style={{ color: 'var(--text-muted)' }}>{act.rule?.name}</div>
                            <p style={{ margin: '4px 0 0', fontStyle: 'italic', color: 'var(--text-muted)' }}>"{act.description}"</p>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* TAB CONTENT: TUGAS TAMBAHAN */}
        {/* Layanan Lainnya Section for Guru */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 'bold', margin: 0 }}>Layanan Lainnya (Pengembangan Ke Depan)</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
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

      {guruActiveTab === 'tugas_tambahan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}>
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-light)' }}>Daftar Penugasan Tambahan Pendidik</h3>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
              Berikut adalah daftar tugas tambahan resmi yang didelegasikan oleh pimpinan sekolah kepada Anda untuk tahun pelajaran ini.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 15 }}>
            {/* Wali Kelas Card */}
            {profile.is_walikelas && (
              <div className="glass-panel" style={{ display: 'flex', gap: 15, alignItems: 'flex-start', background: 'rgba(255,255,255,0.01)', borderLeft: '4px solid var(--primary-color)' }}>
                <div style={{ padding: 8, borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: 'var(--primary-color)' }}>
                  <Users size={24} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="badge badge-primary" style={{ fontSize: 9, alignSelf: 'flex-start' }}>STRUKTURAL</span>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: 'var(--text-light)' }}>Guru Wali Kelas</h4>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Bimbingan Kelas: <strong>{profile.kelas_binaan}</strong>
                  </p>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 11, lineHeight: '1.4' }}>
                    Mengawasi kehadiran harian KBM, membina karakter kedisiplinan siswa, dan melakukan koordinasi periodik dengan Orang Tua siswa.
                  </p>
                </div>
              </div>
            )}

            {/* Coached Extracurriculars */}
            {myEkskuls.map(ek => (
              <div key={ek.id} className="glass-panel" style={{ display: 'flex', gap: 15, alignItems: 'flex-start', background: 'rgba(255,255,255,0.01)', borderLeft: '4px solid #10b981' }}>
                <div style={{ padding: 8, borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#34d399' }}>
                  <Activity size={24} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="badge badge-success" style={{ fontSize: 9, alignSelf: 'flex-start' }}>NON-AKADEMIK</span>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: 'var(--text-light)' }}>Pembina Ekstrakurikuler</h4>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Kegiatan: <strong>{ek.name}</strong> ({ek.category})
                  </p>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 11, lineHeight: '1.4' }}>
                    Mengarahkan pengembangan bakat, kreativitas, dan minat siswa dalam organisasi ekstrakurikuler sekolah.
                  </p>
                </div>
              </div>
            ))}

            {/* General Assignments (e.g. Piket, UKS, etc.) */}
            {myAssignments.map(ass => {
              const isPiket = ass.type?.name?.includes('Piket');
              const themeColor = isPiket ? '#a78bfa' : '#60a5fa';
              const bgLight = isPiket ? 'rgba(167,139,250,0.1)' : 'rgba(96,165,250,0.1)';

              return (
                <div key={ass.id} className="glass-panel" style={{ display: 'flex', gap: 15, alignItems: 'flex-start', background: 'rgba(255,255,255,0.01)', borderLeft: `4px solid ${themeColor}` }}>
                  <div style={{ padding: 8, borderRadius: 8, background: bgLight, color: themeColor }}>
                    <ClipboardList size={24} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                    <span className="badge" style={{ fontSize: 9, alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                      PENUGASAN KHUSUS
                    </span>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: 'var(--text-light)' }}>{ass.type?.name}</h4>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                      Detail Binaan: <strong>{ass.details || '-'}</strong>
                    </p>
                    <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 11, lineHeight: '1.4' }}>
                      Menjalankan tugas piket harian sekolah, menangani ketertiban, mengawasi presensi masal, atau membantu pelayanan operasional sekolah.
                    </p>
                    {isPiket && (
                      <button 
                        onClick={() => router.push('/admin/presensi')}
                        className="btn-primary"
                        style={{ padding: '8px 14px', fontSize: 12, marginTop: 10, width: 'fit-content', fontWeight: 'bold' }}
                      >
                        Generate Presensi
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Exam Assignments (Pengawas / Panitia Ujian) */}
            {myExams.map(ex => (
              <div key={ex.id} className="glass-panel" style={{ display: 'flex', gap: 15, alignItems: 'flex-start', background: 'rgba(255,255,255,0.01)', borderLeft: '4px solid #f43f5e' }}>
                <div style={{ padding: 8, borderRadius: 8, background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}>
                  <ClipboardList size={24} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                  <span className="badge badge-danger" style={{ fontSize: 9, alignSelf: 'flex-start', background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}>
                    PENGAWAS / PANITIA UJIAN
                  </span>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: 'var(--text-light)' }}>{ex.name}</h4>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Pelaksanaan: <strong>{formatDate(ex.start_date)} s.d. {formatDate(ex.end_date)}</strong>
                  </p>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 11, lineHeight: '1.4' }}>
                    Bertugas sebagai panitia pelaksana atau guru pengawas ruang ujian. Silakan lakukan generate presensi sesi ujian untuk ruang Anda.
                  </p>
                  <button 
                    onClick={() => router.push(`/admin/presensi?type=UJIAN&exam_id=${ex.id}`)}
                    className="btn-primary"
                    style={{ padding: '8px 14px', fontSize: 12, marginTop: 10, width: 'fit-content', fontWeight: 'bold', background: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)', border: 'none' }}
                  >
                    Generate Presensi Ujian
                  </button>
                </div>
              </div>
            ))}

            {/* Waka (Manajemen) Card */}
            {profile.is_manajemen && profile.is_waka && ['KURIKULUM', 'KESISWAAN', 'SARPRAS', 'HUMAS'].includes(profile.manajemen_role) && (
              <div className="glass-panel" style={{ display: 'flex', gap: 15, alignItems: 'flex-start', background: 'rgba(255,255,255,0.01)', borderLeft: '4px solid var(--banner-accent)' }}>
                <div style={{ padding: 8, borderRadius: 8, background: 'rgba(244,63,94,0.1)', color: 'var(--banner-accent)' }}>
                  <ShieldCheck size={24} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                  <span className="badge badge-warning" style={{ fontSize: 9, alignSelf: 'flex-start' }}>STRUKTURAL MANAJEMEN</span>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: 'var(--text-light)' }}>
                    {profile.manajemen_role === 'KURIKULUM' && 'Wakil Kepala Sekolah Bidang Kurikulum'}
                    {profile.manajemen_role === 'KESISWAAN' && 'Wakil Kepala Sekolah Bidang Kesiswaan'}
                    {profile.manajemen_role === 'SARPRAS' && 'Wakil Kepala Sekolah Bidang Sarana & Prasarana'}
                    {profile.manajemen_role === 'HUMAS' && 'Wakil Kepala Sekolah Bidang Humas & Hubungan Industri'}
                  </h4>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Jabatan: <strong>Waka {profile.manajemen_role.charAt(0) + profile.manajemen_role.slice(1).toLowerCase()}</strong>
                  </p>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 11, lineHeight: '1.4' }}>
                    Mengelola program kerja sekolah, mengawasi kedisiplinan dan presensi masal, serta memfasilitasi pengambilan keputusan strategis sesuai bidang.
                  </p>
                  <button 
                    onClick={() => router.push('/admin/presensi')}
                    className="btn-primary"
                    style={{ padding: '8px 14px', fontSize: 12, marginTop: 10, width: 'fit-content', fontWeight: 'bold', background: 'linear-gradient(135deg, var(--primary-color) 0%, rgba(59, 130, 246, 0.8) 100%)', border: 'none' }}
                  >
                    Generate Presensi
                  </button>
                </div>
              </div>
            )}

            {/* Kepala Sekolah Card */}
            {profile.is_kepsek && (
              <div className="glass-panel" style={{ display: 'flex', gap: 15, alignItems: 'flex-start', background: 'rgba(255,255,255,0.01)', borderLeft: '4px solid #f97316' }}>
                <div style={{ padding: 8, borderRadius: 8, background: 'rgba(249,115,22,0.1)', color: '#f97316' }}>
                  <ShieldCheck size={24} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                  <span className="badge badge-warning" style={{ fontSize: 9, alignSelf: 'flex-start', background: '#f97316', color: 'white' }}>PIMPINAN SEKOLAH</span>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: 'var(--text-light)' }}>
                    Kepala Sekolah SMAN 2 Bandung
                  </h4>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                    Wewenang: <strong>Pemantauan Seluruh Presensi & Kegiatan Sekolah</strong>
                  </p>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 11, lineHeight: '1.4' }}>
                    Sebagai Kepala Sekolah, Anda memiliki wewenang penuh untuk memantau kehadiran guru/siswa, menandatangani laporan presensi, serta melakukan generate presensi sewaktu-waktu.
                  </p>
                  <button 
                    onClick={() => router.push('/admin/presensi')}
                    className="btn-primary"
                    style={{ padding: '8px 14px', fontSize: 12, marginTop: 10, width: 'fit-content', fontWeight: 'bold', background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', border: 'none' }}
                  >
                    Generate Presensi
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!profile.is_walikelas && myEkskuls.length === 0 && myAssignments.length === 0 && myExams.length === 0 && !(profile.is_manajemen && profile.is_waka) && !profile.is_kepsek && (
              <div className="glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <Award size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: 13 }}>Anda tidak memiliki tugas tambahan khusus saat ini. Tugas mengajar KBM kelas berjalan normal.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: LAPORAN PRESENSI */}
      {guruActiveTab === 'laporan' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Filters card */}
          <div className="glass-panel">
            <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>Rekap Absensi Mengajar</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 15 }}>
              <div className="form-group">
                <label style={{ fontSize: 12 }}>Kelas Sasaran</label>
                <select 
                  className="form-input"
                  value={rekapFilters.class_name}
                  onChange={e => setRekapFilters({...rekapFilters, class_name: e.target.value})}
                  style={{ fontSize: 12, height: 36 }}
                >
                  <option value="">-- Pilih Kelas --</option>
                  {allClasses.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: 12 }}>Mata Pelajaran (Opsional)</label>
                <select 
                  className="form-input"
                  value={rekapFilters.subject_id}
                  onChange={e => setRekapFilters({...rekapFilters, subject_id: e.target.value})}
                  style={{ fontSize: 12, height: 36 }}
                >
                  <option value="">-- Semua Mapel --</option>
                  {allSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: 12 }}>Tanggal Mulai</label>
                <input 
                  type="date" 
                  className="form-input"
                  value={rekapFilters.startDate}
                  onChange={e => setRekapFilters({...rekapFilters, startDate: e.target.value})}
                  style={{ fontSize: 12, height: 36 }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: 12 }}>Tanggal Akhir</label>
                <input 
                  type="date" 
                  className="form-input"
                  value={rekapFilters.endDate}
                  onChange={e => setRekapFilters({...rekapFilters, endDate: e.target.value})}
                  style={{ fontSize: 12, height: 36 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button 
                onClick={handleGenerateRekap}
                className="btn-primary flex items-center gap-2"
                style={{ padding: '8px 16px', fontSize: 13 }}
                disabled={isLoadingRekap}
              >
                {isLoadingRekap ? <RefreshCw className="animate-spin" size={16} /> : <Activity size={16} />}
                Tampilkan Rekapitulasi
              </button>
              
              {rekapData.length > 0 && (
                <button 
                  onClick={handleExportRekapExcel}
                  className="btn-secondary flex items-center gap-2"
                  style={{ padding: '8px 16px', fontSize: 13, background: 'transparent', border: '1px solid var(--surface-border)' }}
                >
                  <FileSpreadsheet size={16} /> Unduh Excel (.xlsx)
                </button>
              )}
            </div>
          </div>

          {/* Matrix table display */}
          {rekapData.length > 0 ? (
            <div className="glass-panel">
              <h3 style={{ fontSize: 15, margin: '0 0 12px' }}>Matriks Kehadiran Siswa Kelas {rekapFilters.class_name}</h3>
              <div className="data-table-container" style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: 150 }}>Nama Lengkap Siswa</th>
                      {rekapDates.map((d, idx) => (
                        <th key={idx} style={{ textAlign: 'center', fontSize: 10 }} title={d.fullName}>
                          {d.label}
                        </th>
                      ))}
                      <th style={{ textAlign: 'center', width: 40 }}>H</th>
                      <th style={{ textAlign: 'center', width: 40 }}>T</th>
                      <th style={{ textAlign: 'center', width: 40 }}>S</th>
                      <th style={{ textAlign: 'center', width: 40 }}>I</th>
                      <th style={{ textAlign: 'center', width: 40 }}>A</th>
                      <th style={{ textAlign: 'center', width: 40 }}>D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapData.map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 'bold', color: 'var(--text-light)', fontSize: 12 }}>{row.name}</td>
                        {rekapDates.map((d, idx) => {
                          const val = row[d.sessionId];
                          let color = 'inherit';
                          if (val === 'HADIR') color = '#34d399';
                          if (val === 'TERLAMBAT') color = '#f59e0b';
                          if (val === 'SAKIT') color = '#60a5fa';
                          if (val === 'IZIN') color = '#a78bfa';
                          if (val === 'ALPA') color = '#f87171';
                          if (val === 'DISPEN') color = '#fb7185';
                          
                          return (
                            <td key={idx} style={{ textAlign: 'center', fontWeight: 'bold', color, fontSize: 11 }}>
                              {val === 'HADIR' ? 'H' : 
                               val === 'TERLAMBAT' ? 'T' :
                               val === 'SAKIT' ? 'S' :
                               val === 'IZIN' ? 'I' :
                               val === 'ALPA' ? 'A' :
                               val === 'DISPEN' ? 'D' : '-'}
                            </td>
                          );
                        })}
                        <td style={{ textAlign: 'center', fontSize: 11, fontWeight: 'bold', color: '#34d399' }}>{row.H}</td>
                        <td style={{ textAlign: 'center', fontSize: 11, fontWeight: 'bold', color: '#f59e0b' }}>{row.T}</td>
                        <td style={{ textAlign: 'center', fontSize: 11, fontWeight: 'bold', color: '#60a5fa' }}>{row.S}</td>
                        <td style={{ textAlign: 'center', fontSize: 11, fontWeight: 'bold', color: '#a78bfa' }}>{row.I}</td>
                        <td style={{ textAlign: 'center', fontSize: 11, fontWeight: 'bold', color: '#f87171' }}>{row.A}</td>
                        <td style={{ textAlign: 'center', fontSize: 11, fontWeight: 'bold', color: '#fb7185' }}>{row.D}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: 15, marginTop: 15, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
                <span>Keterangan Matriks:</span>
                <span><strong style={{color:'#34d399'}}>H</strong>: Hadir</span>
                <span><strong style={{color:'#f59e0b'}}>T</strong>: Terlambat</span>
                <span><strong style={{color:'#60a5fa'}}>S</strong>: Sakit</span>
                <span><strong style={{color:'#a78bfa'}}>I</strong>: Izin</span>
                <span><strong style={{color:'#f87171'}}>A</strong>: Alpa</span>
                <span><strong style={{color:'#fb7185'}}>D</strong>: Dispensasi</span>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <FileSpreadsheet size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: 13 }}>Silakan pilih filter kelas dan klik tombol "Tampilkan Rekapitulasi" untuk memuat rekap presensi.</p>
            </div>
          )}

          {/* History of sessions */}
          <div className="glass-panel">
            <h3 style={{ fontSize: 16, margin: '0 0 12px' }}>Riwayat Sesi Presensi QR Anda</h3>
            {isLoadingHistory ? (
              <div className="text-center py-10">Memuat riwayat...</div>
            ) : sessionsHistory.length === 0 ? (
              <div className="text-center py-10 text-muted" style={{ fontStyle: 'italic', fontSize: 13 }}>
                Anda belum pernah mengaktifkan sesi presensi QR.
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nama Sesi / Kegiatan</th>
                      <th>Sasaran</th>
                      <th>Token QR</th>
                      <th>Waktu Mulai</th>
                      <th>Status Sesi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionsHistory.map((s) => {
                      const now = new Date();
                      const start = new Date(s.start_time);
                      const end = new Date(s.end_time);
                      const isActive = now >= start && now <= end;
                      
                      return (
                        <tr key={s.id}>
                          <td>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-light)' }}>
                              {getSessionTypeLabel(s.session_type, s.title)}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>ID Sesi: {s.id.substring(0, 8)}...</div>
                          </td>
                          <td><strong style={{ color: 'var(--primary-color)' }}>{s.target_class}</strong></td>
                          <td><code style={{ fontSize: 12 }}>{s.qr_token}</code></td>
                          <td style={{ fontSize: 12 }}>{new Date(s.start_time).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB</td>
                          <td>
                            {isActive ? (
                              <span className="badge badge-success">BERJALAN</span>
                            ) : (
                              <span className="badge badge-danger" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>SELESAI</span>
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
      )}

      {/* TAB CONTENT 3: PROFIL SAYA */}
      {guruActiveTab === 'profil' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          
          {/* Card Left: Avatar Update */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', height: 'fit-content' }}>
            <h3 style={{ fontSize: 16, margin: 0, width: '100%', textAlign: 'left' }}>Foto Profil</h3>
            
            <div style={{
              position: 'relative', width: 120, height: 120, borderRadius: 'var(--radius-lg)', 
              background: 'var(--surface-dark)', border: '2px solid var(--banner-border)',
              boxShadow: 'var(--shadow-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {tempAvatarPreview ? (
                <img src={tempAvatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={60} className="text-primary" />
              )}
              {isSavingAvatar && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw className="animate-spin text-white" size={24} />
                </div>
              )}
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tempAvatarPreview ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    type="button"
                    onClick={() => { setTempAvatarFile(null); setTempAvatarPreview(null); }}
                    className="btn-secondary"
                    style={{ flex: 1, padding: 8, fontSize: 12 }}
                    disabled={isSavingAvatar}
                  >
                    Batal
                  </button>
                  <button 
                    type="button"
                    onClick={handleUploadAvatar}
                    className="btn-primary"
                    style={{ flex: 1, padding: 8, fontSize: 12, background: 'var(--primary-color)' }}
                    disabled={isSavingAvatar}
                  >
                    Simpan Foto
                  </button>
                </div>
              ) : (
                <>
                  <label 
                    htmlFor="avatar-file-upload" 
                    className="btn-secondary w-full" 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8, cursor: 'pointer', fontSize: 12, margin: 0 }}
                  >
                    <Plus size={16} /> Ganti Foto Profil
                  </label>
                  <input 
                    type="file" 
                    id="avatar-file-upload" 
                    accept="image/*" 
                    onChange={handleAvatarChange} 
                    style={{ display: 'none' }}
                    disabled={isSavingAvatar}
                  />
                </>
              )}
              <p className="text-muted" style={{ fontSize: 10, margin: '6px 10px 0' }}>
                Foto akan dikompresi sebelum diunggah ke server penyimpanan.
              </p>
            </div>
          </div>

          {/* Card Right: Profile Info Form */}
          <div className="glass-panel">
            <h3 style={{ fontSize: 16, margin: '0 0 15px' }}>Detail Identitas Pendidik</h3>
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              
              <div className="form-group">
                <label style={{ fontSize: 12 }}>Nama Lengkap & Gelar</label>
                <input 
                  type="text" 
                  className="form-input"
                  required
                  value={profileForm.full_name}
                  onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                  style={{ fontSize: 13 }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: 12 }}>NIP (Nomor Induk Pegawai)</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="cth: 1982..."
                  value={profileForm.nip}
                  onChange={e => setProfileForm({...profileForm, nip: e.target.value})}
                  style={{ fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: 12 }}>NUPTK (Opsional)</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="cth: 8847..."
                  value={profileForm.nuptk}
                  onChange={e => setProfileForm({...profileForm, nuptk: e.target.value})}
                  style={{ fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Jenis Kelamin</label>
                  <select 
                    className="form-input"
                    value={profileForm.gender}
                    onChange={e => setProfileForm({...profileForm, gender: e.target.value})}
                    style={{ fontSize: 13, height: 38, width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Status Kepegawaian</label>
                  <select 
                    className="form-input"
                    value={profileForm.employment_status}
                    onChange={e => setProfileForm({...profileForm, employment_status: e.target.value})}
                    style={{ fontSize: 13, height: 38, width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="PNS">PNS</option>
                    <option value="PPPK">PPPK</option>
                    <option value="HONORER">Honorer</option>
                    <option value="GTT">Guru Tidak Tetap</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: 12 }}>Tanggal Lahir</label>
                <input 
                  type="date" 
                  className="form-input"
                  value={profileForm.birth_date}
                  onChange={e => setProfileForm({...profileForm, birth_date: e.target.value})}
                  style={{ fontSize: 13 }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: 12 }}>No. WhatsApp / HP</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="cth: 0812..."
                  value={profileForm.phone}
                  onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                  style={{ fontSize: 13 }}
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, marginTop: 5 }}
                disabled={isSavingProfile}
              >
                <Sparkles size={16} /> {isSavingProfile ? 'Menyimpan...' : 'Simpan Profil Pendidik'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: KELAS BINAAN (WALIKELAS ONLY) */}
      {guruActiveTab === 'kelas_binaan' && profile.is_walikelas && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Quick Header */}
          <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15, background: 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, rgba(255,255,255,0.02) 100%)' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-light)' }}>
                Wali Kelas: Kelas Bimbingan {profile.kelas_binaan}
              </h3>
              <p className="text-muted" style={{ margin: 0, fontSize: 12, marginTop: 4 }}>
                Pantau seluruh rekap kehadiran siswa dan tindak lanjut laporan pelanggaran tata tertib binaan Anda secara langsung.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button 
                onClick={() => router.push('/admin/activities')}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: 13, background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                Persetujuan Aktivitas Binaan
              </button>

              <button 
                onClick={() => router.push('/admin/reports')}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: 13, background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                Laporan & Rapor Kelas
              </button>

              {wlAttendanceMatrix.length > 0 && (
                <button 
                  onClick={handleExportWlExcel}
                  className="btn-primary flex items-center gap-2"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  <FileSpreadsheet size={16} /> Unduh Rekap Kehadiran Binaan (.xlsx)
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, alignItems: 'start' }}>
            
            {/* Left side: KBM Attendance recap */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ fontSize: 15, margin: 0 }}>Akumulasi Kehadiran Siswa Binaan KBM</h3>
              {isLoadingWl ? (
                <div className="text-center py-10 text-muted">Memuat data kelas binaan...</div>
              ) : wlAttendanceMatrix.length === 0 ? (
                <div className="text-center py-10 text-muted" style={{ fontStyle: 'italic' }}>
                  Tidak ada data siswa ditemukan di kelas {profile.kelas_binaan}.
                </div>
              ) : (
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Nama Siswa</th>
                        <th style={{ textAlign: 'center', width: 50 }}>Hadir</th>
                        <th style={{ textAlign: 'center', width: 50 }}>Terlambat</th>
                        <th style={{ textAlign: 'center', width: 50 }}>Sakit</th>
                        <th style={{ textAlign: 'center', width: 50 }}>Izin</th>
                        <th style={{ textAlign: 'center', width: 50 }}>Alpa</th>
                        <th style={{ textAlign: 'center', width: 50 }}>Dispen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wlAttendanceMatrix.map(row => (
                        <tr key={row.id}>
                          <td style={{ fontWeight: 'bold', color: 'var(--text-light)', fontSize: 12 }}>{row.name}</td>
                          <td style={{ textAlign: 'center', color: '#34d399', fontWeight: 'bold', fontSize: 12 }}>{row.H}</td>
                          <td style={{ textAlign: 'center', color: '#f59e0b', fontWeight: 'bold', fontSize: 12 }}>{row.T}</td>
                          <td style={{ textAlign: 'center', color: '#60a5fa', fontWeight: 'bold', fontSize: 12 }}>{row.S}</td>
                          <td style={{ textAlign: 'center', color: '#a78bfa', fontWeight: 'bold', fontSize: 12 }}>{row.I}</td>
                          <td style={{ textAlign: 'center', color: '#f87171', fontWeight: 'bold', fontSize: 12 }}>{row.A}</td>
                          <td style={{ textAlign: 'center', color: '#fb7185', fontWeight: 'bold', fontSize: 12 }}>{row.D}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right side: Alerts and logs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Approved Violations Notification */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12, borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                <h4 style={{ fontSize: 14, margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#f87171' }}>
                  <ShieldAlert size={18} /> Laporan Pelanggaran Final (Disetujui)
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto' }}>
                  {wlNotifications.length === 0 ? (
                    <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 11, margin: 0, textAlign: 'center', padding: '15px 0' }}>
                      Tidak ada laporan pelanggaran terbaru yang disetujui.
                    </p>
                  ) : (
                    wlNotifications.map(notif => (
                      <div 
                        key={notif.id} 
                        style={{
                          padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.03)', 
                          border: '1px solid rgba(239,68,68,0.1)', fontSize: 11
                        }}
                      >
                        <div style={{ fontWeight: 'bold', color: 'var(--text-light)', marginBottom: 2 }}>{notif.student?.full_name}</div>
                        <div style={{ color: '#f87171', fontWeight: 'bold' }}>
                          {notif.rule?.name} (-{notif.rule?.default_point} Poin)
                        </div>
                        <div className="text-muted" style={{ marginTop: 4, fontStyle: 'italic' }}>
                          "{notif.description}"
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                          <span>Oleh: {notif.teacher?.full_name || 'Guru'}</span>
                          <span>{new Date(notif.event_date).toLocaleDateString('id-ID')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Log all activities of class */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ fontSize: 14, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={18} className="text-primary" /> Log Aktivitas Kelas Binaan
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                  {wlActivities.length === 0 ? (
                    <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 11, margin: 0, textAlign: 'center', padding: '15px 0' }}>
                      Belum ada catatan aktivitas siswa.
                    </p>
                  ) : (
                    wlActivities.map(act => {
                      let statusBadge = null;
                      if (act.status === 'PENDING') statusBadge = <span className="badge badge-warning" style={{ fontSize: 9, padding: '2px 6px' }}>PENDING</span>;
                      if (act.status === 'APPROVED') statusBadge = <span className="badge badge-success" style={{ fontSize: 9, padding: '2px 6px' }}>APPROVED</span>;
                      if (act.status === 'REJECTED') statusBadge = <span className="badge badge-danger" style={{ fontSize: 9, padding: '2px 6px' }}>DITOLAK</span>;

                      return (
                        <div 
                          key={act.id} 
                          style={{
                            padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.01)', 
                            border: '1px solid var(--surface-border)', fontSize: 11
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <strong style={{ color: 'var(--text-light)' }}>{act.student?.full_name}</strong>
                            {statusBadge}
                          </div>
                          <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{act.rule?.name}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                            {new Date(act.event_date).toLocaleDateString('id-ID')}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Notification Modal for Teacher */}
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
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', color: 'var(--text-light)' }}>Notifikasi Pendidik</h3>
              <button 
                onClick={() => setShowNotif(false)}
                style={{ background: 'transparent', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '20px' }}>
              {bellNotifications.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
                  <Bell size={32} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <p style={{ fontSize: 13 }}>Tidak ada notifikasi baru saat ini.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {bellNotifications.map((notif) => (
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
                        {notif.success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
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

      {/* Flyer Overlay Modal */}
      {selectedFlyer && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(10px)',
          zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div style={{
            background: 'var(--surface-dark)', border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 650,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid var(--surface-border)'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold', color: 'var(--text-light)' }}>Flyer Pengumuman</h3>
              <button 
                onClick={() => setSelectedFlyer(null)}
                style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#000', maxHeight: '70vh', overflow: 'auto' }}>
              <img 
                src={selectedFlyer} 
                alt="Flyer Pengumuman" 
                style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 8 }} 
              />
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

      {/* Hallo BK Modal */}
      {showBKModal && (
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
              Layanan konsultasi online bimbingan konseling ("Hallo BK") SMAN 2 Bandung saat ini sedang dipersiapkan dan masih dalam tahap pengembangan ke depan.
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

      {/* Chatbot Window */}
      {showChatbot && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, width: 330, height: 420,
          background: 'var(--surface-dark)', border: '1px solid var(--surface-border)',
          borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 2000,
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          <div style={{
            background: 'var(--banner-bg)', borderBottom: '1px solid var(--banner-border)',
            padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <span style={{fontWeight: 'bold', color: 'white', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6}}>
              <MessageSquare size={16} /> Chatbot Asisten SMANDA
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
    </div>
  );
}
