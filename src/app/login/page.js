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
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email atau Password salah!");
      setLoading(false);
      return;
    }

    // Explicitly push to /admin upon successful login
    router.replace('/admin');
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
      <div className="glass-panel animate-fade-in" style={{
        maxWidth: 450, 
        width: '100%',
        padding: '40px 30px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        
        <div style={{textAlign: 'center', marginBottom: 30}}>
          <div style={{
            width: 90, height: 90, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
             <img 
               src="/logo.png" 
               alt="Logo SMANDA" 
               style={{width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))'}}
             />
          </div>
          <h1 style={{fontSize: 24, fontWeight: 'bold', margin: '0 0 8px 0', letterSpacing: 1}}>SMANDA</h1>
          <p className="text-muted" style={{fontSize: 14, letterSpacing: 2}}>SMART REPORT ADMIN</p>
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

        <form onSubmit={handleLogin}>
          <div style={{marginBottom: 20}}>
            <label style={{display: 'block', marginBottom: 8, fontSize: 14, color: 'var(--text-muted)'}}>Email Akademik</label>
            <div className="form-input" style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <Mail size={18} color="var(--text-muted)" style={{flexShrink: 0}} />
              <input 
                type="email" 
                placeholder="guru@sman2bandung.sch.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none'}}
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
                style={{background: 'transparent', border: 'none', color: 'white', width: '100%', outline: 'none'}}
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

        <p style={{textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)'}}>
          Sistem Informasi Kesiswaan Terpadu &copy; 2026
        </p>

      </div>
    </div>
  );
}
