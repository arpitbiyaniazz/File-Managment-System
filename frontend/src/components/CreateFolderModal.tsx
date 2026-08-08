// ============================================
// Create Folder Modal Component
// ============================================

import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { createFolderApi } from '../services/metadata.service';

interface CreateFolderModalProps {
  currentFolderId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({ currentFolderId, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await createFolderApi(name.trim(), currentFolderId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 600 }}>
            <FolderPlus size={20} style={{ color: '#3b82f6' }} />
            <span>New Folder</span>
          </div>
          <button onClick={onClose} className="icon-btn"><X size={18} /></button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Folder Name</label>
            <input
              type="text"
              className="form-input"
              required
              autoFocus
              placeholder="e.g. Financial Reports"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
