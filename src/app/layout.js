import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata = {
  title: 'Smart-Report SMAN 2 Bandung',
  description: 'Sistem presensi dan laporan aktivitas siswa berbasis QR & Geofence',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
