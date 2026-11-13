export interface TodoItem {
  id: number | string;
  title: string;
  form: string;
  billId: number | string;
  billNo: string;
  from: string;
  time: string;
  type: 'approve' | 'notice';
}

export interface MessageItem {
  id: number | string;
  title: string;
  content: string;
  time: string;
  read: boolean;
  level: 'info' | 'warning' | 'urgent';
}

export interface KpiItem {
  key: string;
  label: string;
  value: number | string;
  unit?: string;
  trend?: number;
}
