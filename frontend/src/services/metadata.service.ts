// ============================================
// Metadata Service Client
// ============================================

import { metadataApi } from './api';

export interface FolderItem {
  id: string;
  name: string;
  parentId?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    children: number;
    files: number;
  };
}

export interface FileItem {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  storageKey: string;
  folderId?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export async function getFolderContentsApi(folderId?: string | null) {
  const target = folderId ? `/folders/${folderId}/contents` : '/folders/root/contents';
  const res = await metadataApi.get(target);
  return res.data;
}

export async function createFolderApi(name: string, parentId?: string | null) {
  const res = await metadataApi.post('/folders', { name, parentId: parentId || null });
  return res.data;
}

export async function renameFolderApi(id: string, name: string) {
  const res = await metadataApi.patch(`/folders/${id}`, { name });
  return res.data;
}

export async function moveFolderApi(id: string, parentId?: string | null) {
  const res = await metadataApi.post(`/folders/${id}/move`, { parentId: parentId || null });
  return res.data;
}

export async function deleteFolderApi(id: string) {
  const res = await metadataApi.delete(`/folders/${id}`);
  return res.data;
}

export async function renameFileApi(id: string, originalName: string) {
  const res = await metadataApi.patch(`/files/${id}/rename`, { originalName });
  return res.data;
}

export async function moveFileApi(id: string, folderId?: string | null) {
  const res = await metadataApi.patch(`/files/${id}/move`, { folderId: folderId || null });
  return res.data;
}

export async function shareResourceApi(email: string, permission: 'VIEWER' | 'EDITOR', fileId?: string, folderId?: string) {
  const res = await metadataApi.post('/share', { email, permission, fileId, folderId });
  return res.data;
}

export async function getSharedWithMeApi() {
  const res = await metadataApi.get('/shared-with-me');
  return res.data;
}
