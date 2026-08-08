// ============================================
// File Upload Modal Component (Drag & Drop + File Picker)
// ============================================

import React, { useState, useRef } from 'react';
import { X, UploadCloud } from 'lucide-react';
import { uploadFileApi } from '../services/file.service';
import { useAuth } from '../context/AuthContext';

interface UploadModalProps {
  currentFolderId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ currentFolderId, onClose, onSuccess }) => {
  const { updateUserStorage } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      await uploadFileApi(selectedFile, currentFolderId, (percent) => setProgress(percent));
      updateUserStorage(selectedFile.size);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 600 }}>
            <UploadCloud size={20} style={{ color: '#3b82f6' }} />
            <span>Upload File</span>
          </div>
          <button onClick={onClose} className="icon-btn" disabled={uploading}><X size={18} /></button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
        />

        <div
          className={`dropzone ${isDragActive ? 'active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud size={40} style={{ color: '#3b82f6', marginBottom: '12px' }} />
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {selectedFile ? selectedFile.name : 'Click or Drag & Drop file here to upload'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
            {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : 'Supports all file formats (PDF, PNG, MP4, ZIP, etc.)'}
          </div>
        </div>

        {uploading && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>
              <span>Uploading to Object Storage...</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={uploading}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleUpload} disabled={!selectedFile || uploading}>
            {uploading ? 'Uploading...' : 'Start Upload'}
          </button>
        </div>
      </div>
    </div>
  );
};
