import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata = {
  title: 'Smart-Report SMAN 2 Bandung',
  description: 'Sistem presensi dan laporan aktivitas siswa berbasis QR & Geofence',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('theme');
                  if (savedTheme === 'light') {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
