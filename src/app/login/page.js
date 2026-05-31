"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleLogin = async (e) => {
    console.log("Login: handleLogin triggered");
    if (e) {
      e.preventDefault();
      console.log("Login: preventDefault called");
    }
    setLoading(true);
    setError(null);

    let loginEmail = email.trim();
    if (!loginEmail.includes('@')) {
      loginEmail = `${loginEmail}@lensa.smanda.id`;
    }

    console.log("Login: Attempting sign in for:", loginEmail);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      console.log("Login: signInWithPassword result:", { user: data?.user?.id, error: authError });

      if (authError) {
        console.warn("Login: authError returned:", authError);
        setError("Email atau Password salah!");
        setLoading(false);
        return;
      }

      if (!data?.user) {
        console.warn("Login: user data is empty");
        setError("Gagal mendapatkan data pengguna.");
        setLoading(false);
        return;
      }

      console.log("Login: Fetching profile role for user:", data.user.id);
      const { data: userData, error: profileError } = await supabase
        .from('sr_profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      console.log("Login: profile query result:", { userData, profileError });

      if (profileError || !userData) {
        console.error("Login: profileError or no userData:", profileError);
        setError("Profil tidak ditemukan di database.");
        setLoading(false);
        return;
      }

      console.log("Login: successful. Role is:", userData.role);
      if (userData.role === 'SISWA') {
        router.replace('/siswa');
      } else if (userData.role === 'ORANG_TUA') {
        router.replace('/orangtua');
      } else {
        router.replace('/admin');
      }
    } catch (err) {
      console.error("Login: unexpected exception caught:", err);
      setError(`Koneksi gagal: ${err.message || err}`);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--background)',
      padding: 20
    }}>
      <div className="glass-panel animate-fade-in login-card" style={{
        maxWidth: 450, 
        width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        
        <div style={{textAlign: 'center', marginBottom: 30}}>
          <div style={{
            width: 120, height: 120, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
             <img 
               src="/logo.png" 
               alt="Logo SMANDA" 
               style={{width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))'}}
             />
          </div>
          <h1 style={{fontSize: 24, fontWeight: 'bold', margin: '0 0 8px 0', letterSpacing: 1}}>LENSA - SMANDA</h1>
          <p className="text-muted" style={{
            fontSize: '10px',
            letterSpacing: '0.2px',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            margin: '0 auto'
          }}>
            Log of Educational Network, Students & Attendance
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171', padding: '12px 16px', borderRadius: 8, marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 14
          }}>
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} action="javascript:void(0);">
          <div style={{marginBottom: 20}}>
            <label style={{display: 'block', marginBottom: 8, fontSize: 14, color: 'var(--text-muted)'}}>NIP / NISN / Email Akademik</label>
            <div className="form-input" style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <Mail size={18} color="var(--text-muted)" style={{flexShrink: 0}} />
              <input 
                type="text" 
                placeholder="Contoh: 1982... atau 00712..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{background: 'transparent', border: 'none', color: 'var(--text-light)', width: '100%', outline: 'none'}}
              />
            </div>
          </div>

          <div style={{marginBottom: 30}}>
            <label style={{display: 'block', marginBottom: 8, fontSize: 14, color: 'var(--text-muted)'}}>Kata Sandi</label>
            <div className="form-input" style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <Lock size={18} color="var(--text-muted)" style={{flexShrink: 0}} />
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{background: 'transparent', border: 'none', color: 'var(--text-light)', width: '100%', outline: 'none'}}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{width: '100%', padding: 14, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontSize: 16}}
            disabled={loading}
          >
            {loading ? 'Mengautentikasi...' : <><LogIn size={20} /> Masuk ke Dashboard</>}
          </button>
        </form>

        <p style={{textAlign: 'center', marginTop: 24, fontSize: 11, color: 'var(--text-muted)'}}>
          Sistem Informasi SMAN 2 Bandung &copy; 2026 devbyIT-Team
        </p>

      </div>
    </div>
  );
}
