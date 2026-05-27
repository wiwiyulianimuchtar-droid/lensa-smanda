"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          if (mounted) setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
          if (pathname && !pathname.includes('/login') && mounted) {
            router.replace('/login');
          }
        }
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') return;
        
        if (session) {
          if (mounted) setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
          if (pathname && !pathname.includes('/login') && mounted) {
            router.replace('/login');
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router]); // include pathname again, but router.replace prevents infinite history loops

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('sr_profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (data) {
      setProfile(data);
      // Role-based route protection
      if (data.role === 'SISWA') {
        if (pathname?.startsWith('/admin') || pathname?.startsWith('/orangtua') || pathname === '/login' || pathname === '/') {
          router.replace('/siswa');
        }
      } else if (data.role === 'ORANG_TUA') {
        if (pathname?.startsWith('/admin') || pathname?.startsWith('/siswa') || pathname === '/login' || pathname === '/') {
          router.replace('/orangtua');
        }
      } else if (data.role === 'GURU' || data.role === 'ADMIN') {
        if (pathname?.startsWith('/siswa') || pathname?.startsWith('/orangtua') || pathname === '/login' || pathname === '/') {
          router.replace('/admin');
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {loading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)'
        }}>
          <div style={{color: 'var(--primary-color)', fontSize: 18, fontWeight: 'bold'}}>Memuat Sistem...</div>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
