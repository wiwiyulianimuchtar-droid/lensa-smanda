"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, User, MapPin, Award, LogOut, FileText, BookOpen, GraduationCap, Archive, Megaphone, Settings, QrCode, Sun, Moon, X, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';

import { useAuth } from '@/components/AuthProvider';
import { useTheme } from '@/components/ThemeProvider';

export default function Sidebar({ role = 'ADMIN', isOpen = false, onClose = () => {} }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [hasExamAssignment, setHasExamAssignment] = useState(false);

  // Gunakan profile asli dari AuthProvider, jika null beri fallback kosong
  const currentUser = profile || {
    role: '',
    is_piket: false,
    is_walikelas: false,
    is_manajemen: false,
  };

  useEffect(() => {
    async function checkExamAssignment() {
      if (currentUser.role === 'GURU' && currentUser.id) {
        try {
          const res = await fetch('/api/exams?type=teachers');
          if (res.ok) {
            const data = await res.json();
            const hasAss = data.some(item => item.teacher_id === currentUser.id);
            setHasExamAssignment(hasAss);
          }
        } catch (err) {
          console.error("Gagal memeriksa tugas pengawas:", err);
        }
      }
    }
    checkExamAssignment();
  }, [currentUser]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const links = [];
  const addLink = (link) => {
    if (!links.some(l => l.href === link.href)) {
      links.push(link);
    }
  };

  // 1. Dashboard (Semua)
  addLink({ name: 'Dashboard', href: '/admin', icon: Home });

  // 2. Menu Presensi QR (Berdasarkan Hak Akses Waka / Admin / Kepsek / Piket / Pengawas Ujian)
  if (currentUser.role === 'ADMIN') {
    addLink({ name: 'Generate Presensi', href: '/admin/presensi', icon: QrCode });
  } else if (currentUser.is_kepsek) {
    addLink({ name: 'Monitor Presensi', href: '/admin/presensi', icon: QrCode });
  } else if (
    (currentUser.role === 'GURU' && currentUser.is_manajemen && currentUser.is_waka) ||
    currentUser.is_piket ||
    hasExamAssignment
  ) {
    addLink({ name: 'Generate Presensi', href: '/admin/presensi', icon: QrCode });
  }

  // 3. Jika Peran adalah GURU
  if (currentUser.role === 'GURU' && !currentUser.is_kepsek) {
    addLink({ name: 'Tugas Tambahan', href: '/admin?tab=tugas_tambahan', icon: Award });
    addLink({ name: 'Laporan Presensi', href: '/admin?tab=laporan', icon: FileSpreadsheet });
    addLink({ name: 'Profil Pendidik', href: '/admin/profile', icon: User });

    if (currentUser.is_walikelas) {
      addLink({ name: 'Kewalikelasan', href: '/admin?tab=kelas_binaan', icon: Users });
    }

    // Jika Manajemen (Waka/Staf), tampilkan menu sesuai dengan penugasan bidangnya
    if (currentUser.is_manajemen) {
      if (currentUser.manajemen_role === 'KURIKULUM') {
        addLink({ name: 'Kurikulum', href: '/admin/kurikulum', icon: BookOpen });
      } else if (currentUser.manajemen_role === 'KESISWAAN') {
        addLink({ name: 'Kesiswaan', href: '/admin/kesiswaan', icon: GraduationCap });
      } else if (currentUser.manajemen_role === 'SARPRAS') {
        addLink({ name: 'Sarana Prasarana', href: '/admin/sarpras', icon: Archive });
      } else if (currentUser.manajemen_role === 'HUMAS') {
        addLink({ name: 'Humas & Layanan', href: '/admin/humas', icon: Megaphone });
      }
    }
  }

  // 4. Jika Peran adalah ADMIN (Super Admin)
  if (currentUser.role === 'ADMIN') {
    addLink({ name: 'Kurikulum', href: '/admin/kurikulum', icon: BookOpen });
    addLink({ name: 'Kesiswaan', href: '/admin/kesiswaan', icon: GraduationCap });
    addLink({ name: 'Sarana Prasarana', href: '/admin/sarpras', icon: Archive });
    addLink({ name: 'Humas & Layanan', href: '/admin/humas', icon: Megaphone });
    addLink({ name: 'Pengaturan Sistem', href: '/admin/settings', icon: Settings });
    addLink({ name: 'Profil Saya', href: '/admin/profile', icon: User });
    if (currentUser.is_walikelas) {
      addLink({ name: 'Kewalikelasan', href: '/admin?tab=kelas_binaan', icon: Users });
    }
  }

  // 5. Jika Peran adalah Kepala Sekolah (Melihat semua bidang secara read-only)
  if (currentUser.is_kepsek) {
    addLink({ name: 'Kurikulum', href: '/admin/kurikulum', icon: BookOpen });
    addLink({ name: 'Kesiswaan', href: '/admin/kesiswaan', icon: GraduationCap });
    addLink({ name: 'Sarana Prasarana', href: '/admin/sarpras', icon: Archive });
    addLink({ name: 'Humas & Layanan', href: '/admin/humas', icon: Megaphone });
    addLink({ name: 'Laporan Presensi', href: '/admin?tab=laporan', icon: FileSpreadsheet });
    addLink({ name: 'Profil Pendidik', href: '/admin/profile', icon: User });
    if (currentUser.is_walikelas) {
      addLink({ name: 'Kewalikelasan', href: '/admin?tab=kelas_binaan', icon: Users });
    }
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Close Button for mobile drawer */}
      <button 
        onClick={onClose} 
        className="sidebar-close-btn"
        style={{
          position: 'absolute', top: 20, right: 20, 
          background: 'transparent', border: 'none', 
          color: 'var(--text-light)', cursor: 'pointer',
          zIndex: 10
        }}
      >
        <X size={24} />
      </button>

      <div className="sidebar-logo" style={{justifyContent: 'center', flexDirection: 'column', gap: 12, paddingBottom: 20, borderBottom: '1px solid var(--surface-border)'}}>
        <div style={{
          width: 90, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto'
        }}>
           <img 
             src="/logo.png" 
             alt="Logo SMANDA" 
             style={{width: '100%', height: '100%', objectFit: 'contain'}}
             onError={(e) => {
               e.target.style.display = 'none';
               e.target.parentElement.innerHTML = '<span style="color:white; font-weight:bold; font-size:24px;">S2</span>';
             }}
           />
        </div>
        <div style={{textAlign: 'center'}}>
          <div style={{fontWeight: '800', letterSpacing: 1, fontSize: 13, color: 'var(--text-light)'}}>LENSA - SMANDA</div>
          <div style={{fontSize: 8, color: 'var(--primary-color)', fontWeight: '600', letterSpacing: 0.5, marginTop: 4, opacity: 0.8}}>
            Log of Educational Network, Students & Attendance
          </div>
        </div>
      </div>
      
      <nav className="nav-links" style={{marginTop: 20}}>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.href} 
              href={link.href}
              onClick={onClose}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>
 
      <div style={{marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--surface-border)'}}>
        <button 
          onClick={toggleTheme} 
          className="nav-link w-full" 
          style={{background: 'transparent', textAlign: 'left', color: 'var(--text-light)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12}}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          <span>{isDarkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
        </button>
        <button 
          onClick={() => { handleLogout(); onClose(); }} 
          className="btn-danger w-full" 
          style={{ 
            border: 'none', 
            marginTop: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 12,
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
