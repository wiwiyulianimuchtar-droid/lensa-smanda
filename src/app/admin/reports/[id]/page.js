"use client";
import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { Printer, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ReportCard({ params }) {
  const [student, setStudent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // In Next.js 15+, params is a Promise that must be unwrapped
  const resolvedParams = use(params);
  const studentId = resolvedParams.id; 

  useEffect(() => {
    fetchReportData();
  }, [studentId]);

  const [ledgers, setLedgers] = useState([]);

  const fetchReportData = async () => {
    setLoading(true);
    // 1. Fetch Student Profile
    const { data: profile } = await supabase
      .from('sr_profiles')
      .select('*')
      .eq('id', studentId)
      .single();

    // 2. Fetch Point Ledgers
    const { data: pointLedgers } = await supabase
      .from('sr_point_ledgers')
      .select('*')
      .eq('student_id', studentId);

    // 3. Fetch Activities (Discipline & Achievements from DB)
    const { data: acts } = await supabase
      .from('sr_activities')
      .select(`
        id, created_at, type, description, status,
        sr_point_rules:rule_id (name, default_point)
      `)
      .eq('student_id', studentId)
      .eq('status', 'APPROVED')
      .order('created_at', { ascending: false });

    if (profile) setStudent(profile);
    if (acts) setActivities(acts);
    if (pointLedgers) setLedgers(pointLedgers);
    
    setLoading(false);
  };

  // Kalkulasi Poin Logika
  const BASE_POINT = 2000;
  let totalPoints = BASE_POINT + ledgers.reduce((acc, curr) => acc + curr.delta_point, 0);

  // Logika Predikat Status
  let statusText = "Istimewa";
  let statusColor = "#3b82f6"; // Blue
  
  if (totalPoints < 1000) {
    statusText = "Intervensi Khusus";
    statusColor = "#ef4444"; // Red
  } else if (totalPoints <= 1500) {
    statusText = "Pembinaan 3";
    statusColor = "#f97316"; // Orange
  } else if (totalPoints <= 1700) {
    statusText = "Pembinaan 2";
    statusColor = "#eab308"; // Yellow
  } else if (totalPoints <= 1900) {
    statusText = "Pembinaan 1";
    statusColor = "#84cc16"; // Lime
  } else if (totalPoints <= 2100) {
    statusText = "Normal";
    statusColor = "#10b981"; // Emerald
  } else if (totalPoints <= 2300) {
    statusText = "Luar Biasa";
    statusColor = "#06b6d4"; // Cyan
  }

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-8 text-center text-muted">Memuat Rapor Karakter...</div>;
  if (!student) return <div className="p-8 text-center text-danger">Data Siswa Tidak Ditemukan!</div>;

  return (
    <div className="animate-fade-in" style={{paddingBottom: 100}}>
      {/* Control Panel (Hidden on Print) */}
      <div className="no-print flex justify-between items-center mb-6 glass-panel">
        <Link href="/admin/reports">
          <button className="btn-secondary flex items-center gap-2">
            <ChevronLeft size={16} /> Kembali
          </button>
        </Link>
        <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
          <Printer size={16} /> Cetak Rapor (A4)
        </button>
      </div>

      {/* A4 PAPER CONTAINER */}
      <div 
        className="print-only"
        style={{
          background: 'white', 
          color: 'black',
          width: '210mm', 
          minHeight: '297mm', 
          margin: '0 auto', 
          padding: '20mm',
          boxShadow: '0 0 20px rgba(0,0,0,0.5)',
          fontFamily: '"Times New Roman", Times, serif'
        }}
      >
        {/* HEADER / KOP SURAT */}
        <div style={{display: 'flex', alignItems: 'center', borderBottom: '3px solid black', paddingBottom: 15, marginBottom: 20}}>
          <img src="/logo.png" alt="Logo" style={{width: 95, height: 95, objectFit: 'contain'}} />
          <div style={{flex: 1, textAlign: 'center'}}>
            <h2 style={{margin: 0, fontSize: 18, textTransform: 'uppercase', letterSpacing: 1}}>Pemerintah Daerah Provinsi Jawa Barat</h2>
            <h2 style={{margin: '5px 0', fontSize: 18, textTransform: 'uppercase', letterSpacing: 1}}>Dinas Pendidikan</h2>
            <h1 style={{margin: 0, fontSize: 24, fontWeight: 'bold', letterSpacing: 2}}>SMA NEGERI 2 BANDUNG</h1>
            <p style={{margin: '5px 0 0 0', fontSize: 12}}>Jl. Cihampelas No.173, Cipaganti, Coblong, Kota Bandung, Jawa Barat 40131</p>
          </div>
          <div style={{width: 95}}></div> {/* Spacer for balance */}
        </div>

        <h3 style={{textAlign: 'center', margin: '20px 0', textDecoration: 'underline', fontSize: 18}}>LAPORAN PERKEMBANGAN KARAKTER & EKSKUL</h3>

        {/* IDENTITAS */}
        <table style={{width: '100%', marginBottom: 20, fontSize: 14}}>
          <tbody>
            <tr>
              <td style={{width: 150, padding: '4px 0'}}><strong>Nama Peserta Didik</strong></td>
              <td style={{width: 10}}>:</td>
              <td style={{fontWeight: 'bold'}}>{student.full_name}</td>
              <td style={{width: 100, padding: '4px 0'}}><strong>Kelas</strong></td>
              <td style={{width: 10}}>:</td>
              <td>{student.class_name || '-'}</td>
            </tr>
            <tr>
              <td style={{padding: '4px 0'}}><strong>NISN / NIS</strong></td>
              <td>:</td>
              <td>{student.nisn || '-'}</td>
              <td style={{padding: '4px 0'}}><strong>Tahun Ajaran</strong></td>
              <td>:</td>
              <td>2025/2026</td>
            </tr>
          </tbody>
        </table>

        {/* SUMMARY POIN & STATUS */}
        <div style={{border: '2px solid black', borderRadius: 8, padding: 15, display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: 20, background: '#f8fafc'}}>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase'}}>Poin Karakter Akhir</div>
            <div style={{fontSize: 32, fontWeight: 'bold', color: 'black'}}>{totalPoints}</div>
          </div>
          <div style={{width: 2, height: 40, background: '#cbd5e1'}}></div>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase'}}>Status Pembinaan</div>
            <div style={{fontSize: 24, fontWeight: 'bold', color: statusColor}}>{statusText}</div>
          </div>
        </div>

        {/* BAGIAN 1: EKSKUL (MOCK) */}
        <h4 style={{fontSize: 14, marginBottom: 8, marginTop: 20}}>A. RIWAYAT EKSTRAKURIKULER</h4>
        <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 13}}>
          <thead>
            <tr style={{background: '#f1f5f9'}}>
              <th style={{border: '1px solid black', padding: 8, textAlign: 'center', width: 40}}>No</th>
              <th style={{border: '1px solid black', padding: 8, textAlign: 'left'}}>Kegiatan Ekstrakurikuler</th>
              <th style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>Total Kehadiran</th>
              <th style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>Nilai / Predikat</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>1</td>
              <td style={{border: '1px solid black', padding: 8}}>Pramuka (Wajib)</td>
              <td style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>12 Kali</td>
              <td style={{border: '1px solid black', padding: 8, textAlign: 'center', fontWeight: 'bold'}}>Sangat Baik (A)</td>
            </tr>
            <tr>
              <td style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>2</td>
              <td style={{border: '1px solid black', padding: 8}}>Paskibra</td>
              <td style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>24 Kali</td>
              <td style={{border: '1px solid black', padding: 8, textAlign: 'center', fontWeight: 'bold'}}>Sangat Baik (A)</td>
            </tr>
          </tbody>
        </table>

        {/* BAGIAN 2: PRESTASI (MOCK) */}
        <h4 style={{fontSize: 14, marginBottom: 8}}>B. PRESTASI DAN PENGHARGAAN</h4>
        <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 13}}>
          <thead>
            <tr style={{background: '#f1f5f9'}}>
              <th style={{border: '1px solid black', padding: 8, textAlign: 'center', width: 40}}>No</th>
              <th style={{border: '1px solid black', padding: 8, textAlign: 'left'}}>Nama Kompetisi / Kegiatan</th>
              <th style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>Tingkat</th>
              <th style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>Penghargaan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>1</td>
              <td style={{border: '1px solid black', padding: 8}}>Olimpiade Sains Nasional (Fisika)</td>
              <td style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>Provinsi</td>
              <td style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>Juara 1</td>
            </tr>
            <tr>
              <td style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>2</td>
              <td style={{border: '1px solid black', padding: 8}}>Lomba Baris Berbaris Indah</td>
              <td style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>Kota Bandung</td>
              <td style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>Juara Umum</td>
            </tr>
          </tbody>
        </table>

        {/* BAGIAN 3: KEDISIPLINAN (REAL DATA FROM DB) */}
        <h4 style={{fontSize: 14, marginBottom: 8}}>C. RIWAYAT KEDISIPLINAN & AKTIVITAS HARIAN</h4>
        <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: 30, fontSize: 13}}>
          <thead>
            <tr style={{background: '#f1f5f9'}}>
              <th style={{border: '1px solid black', padding: 8, textAlign: 'center', width: 40}}>No</th>
              <th style={{border: '1px solid black', padding: 8, textAlign: 'center', width: 100}}>Tanggal</th>
              <th style={{border: '1px solid black', padding: 8, textAlign: 'left'}}>Kategori Perilaku</th>
              <th style={{border: '1px solid black', padding: 8, textAlign: 'left'}}>Keterangan</th>
              <th style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>Poin</th>
            </tr>
          </thead>
          <tbody>
            {activities.length > 0 ? activities.map((act, idx) => (
              <tr key={act.id}>
                <td style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>{idx + 1}</td>
                <td style={{border: '1px solid black', padding: 8, textAlign: 'center'}}>{new Date(act.created_at).toLocaleDateString('id-ID')}</td>
                <td style={{border: '1px solid black', padding: 8}}>{act.sr_point_rules?.name || act.type}</td>
                <td style={{border: '1px solid black', padding: 8}}>{act.description}</td>
                <td style={{border: '1px solid black', padding: 8, textAlign: 'center', fontWeight: 'bold', color: act.type === 'POSITIF' ? 'green' : 'red'}}>
                  {act.type === 'POSITIF' ? '+' : '-'}{act.sr_point_rules?.default_point || 0}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" style={{border: '1px solid black', padding: 15, textAlign: 'center', fontStyle: 'italic'}}>Belum ada catatan aktivitas / kedisiplinan.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* FOOTER PENGESAHAN */}
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 40, fontSize: 14}}>
          <div style={{textAlign: 'center', width: 200}}>
            <p style={{marginBottom: 60}}>Mengetahui,<br/>Wali Kelas</p>
            <p style={{fontWeight: 'bold', textDecoration: 'underline', margin: 0}}>_________________________</p>
            <p style={{margin: 0}}>NIP. </p>
          </div>
          
          <div style={{textAlign: 'center', width: 200}}>
            <p style={{marginBottom: 60}}>Bandung, {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}<br/>Wakasek Kesiswaan</p>
            <p style={{fontWeight: 'bold', textDecoration: 'underline', margin: 0}}>_________________________</p>
            <p style={{margin: 0}}>NIP. </p>
          </div>
        </div>

      </div>
    </div>
  );
}
