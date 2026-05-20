"use client";
import { Construction } from 'lucide-react';

export default function HumasMaster() {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center" style={{minHeight: '60vh'}}>
      <Construction size={64} className="text-muted mb-4" />
      <h1 className="text-center">Manajemen Humas & Layanan</h1>
      <p className="text-center text-muted max-w-md">
        Modul ini sedang dalam tahap pengembangan. Nantinya akan berisi Publikasi Informasi Sekolah, Layanan Tamu, dan Kemitraan.
      </p>
    </div>
  );
}
