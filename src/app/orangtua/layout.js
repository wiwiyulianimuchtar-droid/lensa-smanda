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
        background: 'rgba(15, 23, 42, 0.4)',
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
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 500,
          height: 70,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid var(--surface-border)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 100,
          padding: '0 10px'
        }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
                  fontSize: 11,
                  fontWeight: isActive ? '600' : '400',
                  textDecoration: 'none',
                  flex: 1,
                  padding: '8px 0',
                  transition: 'color var(--transition-speed)'
                }}
              >
                <Icon size={20} style={{ color: isActive ? 'var(--primary-color)' : 'var(--text-muted)' }} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

      </div>
    </div>
  );
}
