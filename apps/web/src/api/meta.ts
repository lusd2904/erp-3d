import { request } from './http';
import type { BillMeta } from '@/types/meta';

const metaCache = new Map<string, Promise<BillMeta>>();

export const metaApi = {
  getBillMeta(form: string): Promise<BillMeta> {
    if (metaCache.has(form)) {
      return metaCache.get(form)!;
    }

    const promise = request<BillMeta>({
      url: `/meta/bills/${form}`,
      method: 'GET',
    }).catch((err) => {
      metaCache.delete(form);
      return Promise.reject(err);
    });

    metaCache.set(form, promise);
    return promise;
  },

  clearCache(form?: string) {
    if (form) {
      metaCache.delete(form);
    } else {
      metaCache.clear();
    }
  },
};
