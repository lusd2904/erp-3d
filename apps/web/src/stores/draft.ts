import { defineStore } from 'pinia';
import type { BillDraft } from '@/types/bill';

function generateKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useDraftStore = defineStore('draft', () => {
  const draftMap = new Map<string, BillDraft>();

  function put(draft: BillDraft): string {
    const key = generateKey();
    draftMap.set(key, JSON.parse(JSON.stringify(draft)));
    return key;
  }

  function take(key: string): BillDraft | undefined {
    const draft = draftMap.get(key);
    if (draft) {
      draftMap.delete(key);
    }
    return draft;
  }

  function peek(key: string): BillDraft | undefined {
    return draftMap.get(key);
  }

  return {
    put,
    take,
    peek,
  };
});
