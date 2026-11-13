export type FieldType = 'text'|'textarea'|'number'|'decimal'|'money'|'date'|'datetime'|'select'|'ref'|'bool'|'status';
export interface FieldOption { value: string; label: string; color?: 'info'|'primary'|'success'|'warning'|'danger' }
export interface FieldMeta {
  key: string; label: string; type: FieldType;
  required?: boolean; readonly?: boolean;      // readonly=元数据层面恒只读（如单据编号、状态）
  options?: FieldOption[];                      // select/status
  ref?: { object: string; displayKey: string }; // ref = F8 基础资料：值存 {id,code,name}，显示 displayKey
  precision?: number; width?: number; span?: 1|2|3|4; // span: 表头网格占几列（4 列栅格）
  defaultValue?: unknown; summary?: boolean;   // summary: 分录/列表合计
}
export interface EntryMeta { key: string; label: string; fields: FieldMeta[]; subEntries?: EntryMeta[] }
export interface ListColumnMeta { key: string; label: string; type: FieldType; width?: number; fixed?: 'left'|'right'; defaultVisible?: boolean; sortable?: boolean; options?: FieldOption[]; summary?: boolean; entryField?: boolean }
export interface OpMeta { code: string; label: string; kind?: 'primary'|'default'|'danger'|'warning'; batch?: boolean; confirm?: string; group?: 'main'|'more' }
export interface ConvertRuleMeta { rule: string; label: string; targetForm: string; targetName: string; qtyField: string; pushedQtyField: string }
export interface BillMeta {
  form: string; name: string; numberKey: string; statusKey: string;
  header: FieldMeta[]; entries: EntryMeta[];
  list: { columns: ListColumnMeta[]; filterFields: FieldMeta[]; quickFilters?: { key: string; label: string; conds: FilterCond[] }[] };
  ops: OpMeta[];             // 全部可能的操作及按钮文字；当前可点哪些看 BillDetail.allowedOps
  convertRules: ConvertRuleMeta[];
}
export type FilterOp = 'eq'|'ne'|'like'|'gt'|'ge'|'lt'|'le'|'in'|'between';
export interface FilterCond { field: string; op: FilterOp; value: unknown }
export interface FilterScheme { id?: string; name: string; shared: boolean; isDefault?: boolean; conds: FilterCond[]; columns?: string[] }
