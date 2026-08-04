// ============================================
// Shared Types — File Management System
// ============================================
// These interfaces define the API contract between
// all services. When you change these, ALL services
// must be updated to match.
//
// WHY shared types?
// - Prevents API contract drift between services
// - Compile-time errors when contracts change
// - Single source of truth for data shapes
// ============================================

// ---- User Types ----

export interface IUser {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: UserRole;
  storageUsed: number; // bytes
  storageLimit: number; // bytes
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
}

export interface IUserCreate {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface IUserLogin {
  email: string;
  password: string;
}

// ---- File Types ----

export interface IFile {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number; // bytes
  extension: string;
  path: string; // storage path in MinIO/S3
  folderId: string | null;
  ownerId: string;
  version: number;
  isDeleted: boolean;
  deletedAt?: Date;
  thumbnailUrl?: string;
  checksum: string; // MD5/SHA256 for deduplication
  createdAt: Date;
  updatedAt: Date;
}

export interface IFileUpload {
  name: string;
  folderId?: string;
  file: Buffer;
}

export interface IFileVersion {
  id: string;
  fileId: string;
  version: number;
  size: number;
  path: string;
  checksum: string;
  uploadedBy: string;
  createdAt: Date;
}

// ---- Folder Types ----

export interface IFolder {
  id: string;
  name: string;
  parentId: string | null; // null = root folder
  ownerId: string;
  path: string; // materialized path e.g. "/root/docs/work"
  depth: number;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFolderCreate {
  name: string;
  parentId?: string;
}

// ---- Sharing & Permissions ----

export interface IPermission {
  id: string;
  resourceId: string; // file or folder ID
  resourceType: ResourceType;
  userId: string; // who has access
  grantedBy: string; // who gave access
  accessLevel: AccessLevel;
  createdAt: Date;
  expiresAt?: Date;
}

export enum ResourceType {
  FILE = 'file',
  FOLDER = 'folder',
}

export enum AccessLevel {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  OWNER = 'owner',
}

// ---- API Response Types ----

export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  requestId: string;
}

export interface IApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
  requestId: string;
}

export interface IPaginatedResponse<T> extends IApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ---- Activity Log Types ----

export interface IActivityLog {
  id: string;
  userId: string;
  action: ActivityAction;
  resourceId: string;
  resourceType: ResourceType;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export enum ActivityAction {
  FILE_UPLOAD = 'file.upload',
  FILE_DOWNLOAD = 'file.download',
  FILE_DELETE = 'file.delete',
  FILE_RENAME = 'file.rename',
  FILE_MOVE = 'file.move',
  FILE_COPY = 'file.copy',
  FILE_SHARE = 'file.share',
  FILE_RESTORE = 'file.restore',
  FOLDER_CREATE = 'folder.create',
  FOLDER_DELETE = 'folder.delete',
  FOLDER_RENAME = 'folder.rename',
  FOLDER_MOVE = 'folder.move',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_REGISTER = 'user.register',
}

// ---- Event Types (for Message Queue) ----

export interface IEvent<T = unknown> {
  id: string;
  type: string;
  payload: T;
  timestamp: string;
  source: string; // which service emitted it
}

export interface IFileUploadedEvent {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  ownerId: string;
  storagePath: string;
}

export interface IFileDeletedEvent {
  fileId: string;
  ownerId: string;
  storagePath: string;
}
