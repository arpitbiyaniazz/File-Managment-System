// ============================================
// Main Workspace Dashboard Page
// ============================================

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { CreateFolderModal } from '../components/CreateFolderModal';
import { UploadModal } from '../components/UploadModal';
import { ShareModal } from '../components/ShareModal';
import {
  getFolderContentsApi,
  getSharedWithMeApi,
  deleteFolderApi,
  FolderItem,
  FileItem,
} from '../services/metadata.service';
import { downloadFileApi, deleteFileApi } from '../services/file.service';
import { searchApiCall } from '../services/search.service';
import {
  Folder,
  FileText,
  Upload,
  FolderPlus,
  Trash2,
  Download,
  Share2,
  ChevronRight,
  Home,
  Search,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

interface BreadcrumbCrumb {
  id: string | null;
  name: string;
}

export const DashboardPage: React.FC = () => {
  const { updateUserStorage } = useAuth();
  const [activeTab, setActiveTab] = useState<'drive' | 'shared'>('drive');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbCrumb[]>([
    { id: null, name: 'Home' },
  ]);
  
  const currentFolder = breadcrumbs[breadcrumbs.length - 1] || { id: null, name: 'Home' };

  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [sharedItems, setSharedItems] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  // Modals state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; type: 'FILE' | 'FOLDER'; name: string } | null>(null);

  // Fetch folder contents or shared items
  const loadContents = async () => {
    setSearchResults(null);
    try {
      if (activeTab === 'drive') {
        const res = await getFolderContentsApi(currentFolder?.id);
        if (res.success && res.data) {
          setFolders(res.data.folders || []);
          setFiles(res.data.files || []);
        }
      } else {
        const res = await getSharedWithMeApi();
        if (res.success && res.data) {
          setSharedItems(res.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load contents', err);
    }
  };

  useEffect(() => {
    loadContents();
  }, [currentFolder?.id, activeTab]);

  // Handle Elasticsearch Search Query
  const handleSearch = async (q: string) => {
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      const res = await searchApiCall(q);
      if (res.success && res.data) {
        setSearchResults(res.data.hits || []);
      }
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  // Folder Navigation
  const handleOpenFolder = (folder: FolderItem) => {
    setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
  };

  const handleNavigateBreadcrumb = (index: number) => {
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  // Delete Handlers
  const handleDeleteFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this folder and all its contents recursively?')) {
      await deleteFolderApi(id);
      loadContents();
    }
  };

  const handleDeleteFile = async (file: FileItem) => {
    if (window.confirm(`Are you sure you want to delete "${file.originalName}"?`)) {
      await deleteFileApi(file.id);
      updateUserStorage(-file.size);
      loadContents();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="main-wrapper">
        <Header onSearch={handleSearch} />

        <div className="content-area">
          {/* Toolbar & Breadcrumbs */}
          <div className="toolbar">
            <div className="breadcrumbs">
              <Home size={18} style={{ color: '#3b82f6' }} />
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight size={16} style={{ color: '#64748b' }} />}
                  <span
                    className="breadcrumb-crumb"
                    onClick={() => handleNavigateBreadcrumb(idx)}
                  >
                    {crumb.name}
                  </span>
                </React.Fragment>
              ))}
            </div>

            {activeTab === 'drive' && !searchResults && (
              <div className="action-buttons">
                <button className="btn btn-secondary" onClick={() => setShowCreateFolder(true)}>
                  <FolderPlus size={16} />
                  <span>New Folder</span>
                </button>
                <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                  <Upload size={16} />
                  <span>Upload File</span>
                </button>
              </div>
            )}
          </div>

          {/* Search Results Display Mode */}
          {searchResults ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Search size={20} style={{ color: '#3b82f6' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  Elasticsearch Search Results ({searchResults.length} items found)
                </h3>
                <button className="btn btn-secondary" style={{ marginLeft: 'auto', padding: '4px 10px' }} onClick={() => setSearchResults(null)}>
                  Clear Search
                </button>
              </div>

              <div className="folder-grid">
                {searchResults.map((item) => (
                  <div key={item.id} className="folder-card">
                    <div className="folder-info">
                      {item.itemType === 'FOLDER' ? <Folder size={20} style={{ color: '#f59e0b' }} /> : <FileText size={20} style={{ color: '#3b82f6' }} />}
                      <div>
                        <div className="folder-name">{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          Score: {item.score ? item.score.toFixed(2) : '1.0'} | {item.itemType}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'drive' ? (
            <>
              {/* Folders Section */}
              {folders.length > 0 && (
                <>
                  <div className="section-title">Folders ({folders.length})</div>
                  <div className="folder-grid">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        className="folder-card"
                        onClick={() => handleOpenFolder(folder)}
                      >
                        <div className="folder-info">
                          <Folder size={22} style={{ color: '#f59e0b', flexShrink: 0 }} />
                          <span className="folder-name">{folder.name}</span>
                        </div>
                        <div className="actions-cell">
                          <button
                            className="icon-btn"
                            title="Share Folder"
                            onClick={(e) => { e.stopPropagation(); setShareTarget({ id: folder.id, type: 'FOLDER', name: folder.name }); }}
                          >
                            <Share2 size={16} />
                          </button>
                          <button
                            className="icon-btn"
                            title="Delete Folder"
                            onClick={(e) => handleDeleteFolder(e, folder.id)}
                          >
                            <Trash2 size={16} style={{ color: '#ef4444' }} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Files Section */}
              <div className="section-title">Files ({files.length})</div>
              {files.length === 0 && folders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                  <Folder size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <div>This folder is empty. Upload files or create subfolders to get started!</div>
                </div>
              ) : files.length > 0 && (
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Size</th>
                      <th>Type</th>
                      <th>Last Modified</th>
                      <th style={{ textIndent: '-9999px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => (
                      <tr key={file.id}>
                        <td>
                          <div className="file-cell">
                            <FileText size={18} style={{ color: '#3b82f6', flexShrink: 0 }} />
                            <span style={{ fontWeight: 500 }}>{file.originalName}</span>
                          </div>
                        </td>
                        <td>{formatSize(file.size)}</td>
                        <td>{file.mimeType || 'Unknown'}</td>
                        <td>{new Date(file.updatedAt).toLocaleDateString()}</td>
                        <td>
                          <div className="actions-cell">
                            <button
                              className="icon-btn"
                              title="Download File"
                              onClick={() => downloadFileApi(file.id)}
                            >
                              <Download size={16} style={{ color: '#10b981' }} />
                            </button>
                            <button
                              className="icon-btn"
                              title="Share File"
                              onClick={() => setShareTarget({ id: file.id, type: 'FILE', name: file.originalName })}
                            >
                              <Share2 size={16} />
                            </button>
                            <button
                              className="icon-btn"
                              title="Delete File"
                              onClick={() => handleDeleteFile(file)}
                            >
                              <Trash2 size={16} style={{ color: '#ef4444' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            /* Shared with Me View */
            <div>
              <div className="section-title">Shared With Me</div>
              {sharedItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                  <Share2 size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <div>No files or folders have been shared with you yet.</div>
                </div>
              ) : (
                <div className="folder-grid">
                  {sharedItems.map((share) => (
                    <div key={share.id} className="folder-card">
                      <div className="folder-info">
                        {share.folder ? <Folder size={22} style={{ color: '#f59e0b' }} /> : <FileText size={22} style={{ color: '#3b82f6' }} />}
                        <div>
                          <div className="folder-name">{share.folder ? share.folder.name : share.file?.originalName}</div>
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                            Shared by {share.sharedBy?.firstName || share.sharedBy?.email} ({share.permission})
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateFolder && (
        <CreateFolderModal
          currentFolderId={currentFolder?.id}
          onClose={() => setShowCreateFolder(false)}
          onSuccess={loadContents}
        />
      )}

      {showUpload && (
        <UploadModal
          currentFolderId={currentFolder?.id}
          onClose={() => setShowUpload(false)}
          onSuccess={loadContents}
        />
      )}

      {shareTarget && (
        <ShareModal
          itemId={shareTarget.id}
          itemType={shareTarget.type}
          itemName={shareTarget.name}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
};
