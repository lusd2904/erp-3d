import { request } from './http';
import type { TodoItem, MessageItem, KpiItem } from '@/types/home';

export const homeApi = {
  getTodos() {
    return request<TodoItem[]>({
      url: '/home/todos',
      method: 'GET',
    });
  },

  getMessages() {
    return request<MessageItem[]>({
      url: '/home/messages',
      method: 'GET',
    });
  },

  getKpis() {
    return request<KpiItem[]>({
      url: '/home/kpis',
      method: 'GET',
    });
  },
};
