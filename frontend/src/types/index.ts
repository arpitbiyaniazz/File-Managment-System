// ============================================
// Frontend Types — API Contract Mirror
// ============================================
// These types mirror the backend's shared-types package.
// They define what the frontend expects from API responses.
//
// WHY duplicate types?
// - Frontend and backend are separate projects
// - Frontend types represent the CLIENT's view of the API
// - Backend types include internal details the client shouldn't know
// - In a real production system, these would be generated from
//   an OpenAPI/Swagger spec to stay in sync
// ============================================

// ---- User ----

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: 'admin' | 'user' | 'viewer';
  storageUsed: number;
  storageLimit: number;
  createdAt: string;
}

// ---- File ----

export interface FileItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  extension: string;
  folderId: string | null;
  ownerId: string;
  version: number;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Folder ----

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

// ---- API Response ----

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  requestId: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
  requestId: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
