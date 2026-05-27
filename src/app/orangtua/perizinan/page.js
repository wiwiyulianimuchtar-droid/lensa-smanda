"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, ClipboardList, CheckCircle, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function ParentPermissionsPage() {
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState('');
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    if (user?.id && profile?.parent_id) {
      fetchChildPermissions(profile.parent_id);
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const fetchChildPermissions = async (childId) => {
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

      // 2. Fetch permissions records
      const { data, error } = await supabase
        .from('sr_permissions')
        .select(`
          *,
          approver:approver_id (full_name)
        `)
        .eq('student_id', childId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPermissions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DISETUJUI':
        return (
          <span style={{ 
            fontSize: 11, fontWeight: 'bold', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)',
            padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            <CheckCircle size={12} /> Disetujui
          </span>
        );
      case 'SELESAI':
        return (
          <span style={{ 
            fontSize: 11, fontWeight: 'bold', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.15)',
            padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            <CheckCircle size={12} /> Selesai
          </span>
        );
      case 'DITOLAK':
        return (
          <span style={{ 
            fontSize: 11, fontWeight: 'bold', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)',
            padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            <XCircle size={12} /> Ditolak
          </span>
        );
      default:
        return (
          <span style={{ 
            fontSize: 11, fontWeight: 'bold', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)',
            padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            <Clock size={12} /> Pending
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/orangtua" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={24} />
        </Link>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>Perizinan Anak</h2>
      </div>

      {/* Child name summary banner */}
      <div className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>DAFTAR PERIZINAN SISWA:</span>
        <h3 style={{ fontSize: 15, fontWeight: 'bold', color: 'white', margin: '2px 0 0 0' }}>{childName || 'Anak Anda'}</h3>
      </div>

      {/* Permissions List */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 12 }}>Daftar Perizinan Keluar Kelas / Sekolah</h3>

        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', py: 20 }}>Memuat riwayat izin...</p>
        ) : permissions.length === 0 ? (
          <div style={{
            border: '1px dashed var(--surface-border)', borderRadius: 12,
            padding: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            color: 'var(--text-muted)', textAlign: 'center'
          }}>
            <ClipboardList size={30} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: 12 }}>Belum ada permohonan izin diajukan.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {permissions.map((perm) => (
              <div key={perm.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 'bold', color: 'white', margin: 0 }}>
                      {perm.tipe}
                    </h4>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Tanggal: {new Date(perm.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(0,0,0,0.1)', padding: 10, borderRadius: 8, fontSize: 12 }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Alasan: </span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{perm.alasan}</span>
                  </div>
                  <div style={{ marginTop: 2 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Waktu: </span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{perm.waktu}</span>
                  </div>
                </div>

                <div style={{ height: 1, background: 'var(--surface-border)', margin: '4px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {getStatusBadge(perm.status)}
                  {perm.approver && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Disetujui oleh: <strong>{perm.approver.full_name}</strong>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
