import { request } from './http';
import type {
  BillDetail,
  BillDraft,
  BillHeader,
  BillLink,
  BillFlow,
  Attachment,
  BillListRow,
  Row,
} from '@/types/bill';
import type { FilterCond, FilterScheme } from '@/types/meta';
import type { BatchResult } from '@shared/errors';

export const billApi = {
  listBills(
    form: string,
    params?: {
      page?: number;
      pageSize?: number;
      schemeId?: string;
      filters?: FilterCond[];
      keyword?: string;
      sort?: string;
    }
  ) {
    return request<{
      rows: BillListRow[];
      total: number;
      page: number;
      pageSize: number;
      summary?: Record<string, number>;
    }>({
      url: `/bills/${form}`,
      method: 'GET',
      params: {
        ...params,
        filters: params?.filters ? JSON.stringify(params.filters) : undefined,
      },
    });
  },

  getBill(form: string, id: number | string) {
    return request<BillDetail>({
      url: `/bills/${form}/${id}`,
      method: 'GET',
    });
  },

  saveBill(form: string, draft: BillDraft, mode: 'draft' | 'save' = 'save') {
    return request<BillDetail>({
      url: `/bills/${form}`,
      method: 'POST',
      params: { mode },
      data: draft,
    });
  },

  updateBill(
    form: string,
    id: number | string,
    data: { version?: number; header: BillHeader; entries: Record<string, Row[]> }
  ) {
    return request<BillDetail>({
      url: `/bills/${form}/${id}`,
      method: 'PUT',
      data,
    });
  },

  execOp(form: string, id: number | string, op: string, version?: number) {
    return request<BillDetail>({
      url: `/bills/${form}/${id}/ops/${op}`,
      method: 'POST',
      data: { version },
    });
  },

  batchOp(form: string, op: string, ids: number[]) {
    return request<BatchResult>({
      url: `/bills/${form}/batch-ops/${op}`,
      method: 'POST',
      data: { ids },
    });
  },

  convert(rule: string, payload: { sourceForm: string; rows: { entryId: number; qty: number }[] }) {
    return request<{ targetForm: string; drafts: BillDraft[] }>({
      url: `/convert/${rule}`,
      method: 'POST',
      data: payload,
    });
  },

  getLinks(form: string, id: number | string, dir: 'up' | 'down') {
    return request<BillLink[]>({
      url: `/bills/${form}/${id}/links`,
      method: 'GET',
      params: { dir },
    });
  },

  getFlow(form: string, id: number | string) {
    return request<BillFlow>({
      url: `/bills/${form}/${id}/flow`,
      method: 'GET',
    });
  },

  listSchemes(form: string) {
    return request<FilterScheme[]>({
      url: `/bills/${form}/filter-schemes`,
      method: 'GET',
    });
  },

  saveScheme(form: string, scheme: FilterScheme) {
    return request<FilterScheme>({
      url: `/bills/${form}/filter-schemes`,
      method: 'POST',
      data: scheme,
    });
  },

  deleteScheme(form: string, id: string) {
    return request<void>({
      url: `/bills/${form}/filter-schemes/${id}`,
      method: 'DELETE',
    });
  },

  listAttachments(form: string, billId: number | string) {
    return request<Attachment[]>({
      url: '/attachments',
      method: 'GET',
      params: { form, billId },
    });
  },

  uploadAttachment(form: string, billId: number | string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('form', form);
    formData.append('billId', String(billId));

    return request<Attachment>({
      url: '/attachments',
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  deleteAttachment(id: number | string) {
    return request<void>({
      url: `/attachments/${id}`,
      method: 'DELETE',
    });
  },
};
