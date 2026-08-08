// ============================================
// File Service Client
// ============================================

import { fileApi } from './api';

export async function uploadFileApi(file: File, folderId?: string | null, onProgress?: (percent: number) => void) {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folderId', folderId);

  const res = await fileApi.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
  return res.data;
}

export async function downloadFileApi(fileId: string) {
  const token = localStorage.getItem('token');
  window.open(`http://localhost:3002/api/files/${fileId}/download?token=${token}`, '_blank');
}

export async function deleteFileApi(fileId: string) {
  const res = await fileApi.delete(`/${fileId}`);
  return res.data;
}
