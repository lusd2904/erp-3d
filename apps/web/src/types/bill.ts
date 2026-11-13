export type Row = Record<string, unknown> & { id?: number; lineNo?: number };
export interface BillHeader extends Record<string, unknown> { id?: number; billNo?: string; status?: string; version?: number }
export interface BillDetail {
  header: BillHeader;
  entries: Record<string, Row[]>;               // key=EntryMeta.key；行内子分录放在 row[subEntryKey]: Row[]
  allowedOps: string[];                          // 当前状态可执行的操作 code
  lockedFields: string[];                        // 'header.<key>' | '<entryKey>.<key>' | '<entryKey>.<subKey>.<key>' | 'header.*' | '<entryKey>.*'
}
export interface BillDraft { header: BillHeader; entries: Record<string, Row[]> }
export interface BillListRow extends Record<string, unknown> { id: number; billNo: string; status: string; entryId?: number }
export interface BillLink { form: string; formName: string; id: number; billNo: string; status: string; date: string; dir: 'up'|'down'; level: number }
export interface FlowHistoryItem { node: string; assignee: string; action: 'submit'|'approve'|'reject'|'withdraw'|'transfer'|'addsign'|'pending'; comment?: string; time?: string }
export interface BillFlow { instanceId?: string; status: 'none'|'running'|'done'|'rejected'; bpmnXml?: string; history: FlowHistoryItem[] }
export interface Attachment { id: number; name: string; size: number; uploader: string; time: string; url: string }
