"use client";
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Mail, Shield, LogOut, Key, Check } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg("Konfirmasi sandi tidak sesuai.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Sandi baru minimal harus 6 karakter.");
      return;
    }

    setUpdating(true);
    setErrorMsg('');
    setSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Apakah Anda yakin ingin keluar?")) return;
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/siswa" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={24} />
        </Link>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>Profil Anda</h2>
      </div>

      {/* Profile Details Panel */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, py: 20 }}>
        {/* Avatar */}
        <div style={{
          width: 90, height: 90, borderRadius: 'var(--radius-lg)', 
          background: 'rgba(59, 130, 246, 0.1)', border: '2px solid var(--primary-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)',
          overflow: 'hidden'
        }}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <User size={40} />
          )}
        </div>

        {/* Info */}
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: 18, fontWeight: 'bold', color: 'white', margin: 0 }}>{profile?.full_name}</h3>
          <span style={{ 
            fontSize: 12, fontWeight: 'bold', color: 'var(--primary-color)', background: 'rgba(245, 158, 11, 0.1)',
            padding: '4px 12px', borderRadius: 12, display: 'inline-block', marginTop: 6
          }}>
            {profile?.class_name || 'Tidak ada Kelas'}
          </span>
        </div>

        <div style={{ width: '100%', height: 1, background: 'var(--surface-border)' }} />

        {/* Meta data list */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyBetween: true, alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Shield size={16} /> NISN / NIS</span>
            <span style={{ color: 'white', fontWeight: 'bold' }}>{profile?.nomor_induk || '-'}</span>
          </div>
          <div style={{ display: 'flex', justifyBetween: true, alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={16} /> Email</span>
            <span style={{ color: 'white', fontWeight: 'bold' }}>{profile?.email}</span>
          </div>
        </div>
      </div>

      {/* Password Reset Section */}
      <form onSubmit={handlePasswordChange} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Key size={16} color="var(--primary-color)" /> Ubah Kata Sandi
        </h3>
        
        {success && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399', padding: '10px 14px', borderRadius: 8, fontSize: 12,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Check size={16} /> Kata sandi Anda telah berhasil diubah!
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171', padding: '10px 14px', borderRadius: 8, fontSize: 12
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="form-group">
          <label>Kata Sandi Baru</label>
          <input 
            type="password"
            placeholder="Minimal 6 karakter"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="form-input"
            required
            style={{ width: '100%' }}
          />
        </div>

        <div className="form-group">
          <label>Konfirmasi Kata Sandi Baru</label>
          <input 
            type="password"
            placeholder="Ketik ulang kata sandi baru"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="form-input"
            required
            style={{ width: '100%' }}
          />
        </div>

        <button type="submit" className="btn-primary" disabled={updating} style={{ fontSize: 13, padding: '10px 0' }}>
          {updating ? "Menyimpan sandi..." : "Simpan Kata Sandi"}
        </button>
      </form>

      {/* Logout Button */}
      <button 
        onClick={handleLogout}
        className="btn-danger w-full"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '12px 0', fontSize: 14, fontWeight: 'bold'
        }}
      >
        <LogOut size={16} /> Keluar dari Akun
      </button>

    </div>
  );
}
