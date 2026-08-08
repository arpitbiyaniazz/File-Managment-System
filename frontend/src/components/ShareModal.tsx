// ============================================
// Share Resource Modal Component
// ============================================

import React, { useState } from 'react';
import { X, Share2 } from 'lucide-react';
import { shareResourceApi } from '../services/metadata.service';

interface ShareModalProps {
  itemId: string;
  itemType: 'FILE' | 'FOLDER';
  itemName: string;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ itemId, itemType, itemName, onClose }) => {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'VIEWER' | 'EDITOR'>('VIEWER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (itemType === 'FILE') {
        await shareResourceApi(email.trim(), permission, itemId, undefined);
      } else {
        await shareResourceApi(email.trim(), permission, undefined, itemId);
      }
      setSuccessMsg(`Successfully shared "${itemName}" with ${email}`);
      setEmail('');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to share item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 600 }}>
            <Share2 size={20} style={{ color: '#3b82f6' }} />
            <span>Share "{itemName}"</span>
          </div>
          <button onClick={onClose} className="icon-btn"><X size={18} /></button>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">User Email Address</label>
            <input
              type="email"
              className="form-input"
              required
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Permission Level</label>
            <select
              className="form-select"
              value={permission}
              onChange={(e) => setPermission(e.target.value as any)}
            >
              <option value="VIEWER">Viewer (Read Only)</option>
              <option value="EDITOR">Editor (Read & Edit)</option>
            </select>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Done</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sharing...' : 'Grant Access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
