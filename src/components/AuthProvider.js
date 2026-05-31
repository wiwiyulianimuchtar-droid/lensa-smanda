"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    setTimeout(() => {
      if (mounted) setIsClient(true);
    }, 0);

    // Safety fallback: force hide loading screen after 3 seconds if connections hang
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.warn("AuthProvider: Safety timeout triggered. Forcing loading to false.");
        setLoading(false);
      }
    }, 3000);

    const fetchProfile = async (userId) => {
      try {
        console.log("AuthProvider: fetching profile for:", userId);
        const { data, error } = await supabase
          .from('sr_profiles')
          .select('*')
          .eq('id', userId)
          .single();
          
        console.log("AuthProvider: profile result:", data, error);
        if (data) {
          let profileData = { ...data };
          if (data.role === 'GURU') {
            try {
              // Cek penugasan Wali Kelas via sr_classes terlebih dahulu
              const { data: classData, error: classError } = await supabase
                .from('sr_classes')
                .select('name')
                .eq('homeroom_teacher_id', userId)
                .maybeSingle();

              if (!classError && classData) {
                profileData.is_walikelas = true;
                profileData.kelas_binaan = classData.name;
              }

              // Dapatkan assignments dari tabel sr_teacher_assignments
              const { data: assData, error: assError } = await supabase
                .from('sr_teacher_assignments')
                .select('*, type:assignment_type_id (name)')
                .eq('teacher_id', userId);
              
              if (!assError && assData) {
                // Cek penugasan Piket
                const hasPiket = assData.some(item => item.type?.name?.toLowerCase().includes('piket'));
                profileData.is_piket = hasPiket;

                // Jika belum terdeteksi sebagai wali kelas via sr_classes, cek via sr_teacher_assignments
                if (!profileData.is_walikelas) {
                  const waliKelasAss = assData.find(item => item.type?.name === 'Guru Wali Kelas');
                  if (waliKelasAss) {
                    profileData.is_walikelas = true;
                    let className = waliKelasAss.details || '';
                    if (className.toLowerCase().startsWith('kelas ')) {
                      className = className.substring(6).trim();
                    }
                    profileData.kelas_binaan = className;
                  } else {
                    // Keep existing profile values if they were set in sr_profiles
                    if (data.is_walikelas || data.kelas_binaan) {
                      profileData.is_walikelas = true;
                    } else {
                      profileData.is_walikelas = false;
                      profileData.kelas_binaan = null;
                    }
                  }
                }
              }
            } catch (assErr) {
              console.error("Gagal mendapatkan tugas tambahan secara dinamis:", assErr);
            }
          }
          setProfile(profileData);
          
          // Role-based route protection
          if (profileData.role === 'SISWA') {
            if (pathname?.startsWith('/admin') || pathname?.startsWith('/orangtua') || pathname === '/') {
              console.log("AuthProvider: redirecting SISWA to /siswa");
              router.replace('/siswa');
            }
          } else if (data.role === 'ORANG_TUA') {
            if (pathname?.startsWith('/admin') || pathname?.startsWith('/siswa') || pathname === '/') {
              console.log("AuthProvider: redirecting ORANG_TUA to /orangtua");
              router.replace('/orangtua');
            }
          } else if (data.role === 'GURU' || data.role === 'ADMIN') {
            if (pathname?.startsWith('/siswa') || pathname?.startsWith('/orangtua') || pathname === '/') {
              console.log("AuthProvider: redirecting ADMIN/GURU to /admin");
              router.replace('/admin');
            }
          }
        } else {
          console.warn("AuthProvider: Profile not found.");
        }
      } catch (err) {
        console.error("AuthProvider: error in fetchProfile:", err);
      }
    };

    const checkSession = async () => {
      try {
        console.log("AuthProvider: checking session...");
        const { data: { session } } = await supabase.auth.getSession();
        console.log("AuthProvider: session data:", session);
        
        if (session) {
          if (mounted) setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          console.log("AuthProvider: no active session found.");
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
          if (pathname && !pathname.includes('/login') && mounted) {
            console.log("AuthProvider: redirecting to /login");
            router.replace('/login');
          }
        }
      } catch (err) {
        console.error("AuthProvider: session check error:", err);
      } finally {
        if (mounted) {
          clearTimeout(safetyTimeout);
          console.log("AuthProvider: setting loading to false");
          setLoading(false);
        }
      }
    };

    checkSession();

    let subscription = null;
    try {
      const res = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log("AuthProvider: auth state changed:", event, session);
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
              console.log("AuthProvider: redirecting to /login from state change");
              router.replace('/login');
            }
          }
        }
      );
      if (res && res.data) {
        subscription = res.data.subscription;
      }
    } catch (e) {
      console.error("AuthProvider: onAuthStateChange registration error:", e);
    }

    return () => {
      mounted = false;
      if (subscription) {
        console.log("AuthProvider: unsubscribing auth state listener");
        subscription.unsubscribe();
      }
    };
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {(isClient && loading) && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.95)'
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
