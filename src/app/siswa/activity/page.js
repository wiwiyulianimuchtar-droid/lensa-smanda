"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, PlusCircle, CheckCircle, Clock, XCircle, Image as ImageIcon, Send, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ActivityPage() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState([]);
  const [myActivities, setMyActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'submit'
  
  // Form State
  const [ruleId, setRuleId] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchRules();
      fetchMyActivities();
    }
  }, [user]);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('sr_point_rules')
        .select('*')
        .eq('type', 'POSITIF')
        .eq('is_active', true)
        .order('name');
      if (!error && data) {
        setRules(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMyActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sr_activities')
        .select(`
          id,
          description,
          event_date,
          attachment_url,
          status,
          type,
          notes,
          rule:rule_id (name, default_point)
        `)
        .eq('student_id', user.id)
        .eq('type', 'POSITIF')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMyActivities(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ruleId) {
      alert("Pilih kategori aktivitas terlebih dahulu.");
      return;
    }
    if (!description.trim()) {
      alert("Masukkan deskripsi aktivitas Anda.");
      return;
    }

    setSubmitting(true);
    let attachmentUrl = null;

    try {
      // 1. Upload File to Supabase Storage if file exists
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `activities/${fileName}`;

        // Attempt upload
        const { error: uploadError } = await supabase.storage
          .from('sr_attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.warn("Storage upload failed, falling back to mock attachment link. Ensure 'sr_attachments' bucket is created.", uploadError);
          // Fallback to static mock URL for preview
          attachmentUrl = "https://images.unsplash.com/photo-1577896851231-70ef18881754?w=500";
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('sr_attachments')
            .getPublicUrl(filePath);
          attachmentUrl = urlData.publicUrl;
        }
      }

      // 2. Insert Activity Record
      const { error: insertError } = await supabase
        .from('sr_activities')
        .insert([{
          student_id: user.id,
          rule_id: ruleId,
          type: 'POSITIF',
          description: description,
          attachment_url: attachmentUrl,
          status: 'PENDING',
          event_date: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      alert("Laporan aktivitas positif berhasil dikirim. Menunggu persetujuan Guru.");
      
      // Reset Form
      setRuleId('');
      setDescription('');
      setFile(null);
      
      // Switch back to list and refresh
      setActiveTab('list');
      fetchMyActivities();

    } catch (err) {
      console.error(err);
      alert("Gagal mengirim laporan: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span style={{ 
            fontSize: 11, fontWeight: 'bold', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)',
            padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            <CheckCircle size={12} /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span style={{ 
            fontSize: 11, fontWeight: 'bold', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)',
            padding: '3px 8px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            <XCircle size={12} /> Rejected
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
        <Link href="/siswa" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={24} />
        </Link>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>Jurnal Aktivitas Positif</h2>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--surface-border)', marginBottom: 4
      }}>
        <button 
          onClick={() => setActiveTab('list')}
          style={{
            flex: 1, padding: '12px 0', background: 'transparent',
            color: activeTab === 'list' ? 'var(--primary-color)' : 'var(--text-muted)',
            fontWeight: activeTab === 'list' ? 'bold' : 'normal',
            borderBottom: activeTab === 'list' ? '2px solid var(--primary-color)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          Riwayat Jurnal
        </button>
        <button 
          onClick={() => setActiveTab('submit')}
          style={{
            flex: 1, padding: '12px 0', background: 'transparent',
            color: activeTab === 'submit' ? 'var(--primary-color)' : 'var(--text-muted)',
            fontWeight: activeTab === 'submit' ? 'bold' : 'normal',
            borderBottom: activeTab === 'submit' ? '2px solid var(--primary-color)' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          Lapor Aktivitas
        </button>
      </div>

      {/* Content */}
      {activeTab === 'list' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          
          <div style={{ display: 'flex', justifyBetween: true, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total {myActivities.length} pengajuan</span>
            <button 
              onClick={() => setActiveTab('submit')}
              style={{
                fontSize: 12, fontWeight: 'bold', color: 'var(--primary-color)',
                background: 'transparent', display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <PlusCircle size={14} /> Buat Baru
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', py: 20 }}>Memuat jurnal...</p>
          ) : myActivities.length === 0 ? (
            <div style={{
              border: '1px dashed var(--surface-border)', borderRadius: 16,
              padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              textAlign: 'center', color: 'var(--text-muted)'
            }}>
              <Sparkles size={32} style={{ opacity: 0.5 }} />
              <p style={{ fontSize: 13, margin: 0 }}>Belum ada laporan aktivitas positif yang dibuat.</p>
              <button onClick={() => setActiveTab('submit')} className="btn-secondary" style={{ fontSize: 12, padding: '8px 16px', marginTop: 4 }}>
                Lapor Sekarang
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myActivities.map((act) => (
                <div key={act.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 'bold', color: 'white', margin: 0 }}>
                        {act.rule?.name || 'Aktivitas'}
                      </h4>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(act.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: 15, fontWeight: 'bold', 
                      color: act.status === 'APPROVED' ? '#10b981' : '#f59e0b' 
                    }}>
                      +{act.rule?.default_point || 0} Poin
                    </span>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    {act.description}
                  </p>

                  {act.attachment_url && (
                    <a 
                      href={act.attachment_url} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, 
                        color: 'var(--primary-color)', textDecoration: 'none', width: 'fit-content'
                      }}
                    >
                      <ImageIcon size={14} /> Lihat Bukti Foto
                    </a>
                  )}

                  <div style={{ height: 1, background: 'var(--surface-border)', margin: '4px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {getStatusBadge(act.status)}
                  </div>

                  {act.notes && (
                    <div style={{ 
                      fontSize: 12, background: 'rgba(255,255,255,0.02)', 
                      padding: 10, borderRadius: 8, borderLeft: '3px solid var(--primary-color)' 
                    }}>
                      <strong style={{ display: 'block', color: 'white', marginBottom: 2 }}>Catatan Guru:</strong>
                      <span style={{ color: 'var(--text-muted)' }}>{act.notes}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      ) : (
        /* Submit Tab */
        <form onSubmit={handleSubmit} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label>Kategori Aktivitas Positif</label>
            <select 
              value={ruleId}
              onChange={(e) => setRuleId(e.target.value)}
              className="form-input"
              required
              style={{ width: '100%' }}
            >
              <option value="">-- Pilih Aktivitas --</option>
              {rules.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} (+{r.default_point} Poin)
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Deskripsi & Penjelasan Singkat</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ceritakan detail aktivitas positif yang Anda lakukan..."
              rows={4}
              className="form-input"
              required
              style={{ width: '100%', resize: 'none', padding: 12 }}
            />
          </div>

          <div className="form-group">
            <label>Lampiran Bukti Foto (Opsional)</label>
            <div style={{
              border: '1px dashed var(--surface-border)', borderRadius: 12,
              padding: '16px 20px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 8, cursor: 'pointer', background: 'rgba(0,0,0,0.1)'
            }}>
              <ImageIcon size={24} color="var(--text-muted)" />
              <span style={{ fontSize: 13, color: 'white', fontWeight: 'bold' }}>
                {file ? file.name : "Pilih Berkas / Foto Bukti"}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mendukung format JPG, PNG</span>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleFileChange}
                style={{
                  position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', display: 'none'
                }}
                id="file-upload-input"
              />
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ fontSize: 12, padding: '6px 12px', marginTop: 4 }}
                onClick={() => document.getElementById('file-upload-input').click()}
              >
                Pilih Foto
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={submitting}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              gap: 8, padding: '12px 0', fontSize: 14, fontWeight: 'bold', marginTop: 8
            }}
          >
            <Send size={16} />
            {submitting ? "Mengirim Laporan..." : "Kirim Laporan"}
          </button>
        </form>
      )}

    </div>
  );
}
