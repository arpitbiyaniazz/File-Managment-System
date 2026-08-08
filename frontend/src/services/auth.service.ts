// ============================================
// Auth Service Client
// ============================================

import { authApi } from './api';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  storageUsed?: number;
  storageLimit?: number;
}

export async function loginApi(email: string, password: string) {
  const res = await authApi.post('/login', { email, password });
  return res.data;
}

export async function registerApi(payload: {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}) {
  const res = await authApi.post('/register', payload);
  return res.data;
}

export async function getMeApi() {
  const res = await authApi.get('/me');
  return res.data;
}
