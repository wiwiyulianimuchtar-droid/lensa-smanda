"use client";
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { MapPin, Camera, RefreshCw, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AttendancePage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [statusMsg, setStatusMsg] = useState('Silakan mulai kamera atau input token manual.');
  const [loading, setLoading] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Load html5-qrcode script dynamically from CDN
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode";
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      setStatusMsg("Gagal memuat sistem scanner. Silakan gunakan token manual.");
    };
    document.body.appendChild(script);

    return () => {
      // Clean up scanning if component unmounts
      stopScanning();
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const startScanning = async () => {
    if (!scriptLoaded || typeof window.Html5Qrcode === 'undefined') {
      alert("Sistem scanner belum siap, silakan tunggu sebentar atau gunakan input manual.");
      return;
    }

    setScanning(true);
    setStatusMsg("Menginisialisasi Kamera...");

    try {
      // Check for camera permission first
      const devices = await window.Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error("Kamera tidak ditemukan di perangkat ini.");
      }

      // Target back camera
      const backCamera = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('belakang') ||
        device.label.toLowerCase().includes('environment')
      );
      const cameraId = backCamera ? backCamera.id : devices[0].id;

      html5QrCodeRef.current = new window.Html5Qrcode("reader-container");
      await html5QrCodeRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // Success callback
          stopScanning();
          handleAttendanceCheckIn(decodedText);
        },
        (errorMessage) => {
          // Keep scanning, silent errors
        }
      );
      setStatusMsg("Arahkan kamera ke QR Code Presensi.");
    } catch (err) {
      console.error("Camera error:", err);
      setStatusMsg("Gagal mengaktifkan kamera. Silakan gunakan input manual.");
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error(err);
      }
    }
    setScanning(false);
  };

  // Distance calculation using Haversine formula
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) *
        Math.cos(phi2) *
        Math.sin(deltaLambda / 2) *
        Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // distance in meters
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      alert("Masukkan token presensi terlebih dahulu.");
      return;
    }
    handleAttendanceCheckIn(manualToken.trim());
  };

  const handleAttendanceCheckIn = async (token) => {
    setLoading(true);
    setScanned(true);
    setStatusMsg("Mencari lokasi perangkat Anda...");

    // 1. Get Geolocation
    if (!navigator.geolocation) {
      alert("Browser Anda tidak mendukung deteksi lokasi. Akses presensi ditolak.");
      setLoading(false);
      setScanned(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setGpsCoords({ latitude, longitude });
        setStatusMsg("Memverifikasi sesi presensi...");

        try {
          // 2. Fetch Session Data
          const { data: sessionData, error: sessionError } = await supabase
            .from('sr_attendance_sessions')
            .select('*')
            .eq('qr_token', token)
            .single();

          if (sessionError || !sessionData) {
            alert("QR Code/Token presensi tidak valid atau telah dihapus.");
            setLoading(false);
            setScanned(false);
            return;
          }

          // Check target class
          const isTargetClass = 
            sessionData.target_class === 'SEMUA' || 
            sessionData.target_class === profile?.class_name;

          if (!isTargetClass) {
            alert(`Presensi ini khusus untuk kelas: ${sessionData.target_class}. Kelas Anda: ${profile?.class_name || 'Tidak ada'}`);
            setLoading(false);
            setScanned(false);
            return;
          }

          // Check if session has expired or not started yet
          const now = new Date();
          const startTime = new Date(sessionData.start_time);
          const endTime = new Date(sessionData.end_time);

          if (now < startTime) {
            alert("Sesi presensi belum dimulai.");
            setLoading(false);
            setScanned(false);
            return;
          }

          if (now > endTime) {
            alert("Sesi presensi sudah berakhir/kedaluwarsa.");
            setLoading(false);
            setScanned(false);
            return;
          }

          // Check if student has checked in already
          const { data: existingRecord } = await supabase
            .from('sr_attendance_records')
            .select('id')
            .eq('session_id', sessionData.id)
            .eq('student_id', user.id)
            .maybeSingle();

          if (existingRecord) {
            alert("Anda sudah melakukan presensi untuk sesi ini.");
            setStatusMsg("Presensi tercatat sebelumnya.");
            setLoading(false);
            return;
          }

          // 3. Fetch Geofence Config
          const { data: geofence, error: geofenceError } = await supabase
            .from('sr_geofence_config')
            .select('*')
            .limit(1)
            .single();

          let status = 'HADIR';
          let reason = null;
          let distance = 0;

          if (!geofenceError && geofence) {
            distance = getDistance(latitude, longitude, geofence.latitude, geofence.longitude);
            if (distance > geofence.radius_meter) {
              status = 'DITOLAK';
              reason = `Di luar radius geofence sekolah. Jarak Anda: ${Math.round(distance)}m, Batas: ${geofence.radius_meter}m.`;
            }
          }

          // Check late tolerance (e.g. 15 mins late threshold)
          if (status === 'HADIR') {
            const timeDiffMins = (now - startTime) / (1000 * 60);
            if (timeDiffMins > 15) {
              status = 'TERLAMBAT';
            }
          }

          setStatusMsg("Menyimpan data presensi...");

          // 4. Insert Record to DB
          const { data: record, error: insertError } = await supabase
            .from('sr_attendance_records')
            .insert([{
              session_id: sessionData.id,
              student_id: user.id,
              status: status,
              latitude: latitude,
              longitude: longitude,
              reason: reason
            }])
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }

          // 5. Update Point Ledger
          let pointDelta = 0;
          if (status === 'HADIR') {
            pointDelta = 8; // default hadir +8
          } else if (status === 'TERLAMBAT') {
            pointDelta = -5; // terlambat -5
          }

          if (pointDelta !== 0) {
            await supabase
              .from('sr_point_ledgers')
              .insert([{
                student_id: user.id,
                source_type: 'PRESENSI',
                source_id: record.id,
                delta_point: pointDelta
              }]);
          }

          // Complete
          if (status === 'DITOLAK') {
            alert(`Presensi Ditolak!\n\nAlasan: ${reason}`);
            setStatusMsg("Presensi ditolak karena di luar sekolah.");
          } else {
            alert(`Presensi Berhasil!\n\nStatus: ${status === 'HADIR' ? 'Tepat Waktu' : 'Terlambat'} (${pointDelta >= 0 ? '+' : ''}${pointDelta} Poin)`);
            setStatusMsg("Presensi Berhasil Tercatat!");
          }

        } catch (err) {
          console.error(err);
          alert("Terjadi kesalahan sistem: " + err.message);
          setStatusMsg("Gagal memproses presensi.");
          setScanned(false);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error(err);
        alert("Gagal mendapatkan koordinat GPS. Pastikan izin GPS aktif.");
        setStatusMsg("Gagal mendapatkan lokasi GPS.");
        setLoading(false);
        setScanned(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/siswa" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={24} />
        </Link>
        <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>Scan Presensi</h2>
      </div>

      {/* Geofence Status Header */}
      <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(245,158,11,0.05)' }}>
        <MapPin size={24} color="var(--primary-color)" />
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 'bold', color: 'white', margin: 0 }}>Geofence SMAN 2 Bandung</h4>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Pastikan Anda berada dalam wilayah sekolah saat memindai QR.
          </p>
        </div>
      </div>

      {/* Scanner Box */}
      <div 
        className="glass-panel" 
        style={{ 
          height: 320, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: 0,
          border: '1px solid var(--surface-border)'
        }}
      >
        {scanning ? (
          <div id="reader-container" style={{ width: '100%', height: '100%' }}></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 20, textAlign: 'center' }}>
            <Camera size={48} color="var(--text-muted)" style={{ opacity: 0.5 }} />
            <div>
              <p style={{ fontSize: 14, color: 'white', fontWeight: 'bold' }}>Kamera Nonaktif</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Klik tombol di bawah untuk mengaktifkan pemindai kamera.</p>
            </div>
            <button onClick={startScanning} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <Camera size={16} /> Aktifkan Kamera
            </button>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(2, 6, 23, 0.8)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 10
          }}>
            <RefreshCw className="animate-spin" size={32} color="var(--primary-color)" />
            <span style={{ fontSize: 14, color: 'white', fontWeight: 'bold' }}>{statusMsg}</span>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {!loading && (
        <div style={{ 
          padding: '12px 16px', borderRadius: 12, 
          background: scanned ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', 
          border: '1px solid var(--surface-border)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13
        }}>
          {scanned ? <CheckCircle size={18} color="#10b981" /> : <AlertCircle size={18} color="var(--primary-color)" />}
          <span style={{ color: scanned ? '#10b981' : 'var(--text-muted)' }}>{statusMsg}</span>
        </div>
      )}

      {/* Manual Input Backup */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 'bold', margin: 0 }}>Input Token Presensi Manual</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          Jika kamera HP Anda bermasalah, silakan masukkan token sesi presensi secara manual yang tertera di layar projector guru.
        </p>
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <input 
            type="text" 
            placeholder="Contoh: SR-MASUK-XXXX"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            className="form-input"
            style={{ flexGrow: 1, padding: 10, fontSize: 13 }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '0 16px', fontSize: 13 }}>
            Kirim
          </button>
        </form>
      </div>

      {scanning && (
        <button 
          onClick={stopScanning} 
          className="btn-secondary" 
          style={{ width: '100%', padding: '12px 0', fontSize: 13 }}
        >
          Matikan Kamera
        </button>
      )}

    </div>
  );
}
