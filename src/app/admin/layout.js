"use client";
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Menu, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function AdminLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div className="app-layout">
      {/* Mobile Top Header */}
      <header className="admin-mobile-header">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          style={{
            background: 'transparent', border: 'none', 
            color: 'var(--text-light)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <Menu size={24} />
        </button>
        
        <span style={{ fontWeight: 'bold', fontSize: 16, color: 'var(--text-light)' }}>
          LENSA - SMANDA
        </span>

        <button 
          onClick={toggleTheme}
          style={{
            background: 'transparent', border: 'none', 
            color: 'var(--text-light)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <Sidebar 
        role="ADMIN" 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
