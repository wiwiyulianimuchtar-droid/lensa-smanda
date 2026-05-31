"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, Calendar, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function ParentAttendancePage() {
  const { user, profile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState('');
  const [records, setRecords] = useState([]);
  
  // Stats
  const [stats, setStats] = useState({ hadir: 0, terlambat: 0, ditolak: 0 });

  useEffect(() => {
    if (user?.id && profile?.parent_id) {
      fetchChildAttendance(profile.parent_id);
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const fetchChildAttendance = async (childId) => {
    setLoading(true);
    try {
      // 1. Fetch child profile name
      const { data: childProfile } = await supabase
        .from('sr_profiles')
        .select('full_name')
        .eq('id', childId)
        .single();
      
      if (childProfile) {
        setChildName(childProfile.full_name);
      }

      // 2. Fetch attendance records
      const res = await fetch(`/api/records?student_id=${childId}`);
      if (res.ok) {
        const data = await res.json();
        
        // Fetch sessions to join locally
        const sessionRes = await fetch('/api/sessions');
        const sessionsList = sessionRes.ok ? await sessionRes.json() : [];

        const joinedData = data.map(rec => {
          const session = sessionsList.find(s => s.id === rec.session_id);
          return {
            ...rec,
            session: session || rec.session
          };
        });

        setRecords(joinedData);

        // Calculate counts
        let hadir = 0;
        let terlambat = 0;
        let ditolak = 0;
        let sakit = 0;
        let izin = 0;
        let alpa = 0;
        let dispen = 0;

        joinedData.forEach(r => {
          if (r.status === 'HADIR') hadir++;
          else if (r.status === 'TERLAMBAT') terlambat++;
          else if (r.status === 'SAKIT') sakit++;
          else if (r.status === 'IZIN') izin++;
          else if (r.status === 'ALPA') alpa++;
          else if (r.status === 'DISPEN') dispen++;
          else if (r.status === 'DITOLAK') ditolak++;
        });

        setStats({ hadir, terlambat, ditolak, sakit, izin, alpa, dispen });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'HADIR':
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle size={10} /> Hadir
          </span>
        );
      case 'TERLAMBAT':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Clock size={10} /> Terlambat
          </span>
        );
      case 'SAKIT':
        return (
          <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>
            <AlertTriangle size={10} /> Sakit
          </span>
        );
      case 'IZIN':
        return (
          <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>
            <AlertTriangle size={10} /> Izin
          </span>
        );
      case 'ALPA':
        return (
          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <XCircle size={10} /> Alpa
          </span>
        );
      case 'DISPEN':
        return (
          <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(6, 182, 212, 0.1)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>
            <CheckCircle size={10} /> Dispen
          </span>
        );
      default:
        return (
          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <XCircle size={10} /> Ditolak
          </span>
        );
    }
  };

  const getSessionTypeLabel = (session_type, title = '') => {
    let label = '';
    switch (session_type) {
      case 'HARIAN_MASUK':
        label = 'Masuk Harian';
        break;
      case 'HARIAN_PULANG':
        label = 'Pulang Harian';
        break;
      case 'MAPEL':
        label = 'Mapel KBM';
        break;
      case 'KEGIATAN':
        label = 'Kegiatan';
        break;
      case 'UJIAN':
        label = 'Ujian';
        break;
      case 'EKSKUL':
        label = 'Ekskul';
        break;
      default:
        label = 'Sesi Kelas';
    }
    if (title) {
      return `${label} - ${title}`;
    }
    return label;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/orangtua" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={24} />
        </Link>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>Kehadiran Anak</h2>
      </div>

      {/* Child name summary banner */}
      <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>DAFTAR KEHADIRAN SISWA:</span>
        <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'white', margin: '2px 0 0 0' }}>{childName || 'Anak Anda'}</h3>
      </div>

      {/* Stats Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 10 }}>
        <div className="glass-panel" style={{ padding: 10, textAlign: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>HADIR</span>
          <span style={{ fontSize: 16, fontWeight: '900', color: '#10b981' }}>{stats.hadir}</span>
        </div>
        <div className="glass-panel" style={{ padding: 10, textAlign: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>TELAT</span>
          <span style={{ fontSize: 16, fontWeight: '900', color: '#f59e0b' }}>{stats.terlambat}</span>
        </div>
        <div className="glass-panel" style={{ padding: 10, textAlign: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>SAKIT</span>
          <span style={{ fontSize: 16, fontWeight: '900', color: '#60a5fa' }}>{stats.sakit || 0}</span>
        </div>
        <div className="glass-panel" style={{ padding: 10, textAlign: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>IZIN</span>
          <span style={{ fontSize: 16, fontWeight: '900', color: '#fbbf24' }}>{stats.izin || 0}</span>
        </div>
        <div className="glass-panel" style={{ padding: 10, textAlign: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>ALPA</span>
          <span style={{ fontSize: 16, fontWeight: '900', color: '#f87171' }}>{stats.alpa || 0}</span>
        </div>
        <div className="glass-panel" style={{ padding: 10, textAlign: 'center' }}>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>DISPEN</span>
          <span style={{ fontSize: 16, fontWeight: '900', color: '#22d3ee' }}>{stats.dispen || 0}</span>
        </div>
      </div>

      {/* Attendance List */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 12 }}>Riwayat Presensi</h3>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', py: 20 }}>Memuat riwayat kehadiran...</p>
        ) : records.length === 0 ? (
          <div style={{
            border: '1px dashed var(--surface-border)', borderRadius: 12,
            padding: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            color: 'var(--text-muted)', textAlign: 'center'
          }}>
            <Calendar size={30} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: 12 }}>Belum ada riwayat kehadiran tercatat.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {records.map(rec => {
              const dateStr = new Date(rec.created_at).toLocaleDateString('id-ID', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
              });
              const timeStr = new Date(rec.created_at).toLocaleTimeString('id-ID', {
                hour: '2-digit', minute: '2-digit'
              }) + ' WIB';
              
              const sessionLabel = getSessionTypeLabel(rec.session?.session_type, rec.session?.title);

              return (
                <div 
                  key={rec.id} 
                  className="glass-panel" 
                  style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14 }}
                >
                  <div style={{ display: 'flex', justifyBetween: true, alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 'bold', color: 'white', margin: 0 }}>
                        {sessionLabel}
                      </h4>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dateStr}</span>
                    </div>
                    {getStatusBadge(rec.status)}
                  </div>
                  
                  <div style={{ display: 'flex', justifyBetween: true, fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    <span>Waktu Check-In: <strong style={{ color: 'white' }}>{timeStr}</strong></span>
                  </div>

                  {rec.reason && (
                    <div style={{ 
                      fontSize: 11, color: '#f87171', background: 'rgba(239, 68, 68, 0.05)',
                      padding: 8, borderRadius: 6, marginTop: 4
                    }}>
                      ⚠️ {rec.reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
