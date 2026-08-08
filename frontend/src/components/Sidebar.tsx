// ============================================
// Sidebar Navigation & Storage Meter
// ============================================

import React from 'react';
import { HardDrive, Folder, Share2, Database } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: 'drive' | 'shared';
  setActiveTab: (tab: 'drive' | 'shared') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user } = useAuth();

  const usedBytes = user?.storageUsed || 0;
  const limitBytes = user?.storageLimit || 10 * 1024 * 1024 * 1024; // Default 10GB
  const percentUsed = Math.min(100, Math.round((usedBytes / limitBytes) * 100));

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <HardDrive size={26} />
        <span>Drive System</span>
      </div>

      <nav className="sidebar-nav">
        <div
          className={`nav-item ${activeTab === 'drive' ? 'active' : ''}`}
          onClick={() => setActiveTab('drive')}
        >
          <Folder size={18} />
          <span>My Drive</span>
        </div>

        <div
          className={`nav-item ${activeTab === 'shared' ? 'active' : ''}`}
          onClick={() => setActiveTab('shared')}
        >
          <Share2 size={18} />
          <span>Shared with Me</span>
        </div>
      </nav>

      {/* Storage Meter Widget */}
      <div className="storage-meter">
        <div className="storage-title">
          <span>Storage Quota</span>
          <span>{percentUsed}%</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${percentUsed}%` }} />
        </div>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={14} />
          <span>{formatSize(usedBytes)} of {formatSize(limitBytes)} used</span>
        </div>
      </div>
    </aside>
  );
};
