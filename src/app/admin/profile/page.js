"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, User, Mail, Shield, LogOut, Key, Check, Sun, Moon, 
  Plus, RefreshCw, Sparkles, Phone, Calendar, ClipboardCheck 
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';
import { compressImage } from '@/lib/imageCompressor';

export default function AdminProfilePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();

  // Profile data states
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    nip: '',
    nuptk: '',
    gender: 'L',
    birth_date: '',
    employment_status: 'PNS',
    phone: ''
  });
  const [loading, setLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Avatar upload states
  const [tempAvatarFile, setTempAvatarFile] = useState(null);
  const [tempAvatarPreview, setTempAvatarPreview] = useState(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  // Password reset states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Collapsible panel states
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [isPasswordExpanded, setIsPasswordExpanded] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchTeacherDetails();
    }
  }, [profile]);

  const fetchTeacherDetails = async () => {
    try {
      setLoading(true);
      if (profile.role === 'GURU') {
        const { data: detailsData } = await supabase
          .from('sr_teacher_details')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle();

        setProfileForm({
          full_name: profile.full_name || '',
          nip: detailsData?.nip || '',
          nuptk: detailsData?.nuptk || '',
          gender: detailsData?.gender || 'L',
          birth_date: detailsData?.birth_date || '',
          employment_status: detailsData?.employment_status || 'PNS',
          phone: detailsData?.phone || ''
        });
      } else {
        // ADMIN or other staff
        setProfileForm({
          full_name: profile.full_name || '',
          nip: profile.nomor_induk || '',
          nuptk: '',
          gender: 'L',
          birth_date: '',
          employment_status: 'PNS',
          phone: ''
        });
      }
    } catch (err) {
      console.error("Gagal mengambil detail profil:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      // 1. Update full_name in sr_profiles
      const { error: profileErr } = await supabase
        .from('sr_profiles')
        .update({ full_name: profileForm.full_name })
        .eq('id', profile.id);

      if (profileErr) throw profileErr;

      // 2. Upsert details if GURU
      if (profile.role === 'GURU') {
        const { error: detailsErr } = await supabase
          .from('sr_teacher_details')
          .upsert({
            profile_id: profile.id,
            nip: profileForm.nip || null,
            nuptk: profileForm.nuptk || null,
            gender: profileForm.gender,
            birth_date: profileForm.birth_date || null,
            employment_status: profileForm.employment_status,
            phone: profileForm.phone || null
          });

        if (detailsErr) throw detailsErr;
      } else {
        // Update nomor_induk in sr_profiles for Admin
        const { error: nomorIndukErr } = await supabase
          .from('sr_profiles')
          .update({ nomor_induk: profileForm.nip || null })
          .eq('id', profile.id);

        if (nomorIndukErr) throw nomorIndukErr;
      }

      alert("Profil Anda berhasil disimpan!");
      window.location.reload();
    } catch (err) {
      alert("Gagal memperbarui profil: " + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

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
      console.error("Gagal mengompresi foto profil:", err);
      setTempAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAvatar = async () => {
    if (!tempAvatarPreview) return;

    setIsSavingAvatar(true);
    try {
      const { error: updateErr } = await supabase
        .from('sr_profiles')
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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError("Konfirmasi kata sandi tidak sesuai.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Kata sandi baru minimal harus 6 karakter.");
      return;
    }

    setUpdatingPassword(true);
    setPasswordError('');
    setPasswordSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleLogout = async () => {
    if (!confirm("Apakah Anda yakin ingin keluar?")) return;
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    router.replace('/login');
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Gagal signOut dari Supabase:", err);
    }
  };

  if (authLoading || loading || !profile) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '100px 0' }}>
        <RefreshCw className="animate-spin" size={32} style={{ margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14 }}>Memuat profil Anda...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/admin" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={24} />
          </Link>
          <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>Profil Pengguna</h2>
        </div>
        <button 
          onClick={toggleTheme}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)',
            width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-light)', cursor: 'pointer'
          }}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
        
        {/* Left Column: Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Foto Profil Card */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', margin: 0, alignSelf: 'flex-start' }}>Foto Profil</h3>
            
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
                    style={{ flex: 1, padding: 8, fontSize: 12, cursor: 'pointer' }}
                    disabled={isSavingAvatar}
                  >
                    Batal
                  </button>
                  <button 
                    type="button"
                    onClick={handleUploadAvatar}
                    className="btn-primary"
                    style={{ flex: 1, padding: 8, fontSize: 12, background: 'var(--primary-color)', cursor: 'pointer' }}
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
                    <Plus size={16} /> Pilih Foto Profil
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

        </div>

        {/* Right Column: Identity Form & Password Change */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 16, margin: 0 }}>Detail Identitas Pengguna</h3>
            <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
              Lihat dan ubah informasi data diri Anda seperti nama lengkap, NIP/NUPTK, nomor telepon, dan status kepegawaian.
            </p>

            <button 
              type="button"
              onClick={() => setIsProfileExpanded(!isProfileExpanded)}
              className={isProfileExpanded ? "btn-secondary" : "btn-primary"} 
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, 
                padding: '8px 12px', fontSize: 12, width: '100%', 
                cursor: 'pointer', margin: '4px 0 0'
              }}
            >
              {isProfileExpanded ? "Sembunyikan Formulir Identitas" : "Ubah / Edit Identitas"}
            </button>

            {isProfileExpanded && (
              <form onSubmit={handleSaveProfile} style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 15, marginTop: 5, display: 'flex', flexDirection: 'column', gap: 12 }}>
                
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
                  <label style={{ fontSize: 12 }}>Email Sistem (Login)</label>
                  <input 
                    type="text" 
                    className="form-input"
                    disabled
                    value={profile?.email || ''}
                    style={{ fontSize: 13, background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Role Akun</label>
                  <input 
                    type="text" 
                    className="form-input"
                    disabled
                    value={profile?.is_kepsek ? 'Kepala Sekolah' : profile?.is_manajemen ? (
                      profile.manajemen_role === 'KURIKULUM' ? 'Guru (Waka Kurikulum)' :
                      profile.manajemen_role === 'KESISWAAN' ? 'Guru (Waka Kesiswaan)' :
                      profile.manajemen_role === 'SARPRAS' ? 'Guru (Waka Sarana Prasarana)' :
                      profile.manajemen_role === 'HUMAS' ? 'Guru (Waka Humas)' : `Guru (Manajemen - ${profile.manajemen_role})`
                    ) : profile?.role || ''}
                    style={{ fontSize: 13, background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}
                  />
                </div>

                {profile.role === 'GURU' ? (
                  <>
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
                  </>
                ) : (
                  <div className="form-group">
                    <label style={{ fontSize: 12 }}>Nomor Induk / Kode Admin</label>
                    <input 
                      type="text" 
                      className="form-input"
                      value={profileForm.nip}
                      onChange={e => setProfileForm({...profileForm, nip: e.target.value})}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, marginTop: 5, cursor: 'pointer' }}
                  disabled={isSavingProfile}
                >
                  <Sparkles size={16} /> {isSavingProfile ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </form>
            )}
          </div>

          {/* Change Password Card */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 15, fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={16} color="var(--primary-color)" /> Ubah Kata Sandi
            </h3>
            <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>
              Ganti kata sandi masuk akun Anda secara berkala demi keamanan privasi akun Anda.
            </p>

            <button 
              type="button"
              onClick={() => setIsPasswordExpanded(!isPasswordExpanded)}
              className={isPasswordExpanded ? "btn-secondary" : "btn-primary"} 
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, 
                padding: '8px 12px', fontSize: 12, width: '100%', 
                cursor: 'pointer', margin: '4px 0 0'
              }}
            >
              {isPasswordExpanded ? "Sembunyikan Formulir Sandi" : "Ubah Kata Sandi Akun"}
            </button>

            {isPasswordExpanded && (
              <form onSubmit={handlePasswordChange} style={{ borderTop: '1px solid var(--surface-border)', paddingTop: 15, marginTop: 5, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {passwordSuccess && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#34d399', padding: '10px 14px', borderRadius: 8, fontSize: 12,
                    display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <Check size={16} /> Kata sandi Anda telah berhasil diubah!
                  </div>
                )}

                {passwordError && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171', padding: '10px 14px', borderRadius: 8, fontSize: 12
                  }}>
                    ⚠️ {passwordError}
                  </div>
                )}

                <div className="form-group">
                  <label style={{ fontSize: 12 }}>Kata Sandi Baru</label>
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
                  <label style={{ fontSize: 12 }}>Konfirmasi Kata Sandi Baru</label>
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

                <button type="submit" className="btn-primary" disabled={updatingPassword} style={{ fontSize: 13, padding: '10px 0', cursor: 'pointer' }}>
                  {updatingPassword ? "Menyimpan sandi..." : "Simpan Kata Sandi"}
                </button>
              </form>
            )}
          </div>

          {/* Logout button */}
          <button 
            onClick={handleLogout}
            className="btn-danger"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 0', fontSize: 14, fontWeight: 'bold', cursor: 'pointer', border: 'none'
            }}
          >
            <LogOut size={16} /> Keluar dari Akun
          </button>

        </div>
      </div>
    </div>
  );
}
