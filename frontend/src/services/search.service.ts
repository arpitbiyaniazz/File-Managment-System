// ============================================
// Search Service Client
// ============================================

import { searchApi } from './api';

export async function searchApiCall(q: string, itemType?: 'FILE' | 'FOLDER') {
  const params: any = { q };
  if (itemType) params.itemType = itemType;
  const res = await searchApi.get('', { params });
  return res.data;
}

export async function suggestApiCall(q: string) {
  const res = await searchApi.get('/suggest', { params: { q } });
  return res.data;
}
