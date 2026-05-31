"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Calendar, ClipboardList, User } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function ParentLayout({ children }) {
  const pathname = usePathname();
  const { profile, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        minHeight: '100vh', background: 'var(--background-dark)', color: 'var(--primary-color)'
      }}>
        <div style={{fontSize: 18, fontWeight: 'bold'}}>Memuat Portal Orang Tua...</div>
      </div>
    );
  }

  if (profile && profile.role !== 'ORANG_TUA') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
        minHeight: '100vh', background: 'var(--background-dark)', padding: 20, textAlign: 'center'
      }}>
        <h2 style={{color: 'var(--danger-color)', marginBottom: 12}}>Akses Ditolak</h2>
        <p style={{color: 'var(--text-muted)', marginBottom: 20}}>Portal ini khusus untuk Wali / Orang Tua Siswa.</p>
        <button onClick={() => router.replace('/login')} className="btn-primary">Kembali ke Login</button>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', href: '/orangtua', icon: Home },
    { name: 'Kehadiran', href: '/orangtua/attendance', icon: Calendar },
    { name: 'Perizinan', href: '/orangtua/perizinan', icon: ClipboardList },
    { name: 'Profil', href: '/orangtua/profile', icon: User }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--background-dark)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingBottom: 80 // Space for the bottom navbar
    }}>
      {/* Mobile App Shell */}
      <div style={{
        width: '100%',
        maxWidth: 500,
        minHeight: '100vh',
        background: 'var(--shell-bg)',
        borderLeft: '1px solid var(--surface-border)',
        borderRight: '1px solid var(--surface-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        
        {/* Main Content Area */}
        <main style={{ flexGrow: 1, padding: '20px 20px 40px 20px' }}>
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="mobile-navbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

      </div>
    </div>
  );
}
