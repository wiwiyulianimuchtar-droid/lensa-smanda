"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, MapPin, Award, LogOut, FileText, BookOpen, GraduationCap, Archive, Megaphone, Settings, QrCode } from 'lucide-react';
import { supabase } from '@/lib/supabase';

import { useAuth } from '@/components/AuthProvider';

export default function Sidebar({ role = 'ADMIN' }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Gunakan profile asli dari AuthProvider, jika null beri fallback kosong
  const currentUser = profile || {
    role: '',
    is_piket: false,
    is_walikelas: false,
    is_manajemen: false,
  };

  const links = [];

  // 1. Dashboard (Semua)
  links.push({ name: 'Dashboard', href: '/admin', icon: Home });

  // 2. Modul Domain Utama (Bisa disesuaikan aksesnya nanti, saat ini dikunci untuk Admin & Manajemen terkait)
  if (currentUser.role === 'ADMIN' || currentUser.is_manajemen) {
    links.push({ name: 'Kurikulum', href: '/admin/kurikulum', icon: BookOpen });
    links.push({ name: 'Kesiswaan', href: '/admin/kesiswaan', icon: GraduationCap });
    links.push({ name: 'Sarana Prasarana', href: '/admin/sarpras', icon: Archive });
    links.push({ name: 'Humas & Layanan', href: '/admin/humas', icon: Megaphone });
  }

  // 3. Presensi & Piket (Admin atau Guru Piket)
  if (currentUser.role === 'ADMIN' || currentUser.is_piket) {
    links.push({ name: 'Presensi Pagi (Piket)', href: '/admin/piket', icon: MapPin });
  }

  // 3.5. Sesi Presensi QR (Admin atau Guru)
  if (currentUser.role === 'ADMIN' || currentUser.role === 'GURU') {
    links.push({ name: 'Sesi Presensi QR', href: '/admin/presensi', icon: QrCode });
  }

  // 4. Kelola Kelas / Kesiswaan (Admin atau Wali Kelas)
  if (currentUser.role === 'ADMIN' || currentUser.is_walikelas) {
    links.push({ name: 'Persetujuan Aktivitas', href: '/admin/activities', icon: Award });
  }

  // 5. Laporan & Rapor (Admin, Manajemen, Wali Kelas)
  if (currentUser.role === 'ADMIN' || currentUser.is_manajemen || currentUser.is_walikelas) {
    links.push({ name: 'Laporan & Rapor', href: '/admin/reports', icon: FileText });
  }

  // 6. Pengaturan Sistem (Super Admin Only)
  if (currentUser.role === 'ADMIN') {
    links.push({ name: 'Pengaturan Sistem', href: '/admin/settings', icon: Settings });
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{justifyContent: 'center', flexDirection: 'column', gap: 8, paddingBottom: 20, borderBottom: '1px solid var(--surface-border)'}}>
        <div style={{
          width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 5
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
          <div style={{fontWeight: '800', letterSpacing: 1}}>SMANDA</div>
          <div style={{fontSize: 10, color: 'var(--primary-color)', fontWeight: 'bold', letterSpacing: 2}}>SMART REPORT</div>
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
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--surface-border)'}}>
        <button onClick={handleLogout} className="nav-link w-full" style={{background: 'transparent', textAlign: 'left', color: 'var(--danger-color)'}}>
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
